#!/usr/bin/env bash
# supabase/tests/run.sh — run the SQL migration + SQL tests against a THROWAWAY local PostgreSQL cluster.
#   initdb temp cluster -> Supabase stub -> migrations -> second fresh DB (re-provision check) -> tests -> concurrency -> teardown
# Never touches a real/shared database. Needs PostgreSQL 15+ server binaries (initdb/pg_ctl/psql); no Docker.
#
# Env:
#   PGBIN       server binaries dir (default: newest /usr/lib/postgresql/*/bin, else dirname of `which initdb`)
#   PXV_DB_PORT port for the temp cluster (default: first free port from 54329)
#   PXV_DB_TMP  parent dir for the temp cluster (default: ${TMPDIR:-/tmp})
#   KEEP=1      keep the cluster running after the run (prints connection info)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"

if [[ -z "${PGBIN:-}" ]]; then
  PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -n1 || true)"
  [[ -z "$PGBIN" ]] && PGBIN="$(dirname "$(command -v initdb || echo /nonexistent/initdb)")"
fi
[[ -x "$PGBIN/initdb" ]] || { echo "initdb not found (set PGBIN)"; exit 2; }
PSQL="$PGBIN/psql"; [[ -x "$PSQL" ]] || PSQL="$(command -v psql)"

PORT="${PXV_DB_PORT:-54329}"
if [[ -z "${PXV_DB_PORT:-}" ]]; then
  while (exec 3<>/dev/tcp/127.0.0.1/"$PORT") 2>/dev/null; do PORT=$((PORT + 1)); done
fi

WORK="$(mktemp -d "${PXV_DB_TMP:-${TMPDIR:-/tmp}}/pxv-db.XXXXXX")"
DATA="$WORK/data"; LOG="$WORK/server.log"; OUT="$WORK/out"; mkdir -p "$OUT"

# PostgreSQL refuses to run as root: drop to the `postgres` OS user (keeping CAP_DAC_READ_SEARCH so private temp
# parents such as sandbox scratch dirs stay traversable).
as_pg() {
  if [[ "$(id -u)" -eq 0 ]]; then
    if command -v setpriv >/dev/null; then
      setpriv --reuid=postgres --regid=postgres --init-groups \
        --inh-caps=+dac_read_search --ambient-caps=+dac_read_search "$@"
    else
      runuser -u postgres -- "$@"
    fi
  else
    "$@"
  fi
}
[[ "$(id -u)" -eq 0 ]] && chown postgres "$WORK"

cleanup() {
  local rc=$?
  if [[ "${KEEP:-0}" == "1" ]]; then
    echo "KEEP=1: cluster left running: psql -h 127.0.0.1 -p $PORT -U postgres -d postgres   (stop: $PGBIN/pg_ctl -D $DATA stop)"
  else
    as_pg "$PGBIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true
    rm -rf "$WORK"
  fi
  exit $rc
}
trap cleanup EXIT

echo "== initdb ($PGBIN, port $PORT)"
as_pg "$PGBIN/initdb" -D "$DATA" -U supabase_admin --auth=trust -E UTF8 --locale=C.UTF-8 >"$WORK/initdb.log" 2>&1 \
  || { cat "$WORK/initdb.log"; exit 1; }
as_pg "$PGBIN/pg_ctl" -D "$DATA" -l "$LOG" -w \
  -o "-p $PORT -k '' -c listen_addresses=127.0.0.1 -c wal_level=logical -c timezone=UTC -c max_connections=50" start >/dev/null

# TCP on loopback only (unix socket paths under deep temp dirs can exceed the 107-byte limit); trust auth, local only
q() { "$PSQL" -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$PORT" "$@"; }

provision() {  # $1 = database name
  local db="$1"
  if [[ "$db" != "postgres" ]]; then q -U supabase_admin -d postgres -c "create database $db"; fi
  q -U supabase_admin -d "$db" -v DBNAME="$db" -f "$HERE/00_supabase_stub.sql" >"$OUT/stub-$db.log" 2>&1 \
    || { cat "$OUT/stub-$db.log"; return 1; }
  for m in "$ROOT"/supabase/migrations/*.sql; do
    # migrations run as `postgres` (not superuser), like `supabase db push`
    q -U postgres -d "$db" -f "$m" >"$OUT/migrate-$db.log" 2>&1 || { cat "$OUT/migrate-$db.log"; return 1; }
  done
  if grep -E 'ERROR|WARNING' "$OUT/migrate-$db.log"; then echo "migration produced warnings/errors"; return 1; fi
  echo "   migrated $db: $(ls "$ROOT"/supabase/migrations/*.sql | wc -l) file(s) OK"
}

echo "== provision + migrate"
provision postgres
provision fresh_again          # re-running the migration on another fresh DB (roles already exist) must be clean

# locale guard: a database with LC_CTYPE=C must make the migration fail (moderation would be bypassable there)
q -U supabase_admin -d postgres -c "create database ctype_c template template0 locale 'C' encoding 'UTF8'"
q -U supabase_admin -d ctype_c -v DBNAME=ctype_c -f "$HERE/00_supabase_stub.sql" >/dev/null 2>&1
if q -U postgres -d ctype_c -f "$ROOT/supabase/migrations/0001_init.sql" >"$OUT/migrate-ctype_c.log" 2>&1; then
  echo "   FAIL: migration accepted a LC_CTYPE=C database"; exit 1
fi
grep -q 'cannot lowercase/classify Vietnamese' "$OUT/migrate-ctype_c.log" || { cat "$OUT/migrate-ctype_c.log"; exit 1; }
echo "   locale guard: LC_CTYPE=C database rejected as expected"

echo "== tests"
q -U postgres -d postgres -f "$HERE/01_helpers.sql" >/dev/null
pass=0; failed=0
for t in "$HERE"/[1-9][0-9]_*.sql; do
  name="$(basename "$t")"
  if q -U postgres -d postgres -f "$t" >"$OUT/$name.log" 2>&1 && ! grep -q 'ErrorSendingBroadcastMessage' "$OUT/$name.log"; then
    n=$(grep -c 'PASS:' "$OUT/$name.log" || true); pass=$((pass + n))
    printf '   ok   %-28s %3d checks\n' "$name" "$n"
  else
    failed=$((failed + 1))
    printf '   FAIL %s\n' "$name"; grep -E 'ERROR|FAIL|WARNING|CONTEXT' "$OUT/$name.log" | head -n 20 | sed 's/^/        /'
  fi
done

echo "== concurrency"
if PSQL="$PSQL" PGHOST=127.0.0.1 PGPORT="$PORT" PGUSER=postgres PGDATABASE=postgres bash "$HERE/concurrency.sh" >"$OUT/concurrency.log" 2>&1; then
  n=$(grep -c 'PASS:' "$OUT/concurrency.log" || true); pass=$((pass + n))
  printf '   ok   %-28s %3d checks\n' "concurrency.sh" "$n"
else
  failed=$((failed + 1)); echo "   FAIL concurrency.sh"; tail -n 20 "$OUT/concurrency.log" | sed 's/^/        /'
fi

echo "== result: $pass passed check groups, $failed failed file(s)"
[[ $failed -eq 0 ]]
