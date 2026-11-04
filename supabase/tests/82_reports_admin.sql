-- 0002: report brigading (sec M2: aged reporters only, threshold 5), no candidate_upsert for hidden candidates
-- (review M2) from report_candidate / admin_moderate, paginated admin_list_pending, VN-day report bucket.
\set ON_ERROR_STOP 1
begin;
do $$
declare
  c uuid; cu uuid; h uuid; hu uuid; p1 uuid; p2 uuid; p3 uuid; r uuid[] := '{}'; f uuid[] := '{}'; i int; n int; total int;
  a text[]; b text[];
begin
  c := tests.mk_candidate('Bị Báo 0002'); cu := tests.cand_user(c);
  h := tests.mk_candidate('Ẩn Mà Bị Báo', 'qa'); hu := tests.cand_user(h);
  for i in 1..5 loop f := f || tests.mk_profile('Nick Mới ' || i, 'viewer', null, '0'); end loop;
  for i in 1..10 loop r := r || tests.mk_profile('Người Cũ ' || i, 'viewer'); end loop;   -- 2 h old
  delete from realtime.messages;

  -- ---------- fresh accounts are stored but not counted ----------
  for i in 1..5 loop
    perform tests.login(f[i]); perform tests.ok(public.report_candidate(c, 'spam'), 'fresh report ' || i); perform tests.logout();
  end loop;
  perform tests.eq((select report_count from public.candidates where id = c), 0, 'fresh reports not counted');
  perform tests.eq((select count(*) from public.reports where candidate_id = c and not counted)::int, 5, 'stored with counted = false');
  perform tests.eq((select sign_state::text from public.candidates where id = c), 'ok', '5 fresh accounts cannot hide a sign');
  perform tests.login(f[1]); perform tests.err(public.report_candidate(c, 'spam'), 'ALREADY_REPORTED', 'fresh dedupe'); perform tests.logout();
  -- a reporter that ages past 1 h counts for NEW reports
  perform tests.age_profile(f[1], '61 minutes');
  perform tests.login(f[1]); perform tests.ok(public.report_candidate(h, 'spam'), 'aged reporter counts'); perform tests.logout();
  perform tests.eq((select report_count from public.candidates where id = h), 1, 'counted after 1 h');
  perform tests.pass('reports from profiles < 1 h old are not counted');

  -- ---------- threshold 5 aged reporters ----------
  for i in 1..4 loop
    perform tests.login(r[i]); perform tests.ok(public.report_candidate(c, 'other'), 'aged report ' || i); perform tests.logout();
  end loop;
  perform tests.eq((select sign_state::text from public.candidates where id = c), 'ok', 'still ok at 4');
  perform tests.login(r[5]); perform tests.ok(public.report_candidate(c, 'other'), 'aged report 5'); perform tests.logout();
  perform tests.eq((select sign_state::text from public.candidates where id = c), 'pending_review', 'hidden at 5');
  perform tests.check(exists (select 1 from realtime.messages where event = 'candidate_upsert' and payload->'candidate'->>'id' = c::text
                                and payload->'candidate'->'sign_text' = 'null'::jsonb), 'visible candidate: upsert with null sign');
  perform tests.pass('reportsToHideSign = 5');

  -- ---------- hidden candidate: reaching the threshold never re-broadcasts it ----------
  perform tests.login(hu); perform tests.ok(public.set_my_candidate_status('hidden'), 'owner hides'); perform tests.logout();
  delete from realtime.messages;
  for i in 1..4 loop
    perform tests.login(r[i]); perform tests.ok(public.report_candidate(h, 'other'), 'report hidden ' || i); perform tests.logout();
  end loop;
  perform tests.eq((select sign_state::text from public.candidates where id = h), 'pending_review', 'hidden candidate also pending');
  perform tests.check(not exists (select 1 from realtime.messages where event = 'candidate_upsert'), 'no candidate_upsert for hidden');
  perform tests.check(exists (select 1 from realtime.messages where event = 'candidate_remove' and payload->>'id' = h::text), 'candidate_remove instead');
  delete from realtime.messages;
  perform tests.login_service();
  perform tests.ok(public.admin_moderate(h, 'approve_sign'), 'approve hidden');
  perform tests.ok(public.admin_moderate(h, 'remove_sign'), 'remove hidden');
  perform tests.logout();
  perform tests.check(not exists (select 1 from realtime.messages where event = 'candidate_upsert'), 'admin on hidden: no upsert');
  perform tests.eq((select count(*) from realtime.messages where event = 'candidate_remove')::int, 2, 'admin on hidden: remove');
  delete from realtime.messages;
  perform tests.login_service(); perform tests.ok(public.admin_moderate(c, 'approve_sign'), 'approve visible'); perform tests.logout();
  perform tests.check(exists (select 1 from realtime.messages where event = 'candidate_upsert' and payload->'candidate'->>'id' = c::text
                                and payload->'candidate'->>'sign_state' = 'ok'), 'admin on visible: upsert');
  perform tests.pass('hidden candidates are never upserted (review M2)');

  -- ---------- reports per day use the VN-day bucket ----------
  perform tests.check((select bucket = (private.vn_today()::timestamp at time zone 'Asia/Ho_Chi_Minh')
                         from private.rate_hits where key = 'report:' || r[1]), 'report bucket = VN midnight');
  perform tests.pass('report limit on the VN day');

  -- ---------- admin_list_pending pagination ----------
  p1 := tests.mk_candidate('Chờ Một', 'qa'); p2 := tests.mk_candidate('Chờ Hai', 'qa'); p3 := tests.mk_candidate('Chờ Ba', 'qa');
  update public.candidates set sign_state = 'pending_review', updated_at = now() + interval '3 min' where id = p1;
  update public.candidates set sign_state = 'pending_review', updated_at = now() + interval '2 min' where id = p2;
  update public.candidates set sign_state = 'pending_review', updated_at = now() + interval '1 min' where id = p3;
  perform tests.login_service();
  total := (select count(*) from public.admin_list_pending(0, 200));
  perform tests.eq(total, (select count(*)::int from public.candidates where sign_state = 'pending_review'), 'page covers all pending');
  perform tests.eq((select count(*)::int from public.admin_list_pending()), least(total, 50), 'no-arg call still works (default 50)');
  a := array(select x->>'id' from public.admin_list_pending(0, 2) x);
  b := array(select x->>'id' from public.admin_list_pending(2, 2) x);
  perform tests.eq(a, array[p1::text, p2::text], 'page 1 newest first');
  perform tests.eq(b[1], p3::text, 'page 2 continues');
  perform tests.check(not (a && b), 'pages do not overlap');
  perform tests.eq((select count(*)::int from public.admin_list_pending(0, 0)), 1, 'limit clamps to >= 1');
  perform tests.eq((select count(*)::int from public.admin_list_pending(-5, 1)), 1, 'negative offset clamps to 0');
  perform tests.eq((select x->>'id' from public.admin_list_pending(-5, 1) x), p1::text, 'negative offset = first page');
  perform tests.check((select bool_and(x ? 'raw_sign' and x ? 'report_count' and x ? 'banned') from public.admin_list_pending(0, 3) x), 'admin fields');
  perform tests.logout();
  perform tests.login(cu);
  begin
    perform public.admin_list_pending(0, 10);
    raise exception 'FAIL: authenticated could call admin_list_pending(int,int)';
  exception when insufficient_privilege then null;
  end;
  perform tests.logout();
  perform tests.check(not exists (select 1 from pg_proc where proname = 'admin_list_pending' and pronargs = 0), 'old no-arg overload dropped');
  perform tests.pass('admin_list_pending pagination');
end $$;
rollback;
