-- Gifts (US-9 xu HR, US-12 xu tình thương): BR-C1..C5, BR-L1..L3, BR-SP1 ops/second, realtime emits.
\set ON_ERROR_STOP 1
begin;
do $$
declare
  hr uuid; hr2 uuid; viewer uuid; cu uuid; v jsonb; i int;
  cands uuid[] := '{}'; c uuid; s uuid;
begin
  hr := tests.mk_profile('HR Xu', 'hr', 'Tôm Corp');
  hr2 := tests.mk_profile('HR Hai', 'hr', 'Cua Corp');
  viewer := tests.mk_profile('Khách Xem', 'viewer');
  for i in 1..7 loop cands := cands || tests.mk_candidate('Ứng Viên ' || i, 'backend'); end loop;
  s := tests.mk_sample('Mẫu Một');
  delete from realtime.messages;

  -- auth/role checks
  perform tests.login_anon();
  begin
    perform public.drop_gift(cands[1], 'xu');
    raise exception 'FAIL: anon could call drop_gift';
  exception when insufficient_privilege then null;
  end;
  perform tests.logout();
  perform tests.login(tests.new_user());
  perform tests.err(public.drop_gift(cands[1], 'love'), 'NO_PROFILE', 'no profile');
  perform tests.logout();
  perform tests.login(viewer);
  perform tests.err(public.drop_gift(cands[1], 'xu'), 'WRONG_ROLE', 'viewer cannot drop HR xu (BR-C3)');
  perform tests.logout();
  cu := tests.cand_user(cands[1]);
  perform tests.login(cu);
  perform tests.err(public.drop_gift(cands[2], 'xu'), 'WRONG_ROLE', 'candidate cannot drop HR xu');
  perform tests.err(public.drop_gift(cands[1], 'love'), 'SELF_ACTION', 'self love (BR-L1)');
  perform tests.logout();
  perform tests.login(hr);
  perform tests.err(public.drop_gift(gen_random_uuid(), 'xu'), 'NOT_FOUND', 'unknown candidate');
  perform tests.logout();
  perform tests.pass('drop_gift auth/role/self checks');

  -- BR-C2: 2 xu per candidate per day; BR-C1: 10 per day
  perform tests.login(hr);
  v := tests.ok(public.drop_gift(cands[1], 'xu'), 'xu 1');
  perform tests.eq((v->>'remainingToday')::int, 9, 'remainingToday');
  perform tests.eq((v->>'remainingForCandidate')::int, 1, 'remainingForCandidate');
  perform tests.ok(public.drop_gift(cands[1], 'xu'), 'xu 2');
  perform tests.err(public.drop_gift(cands[1], 'xu'), 'LIMIT_PER_CANDIDATE_DAY', 'xu 3 same candidate');
  perform tests.logout();
  perform tests.pass('BR-C2 2 xu/candidate/day');

  -- BR-SP1: <= 5 gift ops per second (now() is constant inside this transaction -> same 1 s bucket)
  perform tests.reset_rate();
  perform tests.login(hr);
  for i in 1..5 loop perform public.drop_gift(cands[2], 'xu'); end loop;   -- 2 ok + 3 LIMIT_PER_CANDIDATE_DAY, all count as ops
  perform tests.err(public.drop_gift(cands[3], 'xu'), 'RATE_LIMITED', '6th op in the same second');
  perform tests.eq((public.drop_gift(cands[3], 'xu')->>'retryAfterSec')::int, 1, 'retryAfterSec 1');
  perform tests.logout();
  perform tests.pass('BR-SP1 gift ops per second');

  perform tests.reset_rate();
  perform tests.login(hr);
  -- used: c1 x2, c2 x2 = 4. Add c3 x2, c4 x2, c5 x2 = 10
  for i in 3..5 loop
    perform tests.reset_rate(); perform tests.ok(public.drop_gift(cands[i], 'xu'), 'xu c' || i || 'a');
    perform tests.reset_rate(); perform tests.ok(public.drop_gift(cands[i], 'xu'), 'xu c' || i || 'b');
  end loop;
  perform tests.reset_rate();
  perform tests.err(public.drop_gift(cands[6], 'xu'), 'LIMIT_DAILY', '11th xu of the day');
  perform tests.eq((public.get_me()->'quota'->>'xu_used')::int, 10, 'get_me xu_used');
  v := public.get_candidate(cands[1]::text);
  perform tests.eq((v->'me'->>'xu_today')::int, 2, 'get_candidate me.xu_today');
  perform tests.logout();
  perform tests.eq((select count(*) from public.gifts where giver_id = hr and kind = 'xu')::int, 10, 'audit rows (BR-C5)');
  perform tests.eq((select sum(xu) from public.candidate_daily)::int, 10, 'candidate_daily buckets');
  perform tests.eq((select xu_total from public.candidates where id = cands[1]), 2, 'xu_total');
  -- another HR has its own quota
  perform tests.login(hr2);
  perform tests.ok(public.drop_gift(cands[6], 'xu'), 'hr2 independent quota');
  perform tests.logout();
  perform tests.pass('BR-C1 10 xu/day per HR');

  -- day rollover: yesterday's gifts do not count
  update public.gifts set day = day - 1 where giver_id = hr;
  perform tests.reset_rate();
  perform tests.login(hr);
  perform tests.ok(public.drop_gift(cands[1], 'xu'), 'new VN day resets quota');
  perform tests.logout();
  perform tests.pass('quota resets per VN day');

  -- BR-C4: placed / hidden candidates cannot receive
  update public.candidates set status = 'placed' where id = cands[7];
  perform tests.reset_rate();
  perform tests.login(hr2);
  perform tests.err(public.drop_gift(cands[7], 'xu'), 'CANDIDATE_UNAVAILABLE', 'placed candidate');
  perform tests.err(public.drop_gift(cands[7], 'love'), 'CANDIDATE_UNAVAILABLE', 'placed candidate love');
  -- sample candidates can receive xu (no notification target)
  perform tests.ok(public.drop_gift(s, 'xu'), 'sample candidate xu');
  perform tests.logout();
  perform tests.pass('BR-C4 unavailable candidates');

  -- BR-L1 love: 5/day, 1/candidate/day, anyone with a profile (viewer/candidate/HR)
  perform tests.reset_rate();
  perform tests.login(viewer);
  perform tests.ok(public.drop_gift(cands[1], 'love'), 'love 1');
  perform tests.err(public.drop_gift(cands[1], 'love'), 'LIMIT_PER_CANDIDATE_DAY', 'love twice same candidate');
  for i in 2..5 loop perform tests.reset_rate(); perform tests.ok(public.drop_gift(cands[i], 'love'), 'love ' || i); end loop;
  perform tests.reset_rate();
  perform tests.err(public.drop_gift(cands[6], 'love'), 'LIMIT_DAILY', 'love 6');
  perform tests.logout();
  perform tests.login(cu);
  perform tests.ok(public.drop_gift(cands[2], 'love'), 'candidate can give love');
  perform tests.logout();
  perform tests.login(hr);   -- HR has separate love quota beside xu
  perform tests.ok(public.drop_gift(cands[2], 'love'), 'hr love');
  perform tests.logout();
  perform tests.eq((select love_total from public.candidates where id = cands[2]), 3, 'love_total');
  perform tests.pass('BR-L1 love limits');

  -- BR-L3: <= 30 love per IP per day (hashed IP)
  perform tests.reset_rate();
  for i in 1..7 loop
    declare u uuid := tests.mk_profile('Clone ' || i, 'viewer'); j int;
    begin
      for j in 1..5 loop
        perform tests.login(u, '192.0.2.50');
        v := public.drop_gift(cands[j], 'love');
        perform tests.logout();
        delete from private.rate_hits where key like 'gift_s:%';
        if (i - 1) * 5 + j <= 30 then perform tests.ok(v, 'ip love ' || ((i - 1) * 5 + j));
        else perform tests.err(v, 'IP_LIMIT', 'ip love over 30'); end if;
      end loop;
    end;
  end loop;
  perform tests.pass('BR-L3 love per IP per day');

  -- realtime: gift events on street + notification on inbox:<candidate uid>
  perform tests.check(exists (select 1 from realtime.messages m where m.topic = 'street' and m.event = 'gift' and m.private
      and m.extension = 'broadcast' and m.payload->>'kind' = 'xu' and m.payload->'giver'->>'company' = 'Tôm Corp'
      and m.payload->'candidate'->>'id' = cands[1]::text and m.payload ? 'at'), 'street gift event');
  perform tests.check(exists (select 1 from realtime.messages m where m.topic = 'inbox:' || cu::text and m.event = 'notification'
      and m.private and m.payload->>'type' = 'gift'), 'inbox notification');
  perform tests.eq((select count(*) from realtime.messages m where m.topic like 'inbox:%' and m.topic <> 'inbox:' || cu::text
      and m.payload->'payload'->>'candidateId' = cands[1]::text)::int, 0, 'no inbox to others for c1');
  perform tests.check(not exists (select 1 from realtime.messages where topic like 'inbox:%' and payload->'payload'->>'candidateId' = s::text),
      'sample candidate gets no inbox message');
  perform tests.eq((select count(*) from public.notifications where user_id = cu and type = 'gift')::int,
                   (select count(*) from public.gifts where candidate_id = cands[1])::int, 'one notification per gift');
  perform tests.pass('gift realtime topics');

  -- hide_from_ticker: street event uses anonymous name
  update public.candidates set hide_from_ticker = true where id = cands[6];
  perform tests.reset_rate();
  perform tests.login(hr2);
  perform tests.ok(public.drop_gift(cands[6], 'xu'), 'xu to hidden-ticker cand');
  perform tests.logout();
  -- 0002 (sec L1): no candidate id / zone in the street event either
  perform tests.check(exists (select 1 from realtime.messages where topic = 'street' and event = 'gift'
      and payload->'candidate' = '{"name": "một bạn ẩn danh"}'::jsonb and not (payload::text like '%' || cands[6]::text || '%')), 'ticker anonymised');
  perform tests.pass('hide_from_ticker');
end $$;
rollback;
