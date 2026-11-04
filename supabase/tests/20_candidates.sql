-- Candidate profile upsert (US-2/US-4) + moderation parity with tests/lib/moderation.test.ts.
\set ON_ERROR_STOP 1
begin;
do $$
declare t text; u uuid; hr uuid; c uuid; v jsonb; p jsonb;
begin
  -- ---------- moderation functions: same cases as tests/lib/moderation.test.ts ----------
  foreach t in array array['đ.m', 'd m', 'Đ M', 'vcl', 'd1t', 'Đ.M mày', 'ĐỊT', 'lồn', 'V.C.L', 'đ  m', 'ditconme',
                           'dit.con.me', 'chuyển khoản vào đây', 'ｖｃｌ', 'v' || U&'\200B' || 'c' || U&'\200B' || 'l',
                           'd' || U&'\202E' || 'm'] loop
    perform tests.check(private.is_blocked(private.clean(t)), 'blocks ' || t);
  end loop;
  foreach t in array array['đeo kính', 'lớn', 'admin', 'Java 5 năm', 'Backend Developer', 'dịch vụ', 'Địa danh đẹp',
                           'điểm', 'Phở', 'Thông minh', 'dimension'] loop
    perform tests.check(not private.is_blocked(private.clean(t)), 'allows ' || t);
  end loop;
  perform tests.eq(private.clean('  a' || U&'\200B' || '  b' || E'\t\t' || 'c  '), 'a b c', 'clean collapses');
  perform tests.eq(private.clean('   '), null::text, 'clean blank -> null');
  perform tests.eq(private.clean('ａｂ'), 'ab', 'clean NFKC');
  perform tests.eq(private.loose('Đ. M'), 'dm', 'loose join');
  perform tests.eq(private.loose('d1t'), 'dit', 'loose leet');
  foreach t in array array['xem https://x.io', 'www.foo', 'mail me a@b.co', 'gọi 0912 345 678', '+84 912.345.678', 'site.com'] loop
    perform tests.check(private.has_pii(t), 'pii ' || t);
  end loop;
  foreach t in array array['Java 5 năm, xin job remote', 'lương 20 đến 30 triệu'] loop
    perform tests.check(not private.has_pii(t), 'no pii ' || t);
  end loop;
  -- allowlist rescues a phrase
  insert into private.allowlist(phrase) values ('dit con me');
  perform tests.check(not private.is_blocked('dit con me'), 'allowlist rescues');
  delete from private.allowlist;
  perform tests.check(private.is_blocked('dit con me'), 'blocked again without allowlist');
  perform tests.pass('moderation parity cases (blocklist/allowlist/clean/loose/pii)');

  -- ---------- upsert_my_candidate ----------
  u := tests.mk_profile('Ứng Viên Một', 'candidate');
  hr := tests.mk_profile('HR Một', 'hr', 'Tôm Corp');

  perform tests.login(hr);
  perform tests.err(public.upsert_my_candidate(tests.cand_payload()), 'WRONG_ROLE', 'hr cannot create candidate');
  perform tests.logout();
  perform tests.login(tests.new_user());
  perform tests.err(public.upsert_my_candidate(tests.cand_payload()), 'NO_PROFILE', 'no profile');
  perform tests.logout();

  perform tests.login(u);
  p := tests.cand_payload();
  perform tests.err(public.upsert_my_candidate(p || '{"sign_text":"abc"}'), 'VALIDATION', 'short sign', 'sign_text');
  perform tests.err(public.upsert_my_candidate(p || jsonb_build_object('sign_text', E'a\nb\nc d e')), 'VALIDATION', 'two newlines', 'sign_text');
  perform tests.err(public.upsert_my_candidate(p || '{"zone":"mars"}'), 'VALIDATION', 'bad zone', 'zone');
  perform tests.err(public.upsert_my_candidate(p || '{"years_exp":"abc"}'), 'VALIDATION', 'bad years', 'years_exp');
  perform tests.err(public.upsert_my_candidate(p || '{"years_exp":51}'), 'VALIDATION', 'years > 50', 'years_exp');
  perform tests.err(public.upsert_my_candidate(p || '{"skills":[]}'), 'VALIDATION', 'no skills', 'skills');
  perform tests.err(public.upsert_my_candidate(p || '{"salary_min":40,"salary_max":30}'), 'VALIDATION', 'salary order', 'salary');
  perform tests.err(public.upsert_my_candidate(p || '{"work_modes":["space"]}'), 'VALIDATION', 'work modes', 'work_modes');
  perform tests.err(public.upsert_my_candidate(p || '{"contact_kind":"email","contact_value":"nope"}'), 'VALIDATION', 'contact', 'contact');
  perform tests.err(public.upsert_my_candidate(p || '{"contact_kind":"url","contact_value":"javascript:alert(1)"}'), 'VALIDATION', 'js url', 'contact');
  -- banned words rejected (BR-M1)
  perform tests.err(public.upsert_my_candidate(p || '{"sign_text":"Tuyển vcl luôn á"}'), 'BLOCKED_CONTENT', 'banned sign', 'sign_text');
  perform tests.err(public.upsert_my_candidate(p || '{"sign_text":"Cần việc Đ.M gấp"}'), 'BLOCKED_CONTENT', 'banned leet sign', 'sign_text');
  perform tests.err(public.upsert_my_candidate(p || '{"title":"Chuyên đa cấp"}'), 'BLOCKED_CONTENT', 'banned title', 'title');
  perform tests.err(public.upsert_my_candidate(p || '{"bio":"casino online"}'), 'BLOCKED_CONTENT', 'banned bio', 'bio');
  perform tests.err(public.upsert_my_candidate(p || '{"skills":["go","vkl"]}'), 'BLOCKED_CONTENT', 'banned skill', 'skills');
  -- PII (BR-M4)
  perform tests.err(public.upsert_my_candidate(p || '{"sign_text":"Gọi 0912 345 678 nhé"}'), 'PII_NOT_ALLOWED', 'phone in sign', 'sign_text');
  perform tests.err(public.upsert_my_candidate(p || '{"bio":"xem https://cv.io"}'), 'PII_NOT_ALLOWED', 'url in bio', 'bio');
  perform tests.logout();
  perform tests.check(not exists (select 1 from public.candidates where user_id = u), 'nothing written on failures');
  perform tests.check(not exists (select 1 from private.rate_hits where key like 'cand_%'), 'validation failures do not burn quota');
  perform tests.login(u);

  -- XSS payloads are stored as plain text (rendered as text nodes by React)
  v := tests.ok(public.upsert_my_candidate(p || '{"sign_text":"<b>Cần</b> việc gấp"}'), 'create');
  c := (v->>'id')::uuid;
  perform tests.check(length(v->>'slug') = 10, 'slug generated');
  perform tests.logout();
  perform tests.eq((select display_name from public.candidates where id = c), 'Ứng Viên Một', 'display_name from profile');
  perform tests.check(exists (select 1 from realtime.messages where topic = 'street' and event = 'candidate_upsert'
                               and payload->'candidate'->>'id' = c::text and payload->>'type' = 'candidate_upsert'), 'candidate_upsert emitted');
  perform tests.check(not exists (select 1 from realtime.messages where topic = 'street' and payload::text like '%me@example.com%'),
                      'contact never broadcast');
  perform tests.login(u);
  -- second create within 10 min would be an edit (same user) -> allowed (edit quota)
  v := tests.ok(public.upsert_my_candidate(p || '{"zone":"frontend"}'), 'edit + zone change');
  perform tests.logout();
  perform tests.eq((select zone from public.candidates where id = c), 'frontend', 'zone changed');
  perform tests.login(u);
  perform tests.err(public.upsert_my_candidate(p || '{"zone":"design"}'), 'ZONE_CHANGE_COOLDOWN', 'zone cooldown', 'zone');
  perform tests.ok(public.upsert_my_candidate(p || '{"zone":"frontend","city":"Huế"}'), 'edit same zone ok');
  perform tests.logout();
  -- edit quota 10/hour (2 used)
  perform tests.login(u);
  for i in 3..10 loop perform tests.ok(public.upsert_my_candidate(p || '{"zone":"frontend"}'), 'edit ' || i); end loop;
  perform tests.err(public.upsert_my_candidate(p || '{"zone":"frontend"}'), 'RATE_LIMITED', 'edit 11');
  perform tests.eq((public.upsert_my_candidate(p || '{"zone":"frontend"}')->>'retryAfterSec')::int, 3600, 'retryAfterSec');
  perform tests.logout();
  perform tests.pass('upsert_my_candidate validation/moderation/PII/rate limits/zone cooldown');

  -- profile create rate limit: 1 per 10 min per user (delete + recreate)
  perform tests.reset_rate();
  perform tests.login(u);
  perform tests.ok(public.delete_my_candidate(), 'delete');
  perform tests.err(public.delete_my_candidate(), 'NOT_FOUND', 'delete twice');
  perform tests.ok(public.upsert_my_candidate(p), 'recreate 1');
  perform tests.ok(public.delete_my_candidate(), 'delete 2');
  perform tests.err(public.upsert_my_candidate(p), 'RATE_LIMITED', 'recreate 2 within 10 min');
  perform tests.logout();
  perform tests.pass('profileCreatePer10Min + delete_my_candidate');

  -- hide / sit again; list/get visibility
  perform tests.reset_rate();
  c := tests.mk_candidate('Ứng Viên Hai', 'qa');
  u := tests.cand_user(c);
  perform tests.login(u);
  perform tests.err(public.set_my_candidate_status('placed'), 'VALIDATION', 'cannot self-place', 'status');
  perform tests.ok(public.set_my_candidate_status('hidden'), 'hide');
  perform tests.check(public.get_candidate(c::text) is not null, 'owner still sees hidden profile');
  perform tests.logout();
  perform tests.login_anon();
  perform tests.eq(public.get_candidate(c::text), null::jsonb, 'anon cannot see hidden');
  perform tests.check(not exists (select 1 from public.list_candidates() x where x->>'id' = c::text), 'hidden not listed');
  perform tests.logout();
  update public.candidates set sitting_since = now() - interval '3 days' where id = c;
  perform tests.login(u);
  perform tests.ok(public.set_my_candidate_status('sitting'), 'sit again');
  perform tests.logout();
  perform tests.eq((select sitting_since from public.candidates where id = c), now(), 'ngồi lì reset on sit again');
  t := (select slug from public.candidates where id = c);
  perform tests.login_anon();
  v := public.get_candidate(t);
  perform tests.eq(v->>'id', c::text, 'get by slug');
  perform tests.eq(v->'me', 'null'::jsonb, 'anon me null');
  perform tests.check(not (v ? 'user_id') and not (v ? 'contact') and not (v::text like '%me@example.com%'), 'no user_id/contact in get_candidate');
  perform tests.check(exists (select 1 from public.list_candidates() x where x->>'id' = c::text and not (x ? 'user_id')), 'listed, no user_id');
  perform tests.logout();
  perform tests.pass('status hide/sit + read visibility');
end $$;
rollback;
