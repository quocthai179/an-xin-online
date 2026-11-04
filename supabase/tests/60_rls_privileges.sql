-- Privileges + RLS: clients never write tables directly, never read hidden tables/columns, anon cannot call write RPCs,
-- every client-callable RPC is security definer with empty search_path, private schema is unreachable.
\set ON_ERROR_STOP 1
begin;
do $$
declare
  c uuid; cu uuid; hr uuid; t text; f text; r text; n int; v jsonb;
  write_rpcs text[] := array[
    'select public.upsert_profile(''Anon Ymous'', ''viewer'')',
    'select public.upsert_my_candidate(''{}''::jsonb)',
    'select public.set_my_candidate_status(''hidden'')',
    'select public.delete_my_candidate()',
    'select public.drop_gift(gen_random_uuid(), ''love'')',
    'select public.send_invitation(gen_random_uuid(), ''xxxxxxxxxxxx'', ''abc'')',
    'select public.respond_invitation(gen_random_uuid(), true)',
    'select public.send_offer(gen_random_uuid(), ''a'', ''b'')',
    'select public.respond_offer(gen_random_uuid(), true)',
    'select public.light_incense()',
    'select public.report_candidate(gen_random_uuid(), ''spam'')',
    'select public.mark_notifications_read()',
    'select public.get_me()',
    'select public.get_fortune()',
    'select public.get_candidate_contact(gen_random_uuid())',
    'select public.my_candidate_id()',
    'select public.admin_moderate(gen_random_uuid(), ''hide'')',
    'select public.admin_list_pending()'];
