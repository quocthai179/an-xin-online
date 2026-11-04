'use client';

import { useMemo, useState } from 'react';
import type { CandidateCard } from '@/backend/types';
import { ZONES } from '@/lib/zones';
import { useNow } from '@/hooks/useNow';
import { useUi } from '@/state/ui';
import { toRanked, useWorld } from '@/state/world';
import { compareRanked } from '@/lib/ranking';
import { Modal } from './Modal';

type Tab = 'top' | 'week' | 'wall';

export function Leaderboard() {
  const now = useNow();
  const candidates = useWorld((s) => s.candidates);
  const setPanel = useUi((s) => s.setPanel);
  const [tab, setTab] = useState<Tab>('top');

  const lists = useMemo(() => {
    const all = Object.values(candidates);
    const sitting = all.filter((c) => c.status === 'sitting');
    const top = sitting
      .map((c) => ({ c, r: toRanked(c, now) }))
      .sort((a, b) => compareRanked(a.r, b.r))
      .slice(0, 10)
      .map((x) => x.c);
    const week = sitting.filter((c) => c.xuWeek > 0).sort((a, b) => b.xuWeek - a.xuWeek || (a.id < b.id ? -1 : 1)).slice(0, 10);
    const wall = all.filter((c) => c.status === 'placed').sort((a, b) => Date.parse(b.placedAt ?? '0') - Date.parse(a.placedAt ?? '0')).slice(0, 20);
    return { top, week, wall };
  }, [candidates, now]);

  const list: CandidateCard[] = lists[tab];
  const open = (id: string) => setPanel({ kind: 'candidate', id });

  return (
    <Modal title="Bảng xếp hạng">
      <div className="tabs" role="tablist">
        {([['top', 'Đầu phố'], ['week', 'Top xu tuần'], ['wall', 'Tường vinh danh']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="dim">{tab === 'wall' ? 'Chưa ai được bao. Người đầu tiên sẽ lên tường danh dự!' : 'Chưa có ai trong bảng.'}</p>
      ) : (
        <ol className="board">
          {list.map((c, i) => (
            <li key={c.id}>
              <button onClick={() => open(c.id)}>
                <span className="pos">{i + 1}</span>
                <span className="grow">
                  <strong>{c.displayName}</strong>
                  {c.isSample && <span className="badge sample">Mẫu</span>}
                  <small>{tab === 'wall' ? `Được bao${c.placedCompany ? ` bởi ${c.placedCompany}` : ''}` : `${ZONES[c.zone].short} · ${c.title}`}</small>
                </span>
                <span>{tab === 'week' ? `🪙 ${c.xuWeek} xu tuần này` : `🪙 ${c.totals.xu}`}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}
