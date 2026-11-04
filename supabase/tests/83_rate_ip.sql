-- 0002: client IP from trusted headers, fail closed (sec H2); love-per-IP on the VN day; per-user limits on
-- upsert_profile / set_my_candidate_status and no-op broadcast suppression (sec H3); rate_hits retention (sec L4).
\set ON_ERROR_STOP 1
begin;
do $$
declare
  u uuid; c uuid; cu uuid; v jsonb; i int; n int; hrs uuid[] := '{}'; ip text; ip2 text;
begin
  -- ---------- private.client_ip() header precedence (as postgres: private.* is not callable by clients) ----------
  perform set_config('request.headers', '{"cf-connecting-ip":"1.1.1.1","x-real-ip":"2.2.2.2","x-forwarded-for":"9.9.9.9, 3.3.3.3"}', true);
  perform tests.eq(private.client_ip(), '1.1.1.1', 'cf-connecting-ip wins');
  perform set_config('request.headers', '{"x-real-ip":" 2.2.2.2 ","x-forwarded-for":"9.9.9.9, 3.3.3.3"}', true);
  perform tests.eq(private.client_ip(), '2.2.2.2', 'then x-real-ip (trimmed)');
  perform set_config('request.headers', '{"x-forwarded-for":"9.9.9.9, 8.8.8.8 ,3.3.3.3"}', true);
  perform tests.eq(private.client_ip(), '3.3.3.3', 'then the RIGHTMOST x-forwarded-for entry');
  perform set_config('request.headers', '{"x-forwarded-for":"2001:DB8::1"}', true);
  perform tests.eq(private.client_ip(), '2001:db8::1', 'single entry, lowercased');
  perform set_config('request.headers', '{"cf-connecting-ip":"","x-forwarded-for":""}', true);
  perform tests.eq(private.client_ip(), 'unknown', 'empty headers -> unknown');
  perform set_config('request.headers', '{}', true);
  perform tests.eq(private.client_ip(), 'unknown', 'no header -> unknown');
  perform set_config('request.headers', '', true);
  perform tests.eq(private.client_ip(), 'unknown', 'GUC reset on a pooled connection -> unknown');
  perform set_config('request.headers', json_build_object('x-real-ip', repeat('a', 500))::text, true);
  perform tests.eq(char_length(private.client_ip()), 64, 'bounded length');
  perform set_config('request.headers', '{"x-forwarded-for":"5.5.5.5"}', true); ip := private.client_ip_hash();
  perform set_config('request.headers', '{"x-forwarded-for":"6.6.6.6"}', true); ip2 := private.client_ip_hash();
  perform tests.check(ip ~ '^[0-9a-f]{64}$' and ip <> ip2, 'hashed, distinct per IP');
  perform set_config('request.headers', '', true);
  perform tests.pass('client_ip precedence (H2)');

  -- ---------- spoofing the leftmost XFF entry does not create new buckets ----------
  perform tests.reset_rate();
  for i in 1..4 loop
    u := tests.new_user();
    perform tests.login_headers(u, jsonb_build_object('x-forwarded-for', '10.9.9.' || i || ', 7.7.7.7'));
    v := public.upsert_profile('HR Giả ' || i, 'hr', 'Corp ' || i);
    perform tests.logout();
    if i <= 3 then perform tests.ok(v, 'hr signup ' || i); else perform tests.err(v, 'IP_LIMIT', 'rotating leftmost XFF does not help'); end if;
  end loop;
  -- fail closed: header-less callers share ONE bucket
  for i in 1..4 loop
    u := tests.new_user();
    perform tests.login_headers(u, '{}'::jsonb);
    v := public.upsert_profile('HR Không IP ' || i, 'hr', 'Corp ' || i);
    perform tests.logout();
    if i <= 3 then perform tests.ok(v, 'no-IP signup ' || i); else perform tests.err(v, 'IP_LIMIT', 'unknown bucket is shared (fail closed)'); end if;
  end loop;
  -- cf-connecting-ip separates users behind the same proxy hop
  for i in 1..4 loop
    u := tests.new_user();
    perform tests.login_headers(u, jsonb_build_object('cf-connecting-ip', '100.64.0.' || i, 'x-forwarded-for', '7.7.7.7'));
    perform tests.ok(public.upsert_profile('HR CF ' || i, 'hr', 'Corp ' || i), 'cf signup ' || i);
    perform tests.logout();
  end loop;
  perform tests.check(not exists (select 1 from private.rate_hits where key like '%7.7.7.7%' or key like '%10.9.9.%'), 'raw IPs never stored');
  perform tests.pass('IP limits: trusted hop, fail closed');

  -- ---------- love per IP per VN day ----------
  perform tests.reset_rate();
  c := tests.mk_candidate('Nhận Tim', 'qa'); cu := tests.cand_user(c);
  u := tests.mk_profile('Người Thả Tim', 'viewer');
  perform tests.login(u, '4.4.4.4'); perform tests.ok(public.drop_gift(c, 'love'), 'love'); perform tests.logout();
  perform tests.check((select bucket = (private.vn_today()::timestamp at time zone 'Asia/Ho_Chi_Minh')
                         from private.rate_hits where key like 'love_ip:%'), 'love_ip bucket = VN midnight');
  perform tests.pass('love per IP on the VN day');

  -- ---------- H3: upsert_profile 5/min per user ----------
  perform tests.reset_rate();
  u := tests.new_user();
  perform tests.login(u);
  for i in 1..5 loop perform tests.ok(public.upsert_profile('Hay Đổi', 'viewer', null, jsonb_build_object('skin', i)), 'profile upsert ' || i); end loop;
  v := public.upsert_profile('Hay Đổi', 'viewer');
  perform tests.err(v, 'RATE_LIMITED', 'profile upsert 6');
  perform tests.eq((v->>'retryAfterSec')::int, 60, 'retryAfterSec 60');
  perform tests.err(public.upsert_profile('x', 'viewer'), 'VALIDATION', 'validation still first', 'display_name');
  perform tests.logout();
  perform tests.pass('upsert_profile rate limit');

  -- ---------- H3: set_my_candidate_status 4/min per user ----------
  perform tests.reset_rate();
  perform tests.login(cu);
  perform tests.ok(public.set_my_candidate_status('hidden'), 'status 1');
  perform tests.ok(public.set_my_candidate_status('sitting'), 'status 2');
  perform tests.ok(public.set_my_candidate_status('hidden'), 'status 3');
  perform tests.ok(public.set_my_candidate_status('sitting'), 'status 4');
  v := public.set_my_candidate_status('hidden');
  perform tests.err(v, 'RATE_LIMITED', 'status 5');
  perform tests.eq((v->>'retryAfterSec')::int, 60, 'status retryAfterSec 60');
  perform tests.err(public.set_my_candidate_status(null), 'VALIDATION', 'null status', 'status');
  perform tests.err(public.set_my_candidate_status('placed'), 'VALIDATION', 'placed', 'status');
  perform tests.logout();
  perform tests.pass('set_my_candidate_status rate limit');

  -- ---------- H3: no-op updates are not broadcast ----------
  perform tests.reset_rate();
  delete from realtime.messages;
  perform tests.login(cu);
  perform tests.ok(public.upsert_profile('Nhận Tim', 'candidate', null, '{"skin":1}'::jsonb), 'same profile');
  perform tests.eq((select count(*) from realtime.messages where topic = 'street')::int, 0, 'unchanged profile: no broadcast');
  perform tests.ok(public.upsert_profile('Nhận Tim', 'candidate', null, '{"skin":2}'::jsonb), 'new avatar');
  perform tests.eq((select count(*) from realtime.messages where event = 'candidate_upsert')::int, 1, 'changed avatar: one upsert');
  perform tests.ok(public.set_my_candidate_status('sitting'), 'sit while sitting');
  perform tests.eq((select count(*) from realtime.messages where topic = 'street')::int, 1, 'sitting -> sitting: no broadcast');
  perform tests.ok(public.set_my_candidate_status('hidden'), 'hide');
  perform tests.ok(public.set_my_candidate_status('hidden'), 'hide again');
  perform tests.eq((select count(*) from realtime.messages where event = 'candidate_remove')::int, 1, 'hidden -> hidden: no second remove');
  perform tests.ok(public.upsert_my_candidate(tests.cand_payload('backend', 'Biển ẩn sửa nhẹ')), 'edit while hidden');
  perform tests.eq((select count(*) from realtime.messages where topic = 'street')::int, 2, 'hidden edit: no broadcast');
  perform tests.logout();
  perform tests.reset_rate();
  perform tests.login(cu);
  perform tests.ok(public.set_my_candidate_status('sitting'), 'sit');
  perform tests.logout();
  delete from realtime.messages;
  perform tests.login(cu);
  perform tests.ok(public.upsert_my_candidate(tests.cand_payload('backend', 'Biển ẩn sửa nhẹ')), 'identical edit');
  perform tests.eq((select count(*) from realtime.messages where topic = 'street')::int, 0, 'identical candidate edit: no broadcast');
  perform tests.ok(public.upsert_my_candidate(tests.cand_payload('backend', 'Biển đổi thật rồi')), 'real edit');
  perform tests.eq((select count(*) from realtime.messages where event = 'candidate_upsert')::int, 1, 'changed sign: one upsert');
  perform tests.logout();
  perform tests.pass('no-op broadcasts suppressed');

  -- ---------- L4: rate_hits retention (deterministic purge, at most every 5 min) ----------
  delete from private.rate_hits;
  insert into private.rate_hits(key, bucket, n) values ('old', now() - interval '26 hours', 1), ('recent', now() - interval '24 hours', 1);
  update private.maint set at = '-infinity' where name = 'rate_purge';
  perform private.hit('probe', interval '1 minute', 5);
  perform tests.check(not exists (select 1 from private.rate_hits where key = 'old'), 'row older than 25 h purged');
  perform tests.check(exists (select 1 from private.rate_hits where key = 'recent'), '24 h old row kept');
  perform tests.check((select at = now() from private.maint where name = 'rate_purge'), 'purge time recorded');
  insert into private.rate_hits(key, bucket, n) values ('old2', now() - interval '30 hours', 1);
  perform private.hit('probe', interval '1 minute', 5);
  perform tests.check(exists (select 1 from private.rate_hits where key = 'old2'), 'no second purge within 5 min');
  update private.maint set at = now() - interval '6 minutes' where name = 'rate_purge';
  perform private.hit_day('probe_day', 5);
  perform tests.check(not exists (select 1 from private.rate_hits where key = 'old2'), 'purged again after 5 min');
  perform tests.check(exists (select 1 from pg_indexes where schemaname = 'private' and indexname = 'rate_hits_bucket_idx'), 'bucket index');
  perform tests.pass('rate_hits retention 25 h');
end $$;
rollback;
