'use client';

import { useMemo } from 'react';
import type { CandidateCard } from '@/backend/types';
import { ZONE_LIST, ZONES } from '@/lib/zones';
import { rankInZone } from '@/lib/seats';
import { sitDays } from '@/lib/format';
import { useNow } from '@/hooks/useNow';
import { useSession } from '@/state/session';
import { useUi } from '@/state/ui';
import { useWorld } from '@/state/world';

function Row({ c, seat, rank, queued, now }: { c: CandidateCard; seat: number | null; rank: number | null; queued?: boolean; now: number }) {
  const setPanel = useUi((s) => s.setPanel);
  const mine = useSession((s) => s.me?.candidate?.id === c.id);
  return (
    <button className={`cand-row${queued ? ' queued' : ''}${mine ? ' mine' : ''}`} onClick={() => setPanel({ kind: 'candidate', id: c.id })}>
      <span className="seat" title={queued ? 'Hàng chờ phía sau' : `Ghế số ${seat}`}>
        {queued ? `#${rank}` : seat}
      </span>
      <span className="sign-card">{c.signState === 'ok' ? c.signText : 'Biển đang chờ duyệt'}</span>
      <span className="cand-meta">
        <strong>{c.displayName}</strong>
        {c.isSample && <span className="badge sample">Mẫu</span>}
        {mine && <span className="badge mine">Bạn</span>}
        <small>
          {c.title} · {c.yearsExp} năm · ngồi {sitDays(c, now)} ngày
        </small>
      </span>
      <span className="cand-stats" aria-label={`${c.totals.xu} xu, ${c.totals.love} xu tình thương`}>
        <span>🪙 {c.totals.xu}</span>
        <span>💛 {c.totals.love}</span>
      </span>
    </button>
  );
}

export function ListView2D() {
  const now = useNow();
  const candidates = useWorld((s) => s.candidates);
  const plan = useWorld((s) => s.plan);
  const loaded = useWorld((s) => s.loaded);
  const zone = useUi((s) => s.focusZone);
  const setZone = useUi((s) => s.setFocusZone);
  const setPanel = useUi((s) => s.setPanel);
  const role = useSession((s) => s.me?.profile.role);
  const hasCandidate = useSession((s) => !!s.me?.candidate);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of Object.values(candidates)) if (c.status === 'sitting') m[c.zone] = (m[c.zone] ?? 0) + 1;
    return m;
  }, [candidates]);

  const seated = plan.order[zone].filter((id) => plan.seats.has(id) && candidates[id]);
  const queue = plan.queue[zone].filter((id) => candidates[id]);
  const meta = ZONES[zone];

  return (
    <section className="list-view" aria-label="Danh sách ứng viên theo khu">
      <nav className="zone-tabs" aria-label="Chọn khu">
        {ZONE_LIST.map((z) => (
          <button
            key={z.id}
            className={`zone-chip${z.id === zone ? ' active' : ''}`}
            style={{ ['--zone' as string]: z.color }}
            onClick={() => setZone(z.id)}
            aria-pressed={z.id === zone}
          >
            <span aria-hidden>{z.emoji}</span> {z.short} <b>{counts[z.id] ?? 0}</b>
          </button>
        ))}
      </nav>

      <header className="zone-head" style={{ ['--zone' as string]: meta.color }}>
        <h2>
          {meta.emoji} {meta.name}
        </h2>
        <p>{meta.blurb}</p>
        <p className="dim">{counts[zone] ?? 0} người đang ngồi · ghế 1 gần đầu phố nhất</p>
      </header>

      {!loaded ? (
        <p className="dim">Đang trải chiếu...</p>
      ) : seated.length === 0 && queue.length === 0 ? (
        <div className="empty card">
          <p>Chưa ai ngồi — bạn là người đầu tiên?</p>
          {role === 'candidate' && !hasCandidate && (
            <button className="btn primary" onClick={() => setPanel({ kind: 'form' })}>
              Ra ngồi ngay
            </button>
          )}
        </div>
      ) : (
        <div className="cand-list">
          {seated.map((id) => (
            <Row key={id} c={candidates[id]} seat={plan.seats.get(id)!.seat} rank={rankInZone(plan, id)} now={now} />
          ))}
          {queue.length > 0 && <h3 className="queue-title">Hàng chờ phía sau</h3>}
          {queue.map((id) => (
            <Row key={id} c={candidates[id]} seat={null} rank={rankInZone(plan, id)} queued now={now} />
          ))}
        </div>
      )}
    </section>
  );
}
