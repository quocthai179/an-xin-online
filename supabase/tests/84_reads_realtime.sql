-- 0002: list_candidates window + cut (review M4 / sec M5), get_candidate lookup split, upsert_my_candidate never raises
-- on malformed JSON (review nit), PII on display name / company (sec M4), anonymous street refs (sec L1),
-- 'pos:' topics restricted to known zones (sec I1).
\set ON_ERROR_STOP 1
begin;
do $$
declare
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; cn uuid; cu uuid; hr uuid; anon_c uuid; anon_u uuid; inv uuid; off uuid;
  v jsonb; ids text[]; n int; t text; ok boolean; u uuid; slug text; msg text := 'Chào bạn, mời bạn phỏng vấn nhé';
  p jsonb;
begin
  -- ---------- list_candidates: placed only for placedVisibleDays ----------
  c1 := tests.mk_candidate('Đang Ngồi', 'qa');
  c2 := tests.mk_candidate('Vừa Được Bao', 'qa');
  c3 := tests.mk_candidate('Bao Lâu Rồi', 'qa');
  c4 := tests.mk_candidate('Đang Ẩn', 'qa');
  update public.candidates set status = 'placed', placed_at = now() - interval '10 days' where id = c2;
  update public.candidates set status = 'placed', placed_at = now() - interval '31 days' where id = c3;
  update public.candidates set status = 'hidden' where id = c4;
  perform tests.login_anon();
  ids := array(select x->>'id' from public.list_candidates() x);
  perform tests.logout();
  perform tests.check(c1::text = any (ids) and c2::text = any (ids), 'sitting + recently placed listed');
  perform tests.check(not (c3::text = any (ids)) and not (c4::text = any (ids)), 'old placed + hidden not listed');
  perform tests.pass('list_candidates: placed within 30 days');

  -- ---------- listMax cut keeps sitting first and newest first; output stays created_at ascending ----------
  insert into public.candidates(user_id, is_sample, display_name, zone, sign_text, title, years_exp, skills, created_at)
  select null, true, 'Mẫu ' || g, 'other', 'Mẫu: cần việc', 'Sample', 1, array['js'], now() - interval '1 day' - g * interval '1 second'
  from generate_series(1, 3001) g;
  cn := tests.mk_candidate('Người Mới Nhất', 'qa');
  perform tests.login_anon();
  select count(*) into n from public.list_candidates() x;
  perform tests.eq(n, 3000, 'limit kept at listMax');
  perform tests.check(exists (select 1 from public.list_candidates() x where x->>'id' = cn::text), 'newest sitting never dropped');
  perform tests.check(not exists (select 1 from public.list_candidates() x where x->>'id' = c2::text), 'placed are cut before sitting');
  perform tests.check(not exists (select 1 from public.list_candidates() x where x->>'display_name' = 'Mẫu 3001'), 'oldest sitting dropped');
  perform tests.check((select bool_and(ok2) from (
      select (x->>'created_at')::timestamptz >= lag((x->>'created_at')::timestamptz) over () or lag(x->>'created_at') over () is null as ok2
      from public.list_candidates() x) s), 'output ordered by created_at');
  perform tests.logout();
  delete from public.candidates where is_sample and display_name like 'Mẫu %';
  perform tests.pass('list_candidates: listMax cut');

  -- ---------- get_candidate: uuid -> id, otherwise slug ----------
  slug := (select c.slug from public.candidates c where c.id = c1);
  perform tests.login_anon();
  perform tests.eq(public.get_candidate(c1::text)->>'id', c1::text, 'by id');
  perform tests.eq(public.get_candidate(upper(c1::text))->>'id', c1::text, 'by id, uppercase');
  perform tests.eq(public.get_candidate(slug)->>'id', c1::text, 'by slug');
  perform tests.check(public.get_candidate(gen_random_uuid()::text) is null, 'unknown uuid');
  perform tests.check(public.get_candidate('nope') is null, 'unknown slug');
  perform tests.check(public.get_candidate(null) is null, 'null key');
  perform tests.check(public.get_candidate(repeat('a', 65)) is null, 'oversized key');
  perform tests.check(public.get_candidate(c4::text) is null, 'hidden still invisible');
  perform tests.logout();
  perform tests.pass('get_candidate lookup split');

  -- ---------- upsert_my_candidate: malformed JSON never raises ----------
  cu := tests.cand_user(c1);
  perform tests.reset_rate();
  perform tests.login(cu);
  p := tests.cand_payload('qa');
  perform tests.ok(public.upsert_my_candidate(p || '{"salary_negotiable":"abc","hide_from_ticker":"true","show_salary_on_card":1}'), 'odd booleans');
  perform tests.logout();
  perform tests.check((select not salary_negotiable and not hide_from_ticker and not show_salary_on_card from public.candidates where id = c1),
                      'only JSON true counts');
  perform tests.login(cu);
  perform tests.ok(public.upsert_my_candidate(p || '{"salary_negotiable":true,"hide_from_ticker":true}'), 'real booleans');
  perform tests.err(public.upsert_my_candidate(p || '{"years_exp":"3"}'), 'VALIDATION', 'years as string', 'years_exp');
  perform tests.err(public.upsert_my_candidate(p || '{"years_exp":3.5}'), 'VALIDATION', 'fractional years', 'years_exp');
  perform tests.err(public.upsert_my_candidate(p || '{"years_exp":1e30}'), 'VALIDATION', 'huge years', 'years_exp');
  perform tests.err(public.upsert_my_candidate(p || '{"skills":"go"}'), 'VALIDATION', 'skills not array', 'skills');
  perform tests.err(public.upsert_my_candidate(p || '{"skills":[1,2]}'), 'VALIDATION', 'skills not strings', 'skills');
  perform tests.err(public.upsert_my_candidate(p || '{"salary_min":"abc"}'), 'VALIDATION', 'salary string', 'salary');
  perform tests.err(public.upsert_my_candidate(p || '{"salary_max":1e20}'), 'VALIDATION', 'salary huge', 'salary');
  perform tests.err(public.upsert_my_candidate(p || '{"salary_min":10.5}'), 'VALIDATION', 'salary fractional', 'salary');
  perform tests.err(public.upsert_my_candidate(p || '{"work_modes":[1]}'), 'VALIDATION', 'work_modes not strings', 'work_modes');
  perform tests.ok(public.upsert_my_candidate(p || '{"salary_min":"","salary_max":null,"work_modes":"remote","hide_from_ticker":true}'), 'empty salary + non-array modes');
  perform tests.logout();
  perform tests.check((select hide_from_ticker and salary_min is null and work_modes = '{}' from public.candidates where id = c1), 'stored');
  perform tests.pass('upsert_my_candidate: malformed JSON -> VALIDATION, never an exception');

  -- ---------- PII in display name / company ----------
  u := tests.new_user();
  perform tests.login(u);
  perform tests.err(public.upsert_profile('Gọi 0912345678', 'viewer'), 'PII_NOT_ALLOWED', 'phone in name', 'display_name');
  perform tests.err(public.upsert_profile('zalo.me/abc', 'viewer'), 'PII_NOT_ALLOWED', 'url in name', 'display_name');
  perform tests.err(public.upsert_profile('vcl 0912345678', 'viewer'), 'BLOCKED_CONTENT', 'blocklist before PII', 'display_name');
  perform tests.err(public.upsert_profile('Lan HR', 'hr', 'tuyendung.vn'), 'PII_NOT_ALLOWED', 'domain company', 'company');
  perform tests.err(public.upsert_profile('Lan HR', 'hr', 'Corp gmail chấm com'), 'PII_NOT_ALLOWED', 'spelled email company', 'company');
  perform tests.ok(public.upsert_profile('Lan HR', 'hr', 'ASP.NET Corp'), 'tech name in company is fine');
  perform tests.logout();
  perform tests.pass('PII on display_name / company');

  -- ---------- L1: hide_from_ticker -> street refs without id / zone (invite, offer, placed) ----------
  anon_c := c1; anon_u := cu;                                    -- c1 now has hide_from_ticker = true
  hr := tests.mk_profile('HR Ẩn Danh', 'hr', 'Tôm Corp');
  delete from realtime.messages;
  perform tests.login(hr);
  inv := (tests.ok(public.send_invitation(anon_c, msg, 'hr@tom.vn'), 'invite anon')->>'id')::uuid;
  perform tests.logout();
  perform tests.login(anon_u); perform tests.ok(public.respond_invitation(inv, true), 'accept'); perform tests.logout();
  perform tests.login(hr);
  off := (tests.ok(public.send_offer(anon_c, 'Dev', '30tr'), 'offer anon')->>'id')::uuid;
  perform tests.logout();
  perform tests.login(anon_u); perform tests.ok(public.respond_offer(off, true), 'accept offer'); perform tests.logout();
  perform tests.eq((select count(*) from realtime.messages where topic = 'street' and event in ('invite', 'offer')
                      and payload->'candidate' = '{"name": "một bạn ẩn danh"}'::jsonb)::int, 2, 'invite + offer refs anonymous');
  perform tests.check((select payload->>'name' = 'một bạn ẩn danh' from realtime.messages where event = 'placed'), 'placed carries ticker name');
  perform tests.check(not exists (select 1 from realtime.messages where topic = 'street' and event in ('invite', 'offer')
                                    and payload::text like '%' || anon_c::text || '%'), 'no candidate id in invite/offer');
  perform tests.pass('anonymous street refs (L1)');

  -- ---------- I1: pos: topics limited to zones + plaza ----------
  u := tests.mk_profile('Người Đi Dạo', 'viewer');
  insert into realtime.messages(topic, extension, payload, event, private)
  select x, 'broadcast', '{}', 'probe', true from unnest(array['pos:plaza', 'pos:backend', 'pos:evil', 'pos:', 'pos:backend:x']) x;
  for t, ok in select * from (values ('pos:plaza', true), ('pos:backend', true), ('pos:other', true), ('pos:evil', false),
                                     ('pos:', false), ('pos:backend:x', false), ('pos:BACKEND', false)) x(a, b) loop
    perform tests.login(u);
    perform set_config('realtime.topic', t, true);
    select count(*) into n from realtime.messages where topic = t and event = 'probe';
    begin
      insert into realtime.messages(topic, extension, payload, event, private) values (t, 'broadcast', '{}', 'pose', true);
      perform tests.logout();
      if not ok then raise exception 'FAIL: could broadcast on %', t; end if;
    exception when insufficient_privilege then
      perform tests.logout();
      if ok then raise exception 'FAIL: could not broadcast on %', t; end if;
    end;
    if ok and t <> 'pos:other' then perform tests.eq(n, 1, 'can read ' || t); end if;
    if not ok then perform tests.eq(n, 0, 'cannot read ' || t); end if;
  end loop;
  perform tests.pass('pos: topics restricted to known zones (I1)');
end $$;
rollback;
