-- Realtime authorization (private channels): RLS on realtime.messages, evaluated the way the Realtime server does it
-- (role authenticated + request.jwt.claims + realtime.topic set, then SELECT / INSERT on realtime.messages).
\set ON_ERROR_STOP 1
begin;
do $$
declare u uuid; u2 uuid; hr uuid; c uuid; t text; ok boolean; n int;
begin
  u := tests.mk_profile('Người Xem', 'viewer');
  u2 := tests.mk_profile('Người Khác', 'viewer');
  hr := tests.mk_profile('HR Phát', 'hr', 'Tôm Corp');
  c := tests.mk_candidate('Ứng Viên RT', 'mobile');
  delete from realtime.messages;
  perform tests.login(hr);
  perform tests.ok(public.drop_gift(c, 'xu'), 'gift');
  perform tests.logout();
  perform tests.eq((select count(*) from realtime.messages)::int, 2, 'gift produced exactly 2 messages');
  perform tests.eq((select count(*) from realtime.messages where topic = 'street' and event = 'gift' and private and extension = 'broadcast')::int, 1, 'street gift');
  perform tests.eq((select count(*) from realtime.messages where topic = 'inbox:' || tests.cand_user(c)::text and event = 'notification' and private)::int, 1, 'inbox msg');
  -- payload contract (StreetEvent 'gift' in src/backend/types.ts)
  perform tests.check((select payload ?& array['type','at','id','kind','giver','candidate'] from realtime.messages where topic = 'street'), 'street payload keys');
  perform tests.check((select payload ?& array['id','type','payload','createdAt'] from realtime.messages where topic like 'inbox:%'), 'inbox payload keys');
  perform tests.pass('gift -> realtime.messages rows with right topics');

  -- ---------- channel join (SELECT policy) ----------
  -- probe rows (inserted by the owner) on several topics; a client may only see rows of topics it is authorized for
  insert into realtime.messages(topic, extension, payload, event, private)
  select x, 'broadcast', '{}', 'probe', true from unnest(array['street', 'pos:backend', 'inbox:' || u::text, 'inbox:' || u2::text, 'secret']) x;

  foreach t in array array['street', 'pos:backend', 'inbox:' || u::text] loop
    perform tests.login(u);
    perform set_config('realtime.topic', t, true);
    select count(*) into n from realtime.messages where topic = t and event = 'probe';
    perform tests.logout();
    perform tests.eq(n, 1, 'can read ' || t);
  end loop;
  foreach t in array array['inbox:' || u2::text, 'secret'] loop
    perform tests.login(u);
    perform set_config('realtime.topic', t, true);
    select count(*) into n from realtime.messages where event = 'probe';
    perform tests.logout();
    perform tests.eq(n, 0, 'cannot read ' || t);
  end loop;
  perform tests.login_anon();
  perform set_config('realtime.topic', 'street', true);
  select count(*) into n from realtime.messages;
  perform tests.logout();
  perform tests.eq(n, 0, 'anon cannot join private street');
  perform tests.pass('realtime read policy (street, pos:*, own inbox only)');

  -- ---------- client send (INSERT policy) ----------
  for t, ok in select * from (values ('street:broadcast', false), ('street:presence', true), ('pos:backend:broadcast', true),
                                     ('pos:backend:presence', true), ('inbox:me:broadcast', false), ('inbox:other:broadcast', false),
                                     ('inbox:me:presence', false), ('secret:broadcast', false), ('pos:backend:postgres_changes', false)) x(a, b) loop
    declare topic text := split_part(t, ':', 1); ext text := reverse(split_part(reverse(t), ':', 1));
    begin
      if topic = 'pos' then topic := 'pos:backend'; end if;
      if topic = 'inbox' then topic := 'inbox:' || case when t like 'inbox:me:%' then u::text else u2::text end; end if;
      perform tests.login(u);
      perform set_config('realtime.topic', topic, true);
      begin
        insert into realtime.messages(topic, extension, payload, event, private) values (topic, ext, '{"type":"gift"}', 'gift', true);
        perform tests.logout();
        if not ok then raise exception 'FAIL: client could send % on %', ext, topic; end if;
      exception when insufficient_privilege then   -- "new row violates row-level security policy"
        perform tests.logout();
        if ok then raise exception 'FAIL: client could not send % on %', ext, topic; end if;
      end;
    end;
  end loop;
  perform tests.pass('realtime write policy (clients cannot send on street/inbox:*)');

  -- anon cannot send anywhere
  perform tests.login_anon();
  perform set_config('realtime.topic', 'pos:backend', true);
  begin
    insert into realtime.messages(topic, extension, payload, event, private) values ('pos:backend', 'broadcast', '{}', 'pose', true);
    raise exception 'FAIL: anon could send on pos:backend';
  exception when insufficient_privilege then null;
  end;
  perform tests.logout();
  perform tests.pass('anon cannot send');
end $$;
rollback;
