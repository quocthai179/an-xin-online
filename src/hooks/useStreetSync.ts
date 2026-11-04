'use client';

import { useEffect } from 'react';
import { createBackend } from '@/backend';
import type { AppNotification, PeerMeta } from '@/backend/types';
import { NotificationAggregator } from '@/lib/notify';
import { notifView } from '@/lib/notifText';
import { playSound } from '@/audio/sfx';
import { useSession } from '@/state/session';
import { useUi } from '@/state/ui';
import { useWorld } from '@/state/world';

const TITLE = 'Phố Xin Việc 3D';

/** Creates the backend once and restores the session. */
export function useBoot(): void {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const backend = await createBackend();
      if (cancelled) return;
      useSession.getState().setBackend(backend);
      useSession.getState().setMe(await backend.restore());
      useSession.getState().setReady();
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}

/** Loads the street, subscribes to live events, ticks seats every 60 s, joins presence, handles notifications. */
export function useStreetSync(): void {
  const backend = useSession((s) => s.backend);
  const uid = useSession((s) => s.me?.profile.id ?? null);

  // street data + live events
  useEffect(() => {
    if (!backend) return;
    let alive = true;
    const load = async () => {
      const list = await backend.listCandidates();
      if (alive) useWorld.getState().setAll(list, Date.now());
      const t = await backend.getTempleStats();
      if (alive) useWorld.getState().setIncense(t.incenseToday);
    };
    void load();
    const off = backend.onStreetEvent((e) => {
      useWorld.getState().apply(e, Date.now());
      if (e.type === 'incense') useWorld.getState().setIncense(useWorld.getState().incenseToday + 1);
      if (e.type === 'placed') useUi.getState().toast({ tone: 'offer', text: `${e.candidate.displayName} vừa được bao${e.company ? ` bởi ${e.company}` : ''}! 🎉` });
    });
    const tick = setInterval(() => {
      const w = useWorld.getState();
      const myId = useSession.getState().me?.candidate?.id;
      const before = myId ? w.plan.seats.get(myId)?.seat : undefined;
      w.recompute(Date.now());
      const after = myId ? useWorld.getState().plan.seats.get(myId)?.seat : undefined;
      if (before && after && after < before) {
        useUi.getState().toast({ tone: 'info', text: `Bạn được lên ghế số ${after}! Ngồi lì có ngày lên hương.` });
      }
    }, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        document.title = TITLE;
        void load();
        void useSession.getState().refreshMe();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      off();
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [backend]);

  // presence (online counter; 3D phase will publish poses)
  useEffect(() => {
    if (!backend || !uid) return;
    const me = useSession.getState().me;
    if (!me) return;
    const meta: PeerMeta = { uid, name: me.profile.displayName, role: me.profile.role, company: me.profile.company, avatar: me.profile.avatar };
    const off = backend.presence.subscribe({
      onPose: () => undefined,
      onLeave: () => undefined,
      onReaction: () => undefined,
      onCount: (n) => useWorld.getState().setOnline(n),
    });
    void backend.presence.join(meta, 'plaza');
    return () => {
      off();
      void backend.presence.leave();
    };
  }, [backend, uid]);

  // notifications: toast + leng keng
  useEffect(() => {
    if (!backend || !uid) return;
    const agg = new NotificationAggregator();
    const off = backend.onNotification((n: AppNotification) => {
      const act = agg.push(n, Date.now());
      const v = notifView(n);
      const ui = useUi.getState();
      if (act.kind === 'aggregate') {
        ui.toast({ key: 'agg-gift', tone: 'coin', text: `+${act.count} xu vừa rơi vào nón của bạn! 🪙` });
      } else {
        const tone = v.sound === 'offer' ? 'offer' : v.sound === 'note' ? 'note' : v.sound === 'love' ? 'love' : v.sound === 'coin' ? 'coin' : 'info';
        ui.toast({
          tone,
          text: v.text,
          prominent: v.prominent,
          action: v.action ? { label: v.action.label, panel: { kind: 'inbox' } } : undefined,
        });
      }
      if (act.sound) playSound(v.sound);
      if (document.hidden) {
        document.title = '(1) Leng keng! — ' + TITLE;
        navigator.vibrate?.([30, 40, 30]);
      }
      void useSession.getState().refreshMe();
    });
    return off;
  }, [backend, uid]);
}
