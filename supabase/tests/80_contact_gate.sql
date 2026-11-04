-- 0002: contact gate (sec H1 + L5), HR account-age gate (H1), hourly contact cap, hr_contact moderation (sec M4/M6),
-- get_candidate_contact NOT_FOUND on a missing contact row (review nit).
\set ON_ERROR_STOP 1
begin;
do $$
declare
  hr uuid; hr2 uuid; hr3 uuid; fresh uuid; sw uuid; c uuid; cu uuid; c2 uuid; c2u uuid; c3 uuid; c4 uuid;
  v jsonb; inv uuid; i int; msg text := 'Chào bạn, mời bạn phỏng vấn nhé';
begin
  hr := tests.mk_profile('HR Gate', 'hr', 'Tôm Corp');
  hr2 := tests.mk_profile('HR Hai', 'hr', 'Cua Corp');
  hr3 := tests.mk_profile('HR Ba', 'hr', 'Ghẹ Corp');
  c := tests.mk_candidate('Ứng Viên Gate'); cu := tests.cand_user(c);
  c2 := tests.mk_candidate('Ứng Viên Hai', 'qa'); c2u := tests.cand_user(c2);
  c3 := tests.mk_candidate('Ứng Viên Ba', 'mobile');
  c4 := tests.mk_candidate('Ứng Viên Bốn', 'design');

  -- ---------- pending -> locked, accepted -> unlocked ----------
  perform tests.login(hr);
  inv := (tests.ok(public.send_invitation(c, msg, 'hr@tom.vn'), 'invite c')->>'id')::uuid;
  perform tests.err(public.get_candidate_contact(c), 'CONTACT_LOCKED', 'pending invite keeps contact locked');
  perform tests.eq((public.get_candidate(c::text)->'me'->>'can_see_contact')::boolean, false, 'can_see_contact false while pending');
  perform tests.logout();
  perform tests.login(cu); perform tests.ok(public.respond_invitation(inv, true), 'accept'); perform tests.logout();
  perform tests.login(hr);
  v := tests.ok(public.get_candidate_contact(c), 'accepted invite unlocks');
  perform tests.eq(v->>'value', 'me@example.com', 'contact value');
  perform tests.eq((public.get_candidate(c::text)->'me'->>'can_see_contact')::boolean, true, 'can_see_contact after accept');
  perform tests.logout();
  perform tests.pass('contact unlocks only on an accepted invitation');

  -- ---------- declined / expired / other HR stay locked ----------
  perform tests.login(hr2);
  inv := (tests.ok(public.send_invitation(c, msg, 'hr2@cua.vn'), 'hr2 invite')->>'id')::uuid;
  perform tests.logout();
  perform tests.login(cu); perform tests.ok(public.respond_invitation(inv, false, 'không hợp'), 'decline'); perform tests.logout();
  perform tests.login(hr2);
  perform tests.err(public.get_candidate_contact(c), 'CONTACT_LOCKED', 'declined invite: locked (L5)');
  perform tests.eq((public.get_candidate(c::text)->'me'->>'can_see_contact')::boolean, false, 'declined: can_see_contact false');
  perform tests.logout();
  perform tests.login(hr3);
  inv := (tests.ok(public.send_invitation(c, msg, 'hr3@ghe.vn'), 'hr3 invite')->>'id')::uuid;
  perform tests.logout();
  update public.invitations set expires_at = now() - interval '1 minute', created_at = now() - interval '15 days' where id = inv;
  perform tests.login(cu); perform tests.err(public.respond_invitation(inv, true), 'EXPIRED', 'cannot accept expired'); perform tests.logout();
  perform tests.login(hr3);
  perform tests.err(public.get_candidate_contact(c), 'CONTACT_LOCKED', 'expired invite: locked (L5)');
  perform tests.logout();
  perform tests.pass('declined / expired invitations never unlock');

  -- ---------- L5: role change locks again; becoming HR again restores it (the accepted invite still exists) ----------
  perform tests.login(hr);
  perform tests.ok(public.upsert_profile('HR Gate', 'viewer'), 'hr -> viewer');
  perform tests.err(public.get_candidate_contact(c), 'CONTACT_LOCKED', 'no longer HR: locked');
  perform tests.eq((public.get_candidate(c::text)->'me'->>'can_see_contact')::boolean, false, 'viewer: can_see_contact false');
  perform tests.ok(public.upsert_profile('HR Gate', 'hr', 'Tôm Corp'), 'viewer -> hr');
  perform tests.ok(public.get_candidate_contact(c), 'HR again with accepted invite: unlocked');
  perform tests.err(public.send_invitation(c2, msg, 'hr@tom.vn'), 'TOO_NEW', 'switching back to HR restarts the age gate');
  perform tests.logout();
  perform tests.age_profile(hr, '11 minutes');
  perform tests.pass('contact follows the current role');

  -- ---------- missing contact row -> NOT_FOUND (owner and unlocked HR) ----------
  delete from public.candidate_contacts where candidate_id = c;
  perform tests.login(cu); perform tests.err(public.get_candidate_contact(c), 'NOT_FOUND', 'owner, no contact row'); perform tests.logout();
  perform tests.login(hr); perform tests.err(public.get_candidate_contact(c), 'NOT_FOUND', 'hr, no contact row'); perform tests.logout();
  insert into public.candidate_contacts(candidate_id, kind, value) values (c, 'email', 'me@example.com');
  perform tests.login(hr); perform tests.err(public.get_candidate_contact(gen_random_uuid()), 'NOT_FOUND', 'unknown candidate'); perform tests.logout();
  perform tests.pass('get_candidate_contact NOT_FOUND');

  -- ---------- hourly cap per HR (global across candidates) ----------
  perform tests.login(hr);
  inv := (tests.ok(public.send_invitation(c2, msg, 'hr@tom.vn'), 'invite c2')->>'id')::uuid;
  perform tests.logout();
  perform tests.login(c2u); perform tests.ok(public.respond_invitation(inv, true), 'accept c2'); perform tests.logout();
  perform tests.reset_rate();
  perform tests.login(hr);
  for i in 1..20 loop perform tests.ok(public.get_candidate_contact(case when i % 2 = 0 then c else c2 end), 'view ' || i); end loop;
  v := public.get_candidate_contact(c);
  perform tests.err(v, 'RATE_LIMITED', 'view 21');
  perform tests.eq((v->>'retryAfterSec')::int, 3600, 'retryAfterSec 3600');
  perform tests.err(public.get_candidate_contact(c2), 'RATE_LIMITED', 'cap is per HR, not per candidate');
  perform tests.logout();
  perform tests.login(cu);
  for i in 1..25 loop perform tests.ok(public.get_candidate_contact(c), 'owner view ' || i); end loop;   -- owner is never capped
  perform tests.logout();
  perform tests.reset_rate();
  perform tests.login(hr2);
  perform tests.err(public.get_candidate_contact(c), 'CONTACT_LOCKED', 'locked attempts are refused before the cap');
  perform tests.logout();
  perform tests.eq((select count(*) from private.rate_hits where key = 'contact:' || hr2)::int, 0, 'locked attempts burn no quota');
  perform tests.pass('contact views capped at 20/h per HR');

  -- ---------- HR account-age gate (TOO_NEW) ----------
  fresh := tests.mk_profile('HR Mới Toanh', 'hr', 'Mới Corp', '0');
  perform tests.login(fresh);
  v := public.send_invitation(c3, msg, 'moi@corp.vn');
  perform tests.err(v, 'TOO_NEW', 'fresh HR');
  perform tests.check((v->>'retryAfterSec')::int between 590 and 600, 'retryAfterSec ~ 10 min, got ' || (v->>'retryAfterSec'));
  perform tests.logout();
  perform tests.age_profile(fresh, '9 minutes 30 seconds');
  perform tests.login(fresh);
  v := public.send_invitation(c3, msg, 'moi@corp.vn');
  perform tests.err(v, 'TOO_NEW', 'fresh HR at 9.5 min');
  perform tests.check((v->>'retryAfterSec')::int between 29 and 30, 'retryAfterSec ~ 30 s, got ' || (v->>'retryAfterSec'));
  perform tests.logout();
  perform tests.age_profile(fresh, '31 seconds');
  perform tests.login(fresh); perform tests.ok(public.send_invitation(c3, msg, 'moi@corp.vn'), 'HR after 10 min'); perform tests.logout();
  -- the gate runs before candidate lookup and validation (same order as checkInvite)
  sw := tests.mk_profile('Khách Chuyển Nghề', 'viewer');            -- profile is 2 h old ...
  perform tests.login(sw);
  perform tests.ok(public.upsert_profile('Khách Chuyển Nghề', 'hr', 'Đổi Corp'), 'viewer -> hr');
  perform tests.err(public.send_invitation(gen_random_uuid(), 'ngắn', 'x'), 'TOO_NEW', '... but hr_since starts now');
  perform tests.logout();
  perform tests.check((select hr_since > now() - interval '1 second' from public.profiles where id = sw), 'hr_since set on switch');
  perform tests.check((select hr_since is null from public.profiles where id = cu), 'hr_since null for non-HR');
  -- plain HR edits keep hr_since
  perform tests.login(hr2);
  perform tests.ok(public.upsert_profile('HR Hai', 'hr', 'Cua Corp', '{"skin":3}'::jsonb), 'hr edit');
  perform tests.logout();
  perform tests.check((select hr_since < now() - interval '1 hour' from public.profiles where id = hr2), 'hr_since kept on edit');
  perform tests.pass('TOO_NEW gate (10 min after becoming HR)');

  -- ---------- hr_contact must look like a contact and is moderated ----------
  perform tests.login(hr2);
  perform tests.err(public.send_invitation(c3, msg, 'gọi tui nha'), 'VALIDATION', 'free text contact', 'hr_contact');
  perform tests.err(public.send_invitation(c3, msg, 'javascript:alert(1)'), 'VALIDATION', 'javascript: contact', 'hr_contact');
  perform tests.err(public.send_invitation(c3, msg, 'ftp://acme.vn'), 'VALIDATION', 'ftp contact', 'hr_contact');
  perform tests.err(public.send_invitation(c3, msg, 'abc'), 'VALIDATION', 'too vague', 'hr_contact');
  perform tests.err(public.send_invitation(c3, msg, 'vcl.hr@acme.vn'), 'BLOCKED_CONTENT', 'blocked word in contact', 'hr_contact');
  perform tests.ok(public.send_invitation(c3, msg, 'https://acme.vn/jobs'), 'url contact');
  perform tests.ok(public.send_invitation(c4, msg, '+84 912 345 678'), 'phone contact');
  perform tests.logout();
  perform tests.pass('hr_contact moderation');
end $$;
rollback;