begin
  c := tests.mk_candidate('Ứng Viên RLS', 'backend'); cu := tests.cand_user(c);
  hr := tests.mk_profile('HR RLS', 'hr', 'Tôm Corp');

  -- ---------- anon: only the 3 public reads ----------
  perform tests.login_anon();
  foreach f in array write_rpcs loop
    begin
      execute f;
      raise exception 'FAIL: anon executed %', f;
    exception when insufficient_privilege then null;
    end;
  end loop;
  perform tests.check(jsonb_typeof(public.get_temple_stats()) = 'object', 'anon get_temple_stats');
  perform tests.check(exists (select 1 from public.list_candidates()), 'anon list_candidates');
  perform tests.check(public.get_candidate(c::text) is not null, 'anon get_candidate');
  perform tests.logout();
  perform tests.pass('anon: write RPCs denied, public reads allowed');

  -- ---------- no direct table access ----------
  foreach r in array array['anon', 'authenticated'] loop
    if r = 'anon' then perform tests.login_anon(); else perform tests.login(cu); end if;
    foreach t in array array['candidates', 'candidate_contacts', 'gifts', 'candidate_daily', 'incense', 'reports'] loop
      begin
        execute format('select count(*) from public.%I', t);
        raise exception 'FAIL: % can select public.%', r, t;
      exception when insufficient_privilege then null;
      end;
    end loop;
    foreach t in array array['profiles', 'candidates', 'candidate_contacts', 'gifts', 'candidate_daily', 'invitations',
                             'offers', 'incense', 'notifications', 'reports'] loop
      begin
        execute format('delete from public.%I', t);
        raise exception 'FAIL: % can delete public.%', r, t;
      exception when insufficient_privilege then null;
      end;
      begin
        execute format('update public.%I set created_at = now()', t);
        raise exception 'FAIL: % can update public.%', r, t;
      exception when insufficient_privilege or undefined_column then null;
      end;
    end loop;
    begin
      insert into public.profiles(id, display_name, role) values (gen_random_uuid(), 'Hacker', 'hr');
      raise exception 'FAIL: % can insert profiles', r;
    exception when insufficient_privilege then null;
    end;
    begin
      insert into public.gifts(giver_id, candidate_id, kind, day) values (cu, c, 'xu', current_date);
      raise exception 'FAIL: % can insert gifts', r;
    exception when insufficient_privilege then null;
    end;
    begin
      insert into public.notifications(user_id, type) values (cu, 'gift');
      raise exception 'FAIL: % can insert notifications', r;
    exception when insufficient_privilege then null;
    end;
    begin
      perform nextval('public.gifts_id_seq');
      raise exception 'FAIL: % can use sequences', r;
    exception when insufficient_privilege then null;
    end;
    -- private schema unreachable
    foreach f in array array['select * from private.secrets', 'select private.cfg()', 'select * from private.rate_hits',
                             'select private.hit(''x'', interval ''1 second'', 1)',
                             'select private.notify(gen_random_uuid(), ''gift'', ''{}'')',
                             'select private.street(''gift'', ''{}'')'] loop
      begin
        execute f;
        raise exception 'FAIL: % executed %', r, f;
      exception when insufficient_privilege then null;
      end;
    end loop;
    perform tests.logout();
  end loop;
  perform tests.pass('no direct table/sequence/private access for anon & authenticated');

  -- anon cannot read even the RLS-protected party tables
  perform tests.login_anon();
  foreach t in array array['profiles', 'invitations', 'offers', 'notifications'] loop
    begin
      execute format('select count(*) from public.%I', t);
      raise exception 'FAIL: anon can select public.%', t;
    exception when insufficient_privilege then null;
    end;
  end loop;
  perform tests.logout();
  -- authenticated reads only own profile row
  perform tests.login(hr);
  perform tests.eq((select count(*) from public.profiles)::int, 1, 'own profile only');
  perform tests.eq((select id from public.profiles), hr, 'own profile id');
  perform tests.eq((select count(*) from public.notifications)::int, 0, 'no foreign notifications');
  perform tests.logout();
  perform tests.pass('RLS row filtering');

  -- ---------- hidden columns never leave via RPCs ----------
  perform tests.login(hr);
  v := public.get_candidate(c::text);
  foreach f in array array['user_id', 'report_count', 'contact', 'zone_changed_at'] loop
    perform tests.check(not (v ? f), 'get_candidate hides ' || f);
  end loop;
  select count(*) into n from public.list_candidates() x where x ? 'user_id' or x ? 'report_count' or x::text like '%me@example.com%';
  perform tests.eq(n, 0, 'list_candidates hides user_id/report_count/contact');
  perform tests.logout();
  perform tests.pass('hidden columns not exposed');

  -- ---------- function hygiene ----------
  select count(*) into n
  from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname = 'public' and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))
    and not (p.prosecdef and coalesce(p.proconfig, '{}') @> array['search_path=""']);
  perform tests.eq(n, 0, 'client-callable functions are security definer with search_path=""');
  select count(*) into n
  from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute');
  perform tests.eq(n, 3, 'anon can execute exactly 3 functions');
  perform tests.check(not has_schema_privilege('authenticated', 'private', 'usage'), 'no usage on private (authenticated)');
  perform tests.check(not has_schema_privilege('anon', 'private', 'usage'), 'no usage on private (anon)');
  select count(*) into n from pg_class cl join pg_namespace ns on ns.oid = cl.relnamespace
  where ns.nspname in ('public', 'private') and cl.relkind = 'r' and not cl.relrowsecurity;
  perform tests.eq(n, 0, 'RLS enabled on every table');
  perform tests.pass('function/schema/RLS hygiene');
end $$;

-- default privileges: a table/function created later by postgres in public must not be auto-granted to clients
create table public.zz_future (id int);
create function public.zz_future_fn() returns int language sql as 'select 1';
do $$
begin
  perform tests.check(not has_table_privilege('anon', 'public.zz_future', 'select'), 'future table not granted to anon');
  perform tests.check(not has_table_privilege('authenticated', 'public.zz_future', 'insert'), 'future table not granted to authenticated');
  perform tests.check(not has_function_privilege('anon', 'public.zz_future_fn()', 'execute'), 'future function not granted to anon');
  perform tests.check(not has_function_privilege('authenticated', 'public.zz_future_fn()', 'execute'), 'future function not granted to authenticated');
  perform tests.pass('default privileges for future objects');
end $$;
rollback;
