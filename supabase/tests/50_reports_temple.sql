-- Reports auto-hide (US-20), incense (US-17), fortune (BR-Quẻ), notifications, admin moderation.
\set ON_ERROR_STOP 1
begin;
do $$
declare
  c uuid; cu uuid; r uuid[] := '{}'; i int; v jsonb; v2 jsonb; u uuid; u2 uuid; s uuid; n int;
begin
  c := tests.mk_candidate('Ứng Viên Bị Báo', 'design'); cu := tests.cand_user(c);
  for i in 1..4 loop r := r || tests.mk_profile('Người Báo ' || i, 'viewer'); end loop;
  delete from realtime.messages;

  -- ---------- reports ----------
  perform tests.login(cu);
  perform tests.err(public.report_candidate(c, 'spam'), 'SELF_ACTION', 'self report');
  perform tests.logout();
  perform tests.login(tests.new_user());
  perform tests.err(public.report_candidate(c, 'spam'), 'NO_PROFILE', 'report without profile');
  perform tests.logout();
  perform tests.login(r[1]);
  perform tests.err(public.report_candidate(gen_random_uuid(), 'spam'), 'NOT_FOUND', 'unknown');
  perform tests.err(public.report_candidate(c, 'boring'), 'VALIDATION', 'bad reason', 'reason');
  perform tests.err(public.report_candidate(c, null), 'VALIDATION', 'null reason', 'reason');
  perform tests.ok(public.report_candidate(c, 'spam', 'quảng cáo'), 'report 1');
  perform tests.err(public.report_candidate(c, 'obscene'), 'ALREADY_REPORTED', 'same reporter twice');
  perform tests.eq((public.get_candidate(c::text)->'me'->>'reported')::boolean, true, 'me.reported');
  perform tests.logout();
  perform tests.eq((select report_count from public.candidates where id = c), 1, 'duplicate report not counted');
  perform tests.login(r[2]); perform tests.ok(public.report_candidate(c, 'harassment'), 'report 2'); perform tests.logout();
  perform tests.eq((select sign_state::text from public.candidates where id = c), 'ok', 'still visible at 2');
  perform tests.login(r[3]); perform tests.ok(public.report_candidate(c, 'other'), 'report 3'); perform tests.logout();
  perform tests.eq((select sign_state::text from public.candidates where id = c), 'pending_review', 'auto-hide at 3 distinct reporters');
  perform tests.check(exists (select 1 from realtime.messages where topic = 'inbox:' || cu::text and payload->>'type' = 'sign_hidden'),
                      'owner notified sign_hidden');
  perform tests.check(exists (select 1 from realtime.messages where topic = 'street' and event = 'candidate_upsert'
                               and payload->'candidate'->>'id' = c::text and payload->'candidate'->'sign_text' = 'null'::jsonb),
                      'street upsert with hidden sign');
  perform tests.login(r[4]); perform tests.ok(public.report_candidate(c, 'other'), 'report 4'); perform tests.logout();
  perform tests.eq((select count(*) from realtime.messages where topic = 'inbox:' || cu::text and payload->>'type' = 'sign_hidden')::int, 1,
                   'sign_hidden only once');
  perform tests.login_anon();
  v := public.get_candidate(c::text);
  perform tests.eq(v->'sign_text', 'null'::jsonb, 'public read hides pending sign');
  perform tests.eq(v->>'sign_state', 'pending_review', 'sign_state exposed');
  perform tests.logout();
  -- edits do not lift the review
  perform tests.reset_rate();
  perform tests.login(cu);
  perform tests.ok(public.upsert_my_candidate(tests.cand_payload('design', 'Biển mới sạch sẽ')), 'edit after hide');
  perform tests.logout();
  perform tests.eq((select sign_state::text from public.candidates where id = c), 'pending_review', 'edit keeps pending_review');
  perform tests.pass('reports: dedupe + auto-hide at 3');

  -- reports per day (20)
  perform tests.reset_rate();
  u := tests.mk_profile('Báo Cáo Viên', 'viewer');
  for i in 1..21 loop
    declare cc uuid := tests.mk_sample('Mẫu ' || i);
    begin
      perform tests.login(u);
      v := public.report_candidate(cc, 'spam');
      perform tests.logout();
      if i <= 20 then perform tests.ok(v, 'report ' || i); else perform tests.err(v, 'RATE_LIMITED', 'report 21'); end if;
    end;
  end loop;
  perform tests.pass('reportsPerDay');

  -- admin moderation: service_role only
  perform tests.login(cu);
  begin
    perform public.admin_moderate(c, 'approve_sign');
    raise exception 'FAIL: authenticated could call admin_moderate';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_list_pending();
    raise exception 'FAIL: authenticated could call admin_list_pending';
  exception when insufficient_privilege then null;
  end;
  perform tests.logout();
  perform tests.login_service();
  perform tests.check(exists (select 1 from public.admin_list_pending() x where x->>'id' = c::text and x->>'raw_sign' is not null), 'admin sees pending');
  perform tests.ok(public.admin_moderate(c, 'approve_sign'), 'approve');
  perform tests.err(public.admin_moderate(c, 'nuke'), 'VALIDATION', 'bad action', 'action');
  perform tests.err(public.admin_moderate(gen_random_uuid(), 'hide'), 'NOT_FOUND', 'unknown');
  perform tests.logout();
  perform tests.eq((select sign_state::text || report_count from public.candidates where id = c), 'ok0', 'approved resets');
  perform tests.pass('admin moderation');

  -- ---------- incense ----------
  u := tests.mk_profile('Người Thắp Nhang', 'viewer');
  u2 := tests.mk_profile('Người Thắp Hai', 'hr', 'Nhang Corp');
  perform tests.login(tests.new_user());
  perform tests.err(public.light_incense(), 'NO_PROFILE', 'incense no profile');
  perform tests.logout();
  perform tests.login(u);
  perform tests.err(public.light_incense(gen_random_uuid()), 'NOT_FOUND', 'unknown target');
  v := tests.ok(public.light_incense(c), 'incense for c');
  perform tests.eq((v->>'incense_today')::int, 1, 'incense_today');
  perform tests.err(public.light_incense(), 'ALREADY_DONE', 'incense twice (AC-17.2)');
  perform tests.eq((public.get_me()->'quota'->>'incense_done')::boolean, true, 'quota.incense_done');
  perform tests.logout();
  perform tests.login(u2);
  perform tests.ok(public.light_incense(), 'incense without target');
  perform tests.logout();
  perform tests.login_anon();
  perform tests.eq((public.get_temple_stats()->>'incense_today')::int, 2, 'temple stats for anon');
  perform tests.logout();
  perform tests.eq((select incense_total from public.candidates where id = c), 1, 'incense_total cosmetic');
  perform tests.check(exists (select 1 from realtime.messages where topic = 'inbox:' || cu::text and payload->>'type' = 'incense_for_you'
                               and payload->'payload' = '{}'::jsonb), 'anonymous incense notification');
  perform tests.eq((select count(*) from realtime.messages where topic = 'street' and event = 'incense')::int, 2, 'street incense events');
  perform tests.pass('incense once per day');

  -- ---------- fortune ----------
  perform tests.login(u);
  v := tests.ok(public.get_fortune(), 'fortune');
  v2 := tests.ok(public.get_fortune(), 'fortune again');
  perform tests.eq(v, v2, 'same user + day -> same draw (BR-Q2)');
  perform tests.check((v->>'roll')::int between 0 and 99, 'roll 0..99');
  perform tests.check((v->>'pick')::bigint between 0 and 4294967295, 'pick uint32');
  perform tests.logout();
  perform tests.eq(v->>'day', private.vn_today()::text, 'fortune day');
  -- deterministic formula: hash(uid|day|salt)
  perform tests.eq((v->>'roll')::int,
    (('x' || lpad(substr(md5(u::text || '|' || private.vn_today()::text || '|' ||
      (select value from private.secrets where name = 'fortune_salt') || '|tier'), 1, 8), 16, '0'))::bit(64)::bigint % 100)::int,
    'roll formula');
  -- different users -> spread of rolls (100 users, expect > 30 distinct values)
  select count(distinct (('x' || lpad(substr(md5(x::text || '|' || private.vn_today()::text || '|' ||
      (select value from private.secrets where name = 'fortune_salt') || '|tier'), 1, 8), 16, '0'))::bit(64)::bigint % 100))
    into n from (select gen_random_uuid() x from generate_series(1, 100)) t;
  perform tests.check(n > 30, 'fortune rolls vary across users');
  perform tests.login_anon();
  begin
    perform public.get_fortune();
    raise exception 'FAIL: anon could call get_fortune';
  exception when insufficient_privilege then null;
  end;
  perform tests.logout();
  perform tests.pass('fortune deterministic per user/day');

  -- ---------- notifications ----------
  perform tests.login(cu);
  n := (select count(*) from public.notifications where read_at is null);
  perform tests.check(n >= 2, 'unread notifications exist');
  perform tests.eq((public.get_me()->>'unread')::int, n, 'get_me unread');
  perform tests.ok(public.mark_notifications_read(array[(select min(id) from public.notifications)]), 'mark one');
  perform tests.eq((select count(*) from public.notifications where read_at is null)::int, n - 1, 'one marked');
  perform tests.ok(public.mark_notifications_read(), 'mark all');
  perform tests.eq((select count(*) from public.notifications where read_at is null)::int, 0, 'all marked');
  perform tests.logout();
  perform tests.login(u);
  perform tests.eq((select count(*) from public.notifications where user_id = cu)::int, 0, 'cannot read others notifications');
  perform tests.logout();
  perform tests.pass('notifications');
end $$;
rollback;
