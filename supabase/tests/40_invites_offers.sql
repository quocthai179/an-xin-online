-- Invitations "500k" (US-10, BR-5-*), offers "bao trọn" (US-11, BR-O*), contact privacy (BR-Privacy).
\set ON_ERROR_STOP 1
begin;
do $$
declare
  hr uuid; hr2 uuid; hr3 uuid; viewer uuid; c uuid; cu uuid; c2 uuid; c2u uuid; s uuid; v jsonb; inv uuid; inv2 uuid; off uuid;
  i int; hrs uuid[] := '{}'; cands uuid[] := '{}';
  msg text := 'Chào bạn, mời bạn phỏng vấn nhé';
begin
  hr := tests.mk_profile('HR Năm Trăm', 'hr', 'Tôm Corp');
  hr2 := tests.mk_profile('HR Hai', 'hr', 'Cua Corp');
  hr3 := tests.mk_profile('HR Ba', 'hr', 'Ghẹ Corp');
  viewer := tests.mk_profile('Khách', 'viewer');
  c := tests.mk_candidate('Ứng Viên A', 'backend'); cu := tests.cand_user(c);
  c2 := tests.mk_candidate('Ứng Viên B', 'qa'); c2u := tests.cand_user(c2);
  s := tests.mk_sample('Mẫu');

  -- ---------- contact hidden until a valid 500k ----------
  perform tests.login(hr);
  perform tests.err(public.get_candidate_contact(c), 'CONTACT_LOCKED', 'contact locked before 500k');
  perform tests.eq((public.get_candidate(c::text)->'me'->>'can_see_contact')::boolean, false, 'can_see_contact false');
  perform tests.logout();
  perform tests.login(cu);
  v := tests.ok(public.get_candidate_contact(c), 'owner sees contact');
  perform tests.eq(v->>'value', 'me@example.com', 'owner contact value');
  perform tests.eq(public.get_me()->'candidate'->'contact'->>'kind', 'email', 'get_me includes own contact');
  perform tests.logout();
  perform tests.login_anon();
  begin
    perform public.get_candidate_contact(c);
    raise exception 'FAIL: anon could call get_candidate_contact';
  exception when insufficient_privilege then null;
  end;
  perform tests.logout();
  perform tests.pass('contact locked before 500k');

  -- ---------- send_invitation checks ----------
  perform tests.login(viewer);
  perform tests.err(public.send_invitation(c, msg, 'hr@tom.vn'), 'WRONG_ROLE', 'viewer cannot invite');
  perform tests.logout();
  perform tests.login(hr);
  perform tests.err(public.send_invitation(gen_random_uuid(), msg, 'hr@tom.vn'), 'NOT_FOUND', 'unknown');
  perform tests.err(public.send_invitation(s, msg, 'hr@tom.vn'), 'SAMPLE_CANDIDATE', 'sample');
  perform tests.err(public.send_invitation(c, 'ngắn', 'hr@tom.vn'), 'VALIDATION', 'short msg', 'message');
  perform tests.err(public.send_invitation(c, 'Vào đây chơi casino nha bạn', 'hr@tom.vn'), 'BLOCKED_CONTENT', 'blocked msg', 'message');
  perform tests.err(public.send_invitation(c, msg, 'x'), 'VALIDATION', 'short contact', 'hr_contact');
  v := tests.ok(public.send_invitation(c, msg, 'hr@tom.vn'), 'invite 1');
  inv := (v->>'id')::uuid;
  perform tests.eq(v->>'status', 'pending', 'pending');
  perform tests.eq(v->>'hr_company', 'Tôm Corp', 'snapshot company');
  perform tests.check((v->>'expires_at')::timestamptz = now() + interval '14 days', 'expires in 14 days');
  perform tests.err(public.send_invitation(c, msg, 'hr@tom.vn'), 'INVITE_ALREADY_OPEN', 'second open invite same pair');
  -- 0002 (sec H1): a PENDING 500k does not unlock the contact any more; accepted ones do (tested in 80_contact_gate.sql)
  perform tests.err(public.get_candidate_contact(c), 'CONTACT_LOCKED', 'contact still locked while pending');
  perform tests.eq((public.get_candidate(c::text)->'me'->>'can_see_contact')::boolean, false, 'can_see_contact false while pending');
  perform tests.eq((public.get_candidate(c::text)->'me'->>'open_invite')::boolean, true, 'me.open_invite');
  perform tests.logout();
  -- other HR still locked
  perform tests.login(hr2);
  perform tests.err(public.get_candidate_contact(c), 'CONTACT_LOCKED', 'other HR still locked');
  perform tests.logout();
  perform tests.eq((select invite_total from public.candidates where id = c), 1, 'invite_total');
  perform tests.eq((select invites from public.candidate_daily where candidate_id = c), 1, 'daily invites');
  perform tests.check(exists (select 1 from realtime.messages where topic = 'street' and event = 'invite'
                               and payload->>'id' = inv::text and not (payload::text like '%hr@tom.vn%')
                               and not (payload::text like '%' || msg || '%')), 'street invite event without message/contact');
  perform tests.check(exists (select 1 from realtime.messages where topic = 'inbox:' || cu::text
                               and payload->>'type' = 'invite_received' and payload->'payload'->>'hrContact' = 'hr@tom.vn'),
                      'candidate inbox has invite with contact');
  perform tests.pass('send_invitation (contact stays locked while pending)');

  -- RLS: parties see the invitation, others don't
  perform tests.login(cu);
  perform tests.eq((select count(*) from public.invitations)::int, 1, 'candidate sees own invitation');
  perform tests.logout();
  perform tests.login(hr2);
  perform tests.eq((select count(*) from public.invitations)::int, 0, 'other HR sees none');
  perform tests.logout();
  perform tests.login(hr);
  perform tests.eq((select count(*) from public.invitations)::int, 1, 'hr sees sent invitation');
  perform tests.logout();
  perform tests.pass('invitations RLS');

  -- ---------- BR-5-1: 3 per HR per day ----------
  for i in 1..3 loop cands := cands || tests.mk_candidate('Ứng Viên N' || i, 'data_ai'); end loop;
  perform tests.login(hr);
  perform tests.ok(public.send_invitation(cands[1], msg, 'hr@tom.vn'), 'invite 2');
  perform tests.ok(public.send_invitation(cands[2], msg, 'hr@tom.vn'), 'invite 3');
  perform tests.err(public.send_invitation(cands[3], msg, 'hr@tom.vn'), 'LIMIT_DAILY', 'invite 4 of the day');
  perform tests.eq((public.get_me()->'quota'->>'invite_used')::int, 3, 'quota invite_used');
  perform tests.logout();
  perform tests.pass('BR-5-1 3 invites/day');

  -- ---------- BR-5-3: max 5 open invitations per candidate ----------
  for i in 1..5 loop hrs := hrs || tests.mk_profile('HR Đông ' || i, 'hr', 'Cty ' || i); end loop;
  for i in 1..4 loop
    perform tests.login(hrs[i]); perform tests.ok(public.send_invitation(c2, msg, 'hr@x.vn'), 'crowd ' || i); perform tests.logout();
  end loop;
  perform tests.login(hr2); perform tests.ok(public.send_invitation(c2, msg, 'hr2@x.vn'), 'crowd 5'); perform tests.logout();
  perform tests.login(hrs[5]);
  perform tests.err(public.send_invitation(c2, msg, 'hr@x.vn'), 'CANDIDATE_FULL', '6th open invite');
  perform tests.logout();
  perform tests.pass('BR-5-3 CANDIDATE_FULL');

  -- ---------- expiry (lazy) + cooldown (BR-5-2, BR-5-5) ----------
  update public.invitations set expires_at = now() - interval '1 second' where hr_id = hrs[1] and candidate_id = c2;
  perform tests.login(hrs[1]);
  perform tests.err(public.send_invitation(c2, msg, 'hr@x.vn'), 'INVITE_COOLDOWN', 'expired but within 7 day cooldown');
  perform tests.logout();
  perform tests.eq((select status::text from public.invitations where hr_id = hrs[1] and candidate_id = c2), 'expired', 'lazy expiry flipped');
  perform tests.login(hrs[5]);
  perform tests.ok(public.send_invitation(c2, msg, 'hr@x.vn'), 'slot freed by expiry');
  perform tests.logout();
  update public.invitations set created_at = now() - interval '8 days', day = day - 8 where hr_id = hrs[1] and candidate_id = c2;
  perform tests.login(hrs[1]);
  perform tests.err(public.send_invitation(c2, msg, 'hr@x.vn'), 'CANDIDATE_FULL', 'after cooldown, but candidate full again');
  perform tests.logout();
  perform tests.pass('invite lazy expiry + cooldown');

  -- candidate responds: expired invitation -> EXPIRED
  inv2 := (select id from public.invitations where hr_id = hrs[2] and candidate_id = c2);
  update public.invitations set expires_at = now() - interval '1 minute' where id = inv2;
  perform tests.login(c2u);
  perform tests.err(public.respond_invitation(inv2, true), 'EXPIRED', 'respond expired');
  perform tests.err(public.respond_invitation(inv2, true), 'NOT_PENDING', 'respond again');
  perform tests.err(public.respond_invitation(inv, true), 'NOT_FOUND', 'cannot respond to other candidate''s invite');
  inv2 := (select id from public.invitations where hr_id = hrs[3] and candidate_id = c2);
  perform tests.err(public.respond_invitation(inv2, false, 'đ.m'), 'VALIDATION', 'blocked reason', 'reason');
  v := tests.ok(public.respond_invitation(inv2, false, 'Cảm ơn, mình chưa sẵn sàng'), 'decline');
  perform tests.eq(v->>'status', 'declined', 'declined');
  perform tests.logout();
  perform tests.pass('respond_invitation expired/declined/foreign');

  -- ---------- offers ----------
  perform tests.login(hr);
  perform tests.err(public.send_offer(c, 'Backend', '30tr'), 'NEED_ACCEPTED_INVITE', 'offer needs accepted invite (BR-O1)');
  perform tests.logout();
  perform tests.login(cu);
  v := tests.ok(public.respond_invitation(inv, true), 'accept invite');
  perform tests.eq(v->>'status', 'accepted', 'accepted');
  perform tests.logout();
  perform tests.eq((select invites_accepted from public.candidate_daily where candidate_id = c), 1, 'invites_accepted bucket');
  perform tests.check(exists (select 1 from realtime.messages where topic = 'inbox:' || hr::text and payload->>'type' = 'invite_responded'),
                      'hr notified of accept');
  perform tests.login(hr);
  perform tests.eq(public.get_candidate(c::text)->'me'->>'accepted_invite_id', inv::text, 'me.accepted_invite_id');
  perform tests.err(public.send_offer(c, '', '30tr'), 'VALIDATION', 'empty position', 'position');
  perform tests.err(public.send_offer(c, 'Backend', repeat('x', 101)), 'VALIDATION', 'long package', 'package');
  perform tests.err(public.send_offer(c, 'Backend', '30tr', 'vcl'), 'VALIDATION', 'blocked offer message', 'message');
  v := tests.ok(public.send_offer(c, 'Backend Dev', '30 triệu', 'Về đội mình nhé', true), 'send offer');
  off := (v->>'id')::uuid;
  perform tests.eq(v->>'invitation_id', inv::text, 'offer linked to invitation');
  perform tests.check((v->>'expires_at')::timestamptz = now() + interval '7 days', 'offer 7 days');
  perform tests.err(public.send_offer(c, 'Backend Dev', '30 triệu'), 'OFFER_ALREADY_OPEN', 'second offer (BR-O2)');
  perform tests.logout();
  perform tests.login(viewer);
  perform tests.err(public.send_offer(c, 'x', 'y'), 'WRONG_ROLE', 'viewer offer');
  perform tests.logout();
  perform tests.check(exists (select 1 from realtime.messages where topic = 'street' and event = 'offer' and payload->>'id' = off::text),
                      'street offer event');
  perform tests.pass('send_offer rules');

  -- HR_OFFER_LIMIT: 3 open offers per HR (fixture rows inserted directly as owner)
  for i in 1..3 loop
    declare cc uuid := tests.mk_candidate('Ứng Viên O' || i, 'mobile'); ii uuid;
    begin
      insert into public.invitations(hr_id, candidate_id, hr_name, hr_company, message, hr_contact, status, day)
      values (hr3, cc, 'HR Ba', 'Ghẹ Corp', msg, 'hr3@x.vn', 'accepted', private.vn_today()) returning id into ii;
      if i < 3 then
        insert into public.offers(hr_id, candidate_id, invitation_id, hr_name, hr_company, position, package)
        values (hr3, cc, ii, 'HR Ba', 'Ghẹ Corp', 'Dev', '20tr');
      end if;
      if i = 3 then
        perform tests.login(hr3);
        perform tests.ok(public.send_offer(cc, 'Dev', '20tr'), '3rd open offer');
        perform tests.logout();
      end if;
    end;
  end loop;
  insert into public.invitations(hr_id, candidate_id, hr_name, hr_company, message, hr_contact, status, day)
  values (hr3, c2, 'HR Ba', 'Ghẹ Corp', msg, 'hr3@x.vn', 'accepted', private.vn_today() - 30);
  perform tests.login(hr3);
  perform tests.err(public.send_offer(c2, 'Dev', '20tr'), 'HR_OFFER_LIMIT', '4th open offer');
  perform tests.eq((public.get_me()->'quota'->>'offers_open')::int, 3, 'offers_open quota');
  perform tests.logout();
  perform tests.pass('HR_OFFER_LIMIT');

  -- ---------- respond_offer accept -> placed, other invites closed ----------
  -- give c another pending invite from hr2 to verify auto-close
  perform tests.login(hr2);
  perform tests.ok(public.send_invitation(c, msg, 'hr2@cua.vn'), 'hr2 invite to c');
  perform tests.logout();
  perform tests.login(cu);
  perform tests.err(public.respond_offer(gen_random_uuid(), true), 'NOT_FOUND', 'unknown offer');
  v := tests.ok(public.respond_offer(off, true, true, repeat('r', 250)), 'accept offer (long reason truncated, no exception)');
  perform tests.eq(v->>'status', 'accepted', 'offer accepted');
  perform tests.eq(char_length(v->>'response_reason'), 200, 'reason truncated to 200');
  perform tests.err(public.respond_offer(off, true), 'NOT_PENDING', 'accept twice');
  perform tests.logout();
  perform tests.eq((select status::text from public.candidates where id = c), 'placed', 'candidate placed (BR-O3)');
  perform tests.eq((select placed_company from public.candidates where id = c), 'Tôm Corp', 'company shown when both consent (BR-O4)');
  perform tests.eq((select status::text from public.invitations where hr_id = hr2 and candidate_id = c), 'closed', 'other open invites closed');
  perform tests.check(exists (select 1 from realtime.messages where topic = 'inbox:' || hr2::text and payload->>'type' = 'invite_closed'),
                      'hr2 notified invite_closed');
  perform tests.check(exists (select 1 from realtime.messages where topic = 'inbox:' || hr::text and payload->>'type' = 'offer_responded'),
                      'hr notified offer_responded');
  perform tests.check(exists (select 1 from realtime.messages where topic = 'street' and event = 'placed'
                               and payload->'candidate'->>'id' = c::text and payload->>'company' = 'Tôm Corp'), 'street placed');
  -- placed candidate: no more xu / 500k (BR-C4), still listed (wall of fame)
  perform tests.login(hr2);
  perform tests.err(public.drop_gift(c, 'xu'), 'CANDIDATE_UNAVAILABLE', 'placed: no xu');
  perform tests.err(public.send_invitation(c, msg, 'hr2@cua.vn'), 'CANDIDATE_UNAVAILABLE', 'placed: no 500k');
  perform tests.check(exists (select 1 from public.list_candidates() x where x->>'id' = c::text and x->>'status' = 'placed'), 'placed listed');
  perform tests.logout();
  perform tests.pass('respond_offer accept -> placed');

  -- consent: HR did not allow company -> null; decline path; expired offer
  declare cc uuid := tests.mk_candidate('Ứng Viên P', 'devops'); ccu uuid; ii uuid; oo uuid;
  begin
    ccu := tests.cand_user(cc);
    insert into public.invitations(hr_id, candidate_id, hr_name, hr_company, message, hr_contact, status, day)
    values (hr2, cc, 'HR Hai', 'Cua Corp', msg, 'hr2@x.vn', 'accepted', private.vn_today()) returning id into ii;
    perform tests.login(hr2);
    oo := (tests.ok(public.send_offer(cc, 'Ops', '25tr', null, false), 'offer no company')->>'id')::uuid;
    perform tests.logout();
    update public.offers set expires_at = now() - interval '1 second' where id = oo;
    perform tests.login(ccu);
    perform tests.err(public.respond_offer(oo, true, true), 'EXPIRED', 'expired offer');
    perform tests.logout();
    perform tests.eq((select status::text from public.candidates where id = cc), 'sitting', 'expired offer does not place');
    perform tests.login(hr2);
    oo := (tests.ok(public.send_offer(cc, 'Ops', '25tr', null, false), 'offer again after expiry')->>'id')::uuid;
    perform tests.logout();
    perform tests.login(ccu);
    perform tests.ok(public.respond_offer(oo, true, true), 'accept (candidate consents, HR not)');
    perform tests.logout();
    perform tests.eq((select placed_company from public.candidates where id = cc), null::text, 'company hidden without HR consent');
    -- sit again resets placed fields
    perform tests.login(ccu);
    perform tests.ok(public.set_my_candidate_status('sitting'), 'ngồi lại');
    perform tests.logout();
    perform tests.eq((select status::text || coalesce(placed_company, '-') from public.candidates where id = cc), 'sitting-', 'back to sitting');
  end;
  perform tests.pass('offer consent / expiry / sit again');

  -- direct writes are impossible even for parties
  perform tests.login(cu);
  begin
    update public.invitations set status = 'accepted' where id = inv;
    raise exception 'FAIL: candidate updated invitations directly';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.offers set status = 'pending' where id = off;
    raise exception 'FAIL: candidate updated offers directly';
  exception when insufficient_privilege then null;
  end;
  perform tests.logout();
  perform tests.pass('no direct writes on invitations/offers');
end $$;
rollback;
