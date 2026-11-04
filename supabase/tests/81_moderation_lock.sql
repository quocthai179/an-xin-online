-- 0002 (sec M1): moderation lock, tombstones on delete + recreate, daily re-create cap, bans.
\set ON_ERROR_STOP 1
begin;
do $$
declare
  c uuid; cu uuid; c2 uuid; c2u uuid; c3 uuid; c3u uuid; c4 uuid; c4u uuid; c5 uuid; c5u uuid; u uuid; b uuid; bu uuid; h uuid;
  s uuid; v jsonb; i int; new_id uuid; msg text := 'Chào bạn, mời bạn phỏng vấn nhé';
begin
  c := tests.mk_candidate('Bị Ẩn'); cu := tests.cand_user(c);
  c2 := tests.mk_candidate('Bị Gỡ Biển'); c2u := tests.cand_user(c2);
  c3 := tests.mk_candidate('Chờ Duyệt', 'qa'); c3u := tests.cand_user(c3);
  c4 := tests.mk_candidate('Ẩn Rồi Xóa', 'qa'); c4u := tests.cand_user(c4);
  c5 := tests.mk_candidate('Admin Xóa', 'qa'); c5u := tests.cand_user(c5);
  s := tests.mk_sample('Mẫu Ban');
  delete from realtime.messages;

  -- ---------- admin hide locks the owner out ----------
  perform tests.login_service(); perform tests.ok(public.admin_moderate(c, 'hide'), 'admin hide'); perform tests.logout();
  perform tests.check((select status = 'hidden' and mod_hidden_at is not null from public.candidates where id = c), 'hidden + locked');
  perform tests.check(exists (select 1 from realtime.messages where event = 'candidate_remove' and payload->>'id' = c::text), 'hide -> remove');
  perform tests.login(cu);
  perform tests.err(public.set_my_candidate_status('sitting'), 'MODERATION_LOCKED', 'owner cannot sit again');
  perform tests.ok(public.set_my_candidate_status('hidden'), 'hiding is always allowed');
  perform tests.ok(public.upsert_my_candidate(tests.cand_payload('backend', 'Biển mới tinh tươm')), 'edit allowed');
  perform tests.ok(public.upsert_profile('Bị Ẩn', 'viewer'), 'role switch away');
  perform tests.ok(public.upsert_profile('Bị Ẩn', 'candidate'), 'role switch back');
  perform tests.err(public.set_my_candidate_status('sitting'), 'MODERATION_LOCKED', 'still locked after edits / role switch');
  perform tests.logout();
  perform tests.eq((select status::text from public.candidates where id = c), 'hidden', 'still hidden');
  perform tests.login_service(); perform tests.ok(public.admin_moderate(c, 'unhide'), 'admin unhide'); perform tests.logout();
  perform tests.eq((select status::text from public.candidates where id = c), 'hidden', 'unhide does not seat the owner');
  perform tests.login(cu); perform tests.ok(public.set_my_candidate_status('sitting'), 'owner sits after unhide'); perform tests.logout();
  perform tests.pass('admin hide = moderation lock until unhide');

  -- ---------- removed sign / sign under review also lock "sit again" ----------
  perform tests.login_service(); perform tests.ok(public.admin_moderate(c2, 'remove_sign'), 'remove_sign'); perform tests.logout();
  perform tests.login(c2u);
  perform tests.ok(public.set_my_candidate_status('hidden'), 'hide with removed sign');
  perform tests.err(public.set_my_candidate_status('sitting'), 'MODERATION_LOCKED', 'removed sign locks');
  perform tests.logout();
  perform tests.login_service(); perform tests.ok(public.admin_moderate(c2, 'approve_sign'), 'approve'); perform tests.logout();
  perform tests.login(c2u); perform tests.ok(public.set_my_candidate_status('sitting'), 'sit after approve'); perform tests.logout();
  update public.candidates set sign_state = 'pending_review' where id = c3;
  perform tests.login(c3u);
  perform tests.ok(public.set_my_candidate_status('hidden'), 'hide while pending');
  perform tests.err(public.set_my_candidate_status('sitting'), 'MODERATION_LOCKED', 'pending review locks');
  perform tests.logout();
  perform tests.pass('removed / pending sign: no sitting again');

  -- ---------- delete + recreate keeps the moderation state (tombstone by user_id) ----------
  perform tests.login(c3u); perform tests.ok(public.delete_my_candidate(), 'delete pending'); perform tests.logout();
  perform tests.check(exists (select 1 from private.candidate_tombstones where user_id = c3u and sign_locked and not hide_locked), 'tombstone');
  perform tests.reset_rate();
  perform tests.login(c3u);
  new_id := (tests.ok(public.upsert_my_candidate(tests.cand_payload('qa', 'Tạo lại biển mới')), 'recreate')->>'id')::uuid;
  perform tests.logout();
  perform tests.check((select sign_state = 'pending_review' and status = 'sitting' from public.candidates where id = new_id), 'recreated row pending_review');
  perform tests.check(not exists (select 1 from private.candidate_tombstones where user_id = c3u), 'tombstone consumed');
  perform tests.login_anon();
  perform tests.eq(public.get_candidate(new_id::text)->'sign_text', 'null'::jsonb, 'recreated sign hidden from the public');
  perform tests.logout();
  -- admin-hidden then deleted -> recreated hidden + locked
  perform tests.login_service(); perform tests.ok(public.admin_moderate(c4, 'hide'), 'hide c4'); perform tests.logout();
  perform tests.login(c4u); perform tests.ok(public.delete_my_candidate(), 'delete hidden'); perform tests.logout();
  perform tests.reset_rate();
  delete from realtime.messages;
  perform tests.login(c4u);
  new_id := (tests.ok(public.upsert_my_candidate(tests.cand_payload('qa', 'Tạo lại biển mới')), 'recreate c4')->>'id')::uuid;
  perform tests.err(public.set_my_candidate_status('sitting'), 'MODERATION_LOCKED', 'recreated row still locked');
  perform tests.logout();
  perform tests.check((select status = 'hidden' and mod_hidden_at is not null and sign_state = 'ok' from public.candidates where id = new_id), 'recreated hidden');
  perform tests.check(not exists (select 1 from realtime.messages where event = 'candidate_upsert'), 'hidden recreate is not broadcast');
  -- admin delete -> both locks
  perform tests.login_service(); perform tests.ok(public.admin_moderate(c5, 'delete'), 'admin delete'); perform tests.logout();
  perform tests.reset_rate();
  perform tests.login(c5u);
  new_id := (tests.ok(public.upsert_my_candidate(tests.cand_payload('qa', 'Tạo lại biển mới')), 'recreate c5')->>'id')::uuid;
  perform tests.logout();
  perform tests.check((select status = 'hidden' and sign_state = 'pending_review' from public.candidates where id = new_id), 'admin delete: hidden + pending');
  -- an unmoderated profile recreates normally
  perform tests.login(c2u); perform tests.ok(public.delete_my_candidate(), 'delete clean'); perform tests.logout();
  perform tests.reset_rate();
  perform tests.login(c2u);
  new_id := (tests.ok(public.upsert_my_candidate(tests.cand_payload('qa', 'Tạo lại biển mới')), 'recreate clean')->>'id')::uuid;
  perform tests.logout();
  perform tests.check((select status = 'sitting' and sign_state = 'ok' from public.candidates where id = new_id), 'clean recreate');
  perform tests.pass('tombstones survive delete + recreate');

  -- ---------- re-create cap: 3 creations per VN day ----------
  perform tests.reset_rate();
  u := tests.mk_profile('Tạo Xóa Liên Tục', 'candidate');
  for i in 1..4 loop
    delete from private.rate_hits where key like 'cand_create:%';            -- skip the 10-minute limit, keep the daily one
    perform tests.login(u);
    v := public.upsert_my_candidate(tests.cand_payload('qa', 'Tạo lại lần thứ ' || i));
    if i <= 3 then
      perform tests.ok(v, 'create ' || i);
      perform tests.ok(public.delete_my_candidate(), 'delete ' || i);
    else
      perform tests.err(v, 'RATE_LIMITED', 'create 4');
      perform tests.check(not (v ? 'retryAfterSec'), 'daily cap has no retryAfterSec');
    end if;
    perform tests.logout();
  end loop;
  perform tests.check((select bucket = (private.vn_today()::timestamp at time zone 'Asia/Ho_Chi_Minh')
                         from private.rate_hits where key = 'cand_create_day:' || u), 'daily bucket starts at VN midnight');
  perform tests.pass('candidateCreatesPerDay = 3');

  -- ---------- bans ----------
  b := tests.mk_candidate('Bị Ban', 'devops'); bu := tests.cand_user(b);
  delete from realtime.messages;
  perform tests.login_service(); perform tests.ok(public.admin_moderate(b, 'ban'), 'ban'); perform tests.logout();
  perform tests.check(exists (select 1 from private.bans where user_id = bu), 'ban row');
  perform tests.check((select status = 'hidden' and mod_hidden_at is not null from public.candidates where id = b), 'banned candidate hidden + locked');
  perform tests.check(exists (select 1 from realtime.messages where event = 'candidate_remove' and payload->>'id' = b::text), 'ban -> remove');
  perform tests.reset_rate();
  perform tests.login(bu);
  perform tests.err(public.upsert_profile('Bị Ban', 'candidate'), 'BANNED', 'banned upsert_profile');
  perform tests.err(public.upsert_profile('Tên Mới', 'hr', 'Corp'), 'BANNED', 'banned cannot become HR');
  perform tests.err(public.upsert_my_candidate(tests.cand_payload('devops')), 'BANNED', 'banned upsert_my_candidate');
  perform tests.err(public.report_candidate(c, 'spam'), 'BANNED', 'banned report');
  perform tests.err(public.set_my_candidate_status('sitting'), 'MODERATION_LOCKED', 'banned cannot sit');
  perform tests.logout();
  perform tests.login_service(); perform tests.ok(public.admin_moderate(b, 'unban'), 'unban'); perform tests.logout();
  perform tests.login(bu); perform tests.ok(public.upsert_profile('Bị Ban', 'candidate'), 'unbanned'); perform tests.logout();
  -- HR without a candidate row: admin_ban_user
  h := tests.mk_profile('HR Lừa Đảo', 'hr', 'Ma Corp');
  perform tests.login_service(); perform tests.ok(public.admin_ban_user(h, true, 'scam'), 'ban HR'); perform tests.logout();
  perform tests.eq((select reason from private.bans where user_id = h), 'scam', 'ban reason');
  perform tests.login(h);
  perform tests.err(public.send_invitation(c, msg, 'hr@ma.vn'), 'BANNED', 'banned HR cannot send 500k');
  perform tests.logout();
  perform tests.login_service(); perform tests.ok(public.admin_ban_user(h, false), 'unban HR'); perform tests.logout();
  perform tests.check(not exists (select 1 from private.bans where user_id = h), 'unbanned HR');
  perform tests.pass('bans');

  -- ---------- admin input validation + privileges ----------
  perform tests.login_service();
  perform tests.err(public.admin_moderate(c, null), 'VALIDATION', 'null action', 'action');
  perform tests.err(public.admin_moderate(c, 'nuke'), 'VALIDATION', 'unknown action', 'action');
  perform tests.err(public.admin_moderate(gen_random_uuid(), 'hide'), 'NOT_FOUND', 'unknown candidate');
  perform tests.err(public.admin_moderate(s, 'ban'), 'VALIDATION', 'sample has no user to ban', 'action');
  perform tests.err(public.admin_ban_user(null), 'VALIDATION', 'null user', 'user');
  perform tests.logout();
  perform tests.login(cu);
  begin
    perform public.admin_ban_user(cu);
    raise exception 'FAIL: authenticated could call admin_ban_user';
  exception when insufficient_privilege then null;
  end;
  perform tests.logout();
  perform tests.login_anon();
  begin
    perform public.admin_ban_user(cu);
    raise exception 'FAIL: anon could call admin_ban_user';
  exception when insufficient_privilege then null;
  end;
  perform tests.logout();
  perform tests.pass('admin validation + service_role only');
end $$;
rollback;
