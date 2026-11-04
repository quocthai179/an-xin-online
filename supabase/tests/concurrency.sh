#!/usr/bin/env bash
# Concurrency sanity (BR-C5): parallel sessions for the same giver dropping coins must never exceed quotas
# (pg_advisory_xact_lock per giver inside public.drop_gift). Each call is its own transaction, like a PostgREST request.
# Uses committed fixtures and removes them afterwards. Called by run.sh with PGHOST/PGPORT/PGUSER/PGDATABASE set.
set -euo pipefail
PSQL="${PSQL:-psql}"
TMPD="$(mktemp -d "${TMPDIR:-/tmp}/pxv-conc.XXXXXX")"
trap 'rm -rf "$TMPD"' EXIT
q() { "$PSQL" -X -q -v ON_ERROR_STOP=1 -At "$@"; }

read -r HR HR2 CANDS < <(q <<'SQL'
do $$ begin perform tests.reset_rate(); end $$;
select tests.mk_profile('HR Song Song', 'hr', 'Race Corp') || ' ' || tests.mk_profile('Khách Nhanh', 'viewer') || ' ' ||
       (select string_agg(tests.mk_candidate('Đua ' || i, 'backend')::text, ',' order by i) from generate_series(1, 6) i);
SQL
)
IFS=',' read -r -a C <<<"$CANDS"
q -c "delete from private.rate_hits"

call() {  # $1 uid  $2 candidate  $3 kind
  q <<SQL
begin;
do \$\$ begin perform tests.login('$1'); end \$\$;
select coalesce(public.drop_gift('$2', '$3')->>'error', 'OK');
commit;
SQL
}

wave() {  # $1 label, $2 uid, $3 kind, rest: candidates (one parallel client each)
  local label="$1" uid="$2" kind="$3"; shift 3
  local pids=() i=0
  for cand in "$@"; do call "$uid" "$cand" "$kind" >"$TMPD/$label-$i.out" 2>&1 & pids+=($!); i=$((i + 1)); done
  for p in "${pids[@]}"; do wait "$p" || { cat "$TMPD/$label"-*.out; exit 1; }; done
  echo "   $label: $(cat "$TMPD/$label"-*.out | sort | uniq -c | tr -s ' ' | tr '\n' ';')"
}

# Wave 1: 8 parallel xu on the SAME candidate -> exactly 2 accepted (BR-C2)
wave w1 "$HR" xu "${C[0]}" "${C[0]}" "${C[0]}" "${C[0]}" "${C[0]}" "${C[0]}" "${C[0]}" "${C[0]}"
pair0=$(q -c "select count(*) from public.gifts where giver_id = '$HR' and candidate_id = '${C[0]}'")
[[ "$pair0" -eq 2 ]] || { echo "FAIL: expected 2 xu on candidate 1, got $pair0"; exit 1; }
echo "PASS: 8 parallel xu on one candidate -> exactly 2 accepted"

# Waves 2..7 (1.1 s apart so the 5 ops/s limiter lets work through): 8 parallel xu spread over candidates 2..6
for wv in 2 3 4 5 6 7; do
  sleep 1.1
  args=(); for k in 0 1 2 3 4 5 6 7; do args+=("${C[$((1 + (k + wv) % 5))]}"); done
  wave "w$wv" "$HR" xu "${args[@]}"
done
total=$(q -c "select count(*) from public.gifts where giver_id = '$HR' and kind = 'xu'")
maxpair=$(q -c "select max(n) from (select count(*) n from public.gifts where giver_id = '$HR' group by candidate_id) t")
dailysum=$(q -c "select coalesce(sum(d.xu), 0) from public.candidate_daily d where d.candidate_id = any('{$CANDS}'::uuid[])")
totals=$(q -c "select coalesce(sum(xu_total), 0) from public.candidates where id = any('{$CANDS}'::uuid[])")
echo "   gifts=$total max_per_candidate=$maxpair candidate_daily_sum=$dailysum xu_total_sum=$totals"
[[ "$total" -eq 10 ]] || { echo "FAIL: expected exactly 10 xu for the day, got $total"; exit 1; }
[[ "$maxpair" -le 2 ]] || { echo "FAIL: per-candidate limit exceeded ($maxpair)"; exit 1; }
[[ "$dailysum" -eq 10 && "$totals" -eq 10 ]] || { echo "FAIL: counters drifted (daily=$dailysum totals=$totals)"; exit 1; }
echo "PASS: parallel xu waves -> exactly 10/day, <= 2/candidate, counters consistent"

# Love: 12 parallel calls from one viewer in the same second -> <= 5 accepted (5/day and 5 ops/s), <= 1 per candidate
q -c "delete from private.rate_hits"
args=(); for k in $(seq 0 11); do args+=("${C[$((k % 6))]}"); done
wave love "$HR2" love "${args[@]}"
loves=$(q -c "select count(*) from public.gifts where giver_id = '$HR2'")
lpair=$(q -c "select coalesce(max(n), 0) from (select count(*) n from public.gifts where giver_id = '$HR2' group by candidate_id) t")
[[ "$loves" -ge 1 && "$loves" -le 5 && "$lpair" -le 1 ]] || { echo "FAIL: love limits violated (total=$loves pair=$lpair)"; exit 1; }
echo "PASS: 12 parallel love -> $loves accepted (<= 5), <= 1 per candidate"

# cleanup committed fixtures
q <<SQL >/dev/null
delete from auth.users where id in (select id from public.profiles
  where display_name in ('HR Song Song', 'Khách Nhanh') or display_name like 'Đua %');
delete from private.rate_hits;
delete from realtime.messages;
SQL
left=$(q -c "select count(*) from public.profiles")
[[ "$left" -eq 0 ]] || { echo "FAIL: fixtures left behind ($left profiles)"; exit 1; }
