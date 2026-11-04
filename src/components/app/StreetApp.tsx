'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { useBoot, useStreetSync } from '@/hooks/useStreetSync';
import { visitSpot } from '@/lib/layout';
import { zoneIndex } from '@/lib/zones';
import { initialView } from '@/scene-lib/capability';
import { requestTeleport } from '@/state/input';
import { useSession } from '@/state/session';
import { useUi } from '@/state/ui';
import { useWorld } from '@/state/world';
import { AccountPanel } from '../ui/AccountPanel';
import { CandidateForm } from '../ui/CandidateForm';
import { CandidatePanel } from '../ui/CandidatePanel';
import { DemoBanner } from '../ui/DemoBanner';
import { Hud } from '../ui/Hud';
import { Inbox } from '../ui/Inbox';
import { InviteForm } from '../ui/InviteForm';
import { Leaderboard } from '../ui/Leaderboard';
import { ListView2D } from '../ui/ListView2D';
import { OfferForm } from '../ui/OfferForm';
import { Onboarding } from '../ui/Onboarding';
import { TemplePanel } from '../ui/TemplePanel';
import { Ticker } from '../ui/Ticker';
import { Toasts } from '../ui/Toasts';

/** The 3D street is a lazily loaded chunk; the 2D list stays as the fallback and the accessible view. */
const Scene = dynamic(() => import('../scene/Scene'), {
  ssr: false,
  loading: () => <p className="scene-loading">Đang dựng phố...</p>,
});
const SCENE_AVAILABLE = true;

function Panels() {
  const panel = useUi((s) => s.panel);
  switch (panel.kind) {
    case 'candidate':
      return <CandidatePanel key={panel.id} id={panel.id} />;
    case 'form':
      return <CandidateForm />;
    case 'inbox':
      return <Inbox />;
    case 'board':
      return <Leaderboard />;
    case 'temple':
      return <TemplePanel />;
    case 'invite':
      return <InviteForm id={panel.id} />;
    case 'offer':
      return <OfferForm id={panel.id} />;
    case 'account':
      return <AccountPanel />;
    default:
      return null;
  }
}

export function StreetApp() {
  useBoot();
  useStreetSync();
  const ready = useSession((s) => s.ready);
  const me = useSession((s) => s.me);
  const backend = useSession((s) => s.backend);
  const offline = useSession((s) => s.offline);
  const loaded = useWorld((s) => s.loaded);
  const setPanel = useUi((s) => s.setPanel);
  const [view, setView] = useState<'2d' | '3d'>(() => (typeof window === 'undefined' ? '2d' : initialView(window.location.search)));
  const deepLinked = useRef(false);

  // /?c=<slug> deep link: open that candidate once the street is loaded
  useEffect(() => {
    if (deepLinked.current || !ready || !me || !loaded) return;
    deepLinked.current = true;
    const slug = new URLSearchParams(window.location.search).get('c');
    if (!slug) return;
    const found = Object.values(useWorld.getState().candidates).find((c) => c.slug === slug);
    if (!found) return;
    const seat = useWorld.getState().plan.seats.get(found.id);
    if (seat) {
      const v = visitSpot(zoneIndex(seat.zone), seat.seat);
      requestTeleport(v.x, v.z, v.ry);
    }
    setPanel({ kind: 'candidate', id: found.id });
  }, [ready, me, loaded, setPanel]);

  if (!ready) {
    return (
      <main className="boot" aria-busy="true">
        <p>Đang trải chiếu cho phố...</p>
      </main>
    );
  }

  return (
    <div className="app">
      {backend?.mode === 'demo' && <DemoBanner />}
      {offline && (
        <div className="demo-banner offline-banner" role="status">
          Mất kết nối tới máy chủ, đang thử lại... Bạn vẫn xem được phố, nhưng thả xu hay gửi lời mời cần có mạng.
        </div>
      )}
      {!me ? (
        <main className="center">
          <Onboarding />
        </main>
      ) : (
        <>
          <Hud view={view} sceneAvailable={SCENE_AVAILABLE} onToggleView={() => setView(view === '2d' ? '3d' : '2d')} />
          {view === '3d' && SCENE_AVAILABLE ? (
            <main className="street-3d">
              <Scene />
            </main>
          ) : (
            <main className="street">
              <ListView2D />
            </main>
          )}
          <Ticker />
          <Panels />
        </>
      )}
      <Toasts />
    </div>
  );
}
