-- =====================================================================
-- supabase/tests/01_helpers.sql — test helpers (LOCAL TESTING ONLY), run as `postgres` after the migration.
-- Impersonation mirrors what PostgREST / Realtime do per request:
--   set local role authenticated; set local request.jwt.claims = '{"sub":"<uid>","role":"authenticated"}'
-- =====================================================================
\set ON_ERROR_STOP 1
create schema tests;
grant usage on schema tests to anon, authenticated, service_role;

-- an auth.users row (Supabase anonymous sign-in creates one with is_anonymous = true)
create function tests.new_user(p_anonymous boolean default true) returns uuid language plpgsql as $$
declare v uuid := gen_random_uuid();
begin
  insert into auth.users(id, is_anonymous, aud, role) values (v, p_anonymous, 'authenticated', 'authenticated');
  return v;
end $$;

create function tests.login(p_uid uuid, p_ip text default null) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub', p_uid, 'role', 'authenticated', 'is_anonymous', true, 'aud', 'authenticated')::text, true);
  perform set_config('request.headers',
    case when p_ip is null then '{}' else jsonb_build_object('x-forwarded-for', p_ip || ', 10.0.0.1')::text end, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function tests.login_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.headers', '{}', true);
  perform set_config('role', 'anon', true);
end $$;

create function tests.login_service() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform set_config('role', 'service_role', true);
end $$;

-- back to the migration owner (postgres)
create function tests.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.headers', '', true);
  perform set_config('realtime.topic', '', true);
end $$;

-- ---------- assertions ----------
create function tests.pass(p_label text) returns void language plpgsql as $$
begin raise notice 'PASS: %', p_label; end $$;

create function tests.ok(p jsonb, p_label text) returns jsonb language plpgsql as $$
begin
  if p is null or (p->>'ok')::boolean is distinct from true then
    raise exception 'FAIL: % expected ok, got %', p_label, p;
  end if;
  return p->'data';
end $$;

create function tests.err(p jsonb, p_code text, p_label text, p_field text default null) returns void language plpgsql as $$
begin
  if p is null or (p->>'ok')::boolean is distinct from false or p->>'error' is distinct from p_code
     or (p_field is not null and p->>'field' is distinct from p_field) then
    raise exception 'FAIL: % expected error % (field %), got %', p_label, p_code, p_field, p;
  end if;
end $$;

create function tests.eq(a anycompatible, b anycompatible, p_label text) returns void language plpgsql as $$
begin
  if a is distinct from b then raise exception 'FAIL: % expected [%] got [%]', p_label, b, a; end if;
end $$;

create function tests.check(p_cond boolean, p_label text) returns void language plpgsql as $$
begin
  if p_cond is distinct from true then raise exception 'FAIL: %', p_label; end if;
end $$;

-- ---------- fixtures (call as postgres; they log in/out themselves) ----------
-- security definer so it can be called while impersonating a client
create function tests.reset_rate() returns void language sql security definer set search_path = '' as $$ delete from private.rate_hits $$;

create function tests.mk_profile(p_name text, p_role public.user_role, p_company text default null) returns uuid
language plpgsql as $$
declare v uuid := tests.new_user();
begin
  perform tests.login(v);
  perform tests.ok(public.upsert_profile(p_name, p_role, p_company, '{"skin":1}'::jsonb), 'mk_profile ' || p_name);
  perform tests.logout();
  return v;
end $$;

create function tests.cand_payload(p_zone text default 'backend', p_sign text default 'Cần việc backend gấp') returns jsonb
language sql as $$
  select jsonb_build_object('sign_text', p_sign, 'title', 'Backend dev', 'years_exp', 3,
    'skills', jsonb_build_array('go', 'sql', 'k8s'), 'salary_min', 20, 'salary_max', 30, 'salary_negotiable', false,
    'city', 'Hà Nội', 'work_modes', jsonb_build_array('remote'), 'bio', 'Thích làm API',
    'hide_from_ticker', false, 'show_salary_on_card', false, 'zone', p_zone,
    'contact_kind', 'email', 'contact_value', 'me@example.com')
$$;

-- returns candidates.id; out param user id via tests.cand_user()
create function tests.mk_candidate(p_name text, p_zone text default 'backend') returns uuid language plpgsql as $$
declare v_uid uuid := tests.mk_profile(p_name, 'candidate'); v_d jsonb;
begin
  perform tests.login(v_uid);
  v_d := tests.ok(public.upsert_my_candidate(tests.cand_payload(p_zone)), 'mk_candidate ' || p_name);
  perform tests.logout();
  return (v_d->>'id')::uuid;
end $$;

create function tests.cand_user(p_candidate uuid) returns uuid language sql as $$
  select user_id from public.candidates where id = p_candidate
$$;

create function tests.mk_sample(p_name text, p_zone text default 'backend') returns uuid language sql as $$
  insert into public.candidates(user_id, is_sample, display_name, zone, sign_text, title, years_exp, skills)
  values (null, true, p_name, p_zone, 'Mẫu: cần việc', 'Sample dev', 1, array['js'])
  returning id
$$;

-- ACCESS for impersonated roles
grant execute on all functions in schema tests to anon, authenticated, service_role;
