-- Profiles (US-1): HR / candidate / viewer (guest) creation, validation, moderation, name cooldown, BR-SP3 IP limit.
\set ON_ERROR_STOP 1
begin;
do $$
declare u uuid; v jsonb; c uuid; i int;
begin
  -- no JWT -> UNAUTHENTICATED (authenticated role without sub)
  perform set_config('role', 'authenticated', true);
  perform tests.err(public.upsert_profile('Ai đó', 'viewer'), 'UNAUTHENTICATED', 'no sub');
  perform tests.logout();
  perform tests.pass('upsert_profile without sub -> UNAUTHENTICATED');

  -- viewer (guest)
  u := tests.new_user(); perform tests.login(u);
  v := tests.ok(public.upsert_profile('  Khách   Qua  Đường ', 'viewer', 'Ignored Co'), 'viewer');
  perform tests.eq(v->>'display_name', 'Khách Qua Đường', 'name cleaned/collapsed');
  perform tests.eq(v->>'company', null::text, 'company dropped for non-HR');
  perform tests.eq(v->>'role', 'viewer', 'role viewer');
  perform tests.eq((select count(*) from public.profiles)::int, 1, 'own profile readable via RLS');
  perform tests.logout();
  perform tests.pass('viewer profile');

  -- HR requires company
  u := tests.new_user(); perform tests.login(u);
  perform tests.err(public.upsert_profile('Chị HR', 'hr'), 'VALIDATION', 'hr no company', 'company');
  perform tests.err(public.upsert_profile('Chị HR', 'hr', 'X'), 'VALIDATION', 'hr short company', 'company');
  perform tests.err(public.upsert_profile('Chị HR', 'hr', 'Công ty đa cấp'), 'BLOCKED_CONTENT', 'hr blocked company', 'company');
  v := tests.ok(public.upsert_profile('Chị HR', 'hr', 'Tôm Corp'), 'hr ok');
  perform tests.eq(v->>'company', 'Tôm Corp', 'hr company');
  perform tests.logout();
  perform tests.pass('hr profile + company validation/moderation');

  -- candidate + name validation / moderation
  u := tests.new_user(); perform tests.login(u);
  perform tests.err(public.upsert_profile('A', 'candidate'), 'VALIDATION', 'short name', 'display_name');
  perform tests.err(public.upsert_profile(repeat('a', 25), 'candidate'), 'VALIDATION', 'long name', 'display_name');
  perform tests.err(public.upsert_profile('d.m may', 'candidate'), 'BLOCKED_CONTENT', 'blocked name', 'display_name');
  perform tests.err(public.upsert_profile(null, 'candidate'), 'VALIDATION', 'null name', 'display_name');
  perform tests.err(public.upsert_profile('Bạn Tốt', 'candidate', null, null), 'VALIDATION', 'null avatar', 'avatar');
  perform tests.err(public.upsert_profile('Bạn Tốt', 'candidate', null,
    jsonb_build_object('x', repeat('z', 1100))), 'VALIDATION', 'big avatar', 'avatar');
  perform tests.err(public.upsert_profile('Bạn Tốt', null), 'VALIDATION', 'null role', 'role');
  v := tests.ok(public.upsert_profile('Bạn Tốt', 'candidate'), 'candidate ok');
  perform tests.eq(v->>'name_changed_at', null::text, 'first insert: name_changed_at null');
  -- first rename is free, second within 24h is blocked
  v := tests.ok(public.upsert_profile('Bạn Tốt Hơn', 'candidate'), 'first rename');
  perform tests.check(v->>'name_changed_at' is not null, 'name_changed_at set');
  perform tests.err(public.upsert_profile('Bạn Tốt Nhất', 'candidate'), 'NAME_CHANGE_COOLDOWN', 'second rename', 'display_name');
  -- same name, other fields -> fine
  perform tests.ok(public.upsert_profile('Bạn Tốt Hơn', 'candidate', null, '{"skin":2}'), 'same name avatar change');
  perform tests.logout();
  update public.profiles set name_changed_at = now() - interval '25 hours' where id = u;
  perform tests.login(u);
  perform tests.ok(public.upsert_profile('Bạn Tốt Nhất', 'candidate'), 'rename after 24h');
  perform tests.logout();
  perform tests.pass('candidate profile + name rules');

  -- profile requires an auth.users row (FK) -> a JWT for a deleted user cannot create a profile
  perform tests.login(gen_random_uuid());
  begin
    perform public.upsert_profile('Ma Quỷ', 'viewer');
    raise exception 'FAIL: profile without auth.users row accepted';
  exception when foreign_key_violation then null;
  end;
  perform tests.logout();
  perform tests.pass('profile FK to auth.users');

  -- role switch candidate -> viewer hides the sitting candidate (A3) and emits candidate_remove
  c := tests.mk_candidate('Người Đổi Vai');
  u := tests.cand_user(c);
  perform tests.login(u);
  perform tests.ok(public.upsert_profile('Người Đổi Vai', 'viewer'), 'role switch');
  perform tests.logout();
  perform tests.eq((select status::text from public.candidates where id = c), 'hidden', 'role switch hides candidate');
  perform tests.check(exists (select 1 from realtime.messages where topic = 'street' and event = 'candidate_remove'
                               and payload->>'id' = c::text), 'candidate_remove emitted');
  perform tests.pass('role switch hides candidate');

  -- BR-SP3: <= 3 new HR profiles per IP per hour
  perform tests.reset_rate();
  for i in 1..3 loop
    u := tests.new_user(); perform tests.login(u, '203.0.113.7');
    perform tests.ok(public.upsert_profile('HR số ' || i, 'hr', 'Cty ' || i), 'hr ip ' || i);
    perform tests.logout();
  end loop;
  u := tests.new_user(); perform tests.login(u, '203.0.113.7');
  perform tests.err(public.upsert_profile('HR số 4', 'hr', 'Cty 4'), 'IP_LIMIT', 'hr ip 4');
  perform tests.ok(public.upsert_profile('Khách số 4', 'viewer'), 'viewer from same ip still fine');
  perform tests.logout();
  u := tests.new_user(); perform tests.login(u, '198.51.100.1');
  perform tests.ok(public.upsert_profile('HR khác IP', 'hr', 'Cty 5'), 'other ip');
  perform tests.logout();
  perform tests.check(not exists (select 1 from private.rate_hits where key like '%203.0.113.7%'), 'raw IP never stored');
  perform tests.pass('BR-SP3 HR signups per IP');

  -- get_me shape
  u := tests.mk_profile('Me Tester', 'hr', 'Tôm Corp');
  perform tests.login(u);
  v := public.get_me();
  perform tests.eq(v->'profile'->>'role', 'hr', 'get_me profile');
  perform tests.eq(v->'candidate', 'null'::jsonb, 'get_me candidate null');
  perform tests.eq((v->'quota'->>'xu_used')::int, 0, 'get_me quota');
  perform tests.eq((v->>'unread')::int, 0, 'get_me unread');
  perform tests.logout();
  perform tests.login(tests.new_user());
  perform tests.eq(public.get_me(), null::jsonb, 'get_me without profile is null');
  perform tests.logout();
  perform tests.pass('get_me');
end $$;
rollback;
