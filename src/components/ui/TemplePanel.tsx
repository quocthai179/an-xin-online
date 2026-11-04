'use client';

import { useMemo, useState } from 'react';
import type { Fortune } from '@/lib/fortune';
import { FORTUNE_DISCLAIMER, selectFortune, TIER_LABELS } from '@/lib/fortune';
import { errorMessage } from '@/lib/messages';
import { playIncense, unlockAudio } from '@/audio/sfx';
import { useSession } from '@/state/session';
import { useUi } from '@/state/ui';
import { useWorld } from '@/state/world';
import { fortuneSharePath } from '@/lib/shareData';
import { Modal } from './Modal';
import { ShareSheet } from './ShareSheet';

function FortuneCard({ f, day, name }: { f: Fortune; day: string; name: string }) {
  const toast = useUi((s) => s.toast);
  const text = `Quẻ ${TIER_LABELS[f.tier]} · ${f.name}\n${f.verdict}\nLời khuyên: ${f.advice}\n(${name}, ${day}) · ${FORTUNE_DISCLAIMER} · Phố Xin Việc 3D`;
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Quẻ ${f.name}`, text });
        return;
      } catch {
        /* fall through to clipboard */
      }
    }
    await navigator.clipboard?.writeText(text);
    toast({ tone: 'info', text: 'Đã copy quẻ để bạn dán khoe.' });
  };
  return (
    <article className={`fortune tier-${f.tier}`} aria-live="polite">
      <small>{day}</small>
      <h3>{f.name}</h3>
      <strong className="tier">{TIER_LABELS[f.tier]}</strong>
      <p>{f.verdict}</p>
      <p className="advice">Lời khuyên: {f.advice}</p>
      <p className="dim">{FORTUNE_DISCLAIMER}</p>
      <button className="btn small" onClick={share}>Chép nội dung quẻ</button>
      <ShareSheet
        path={fortuneSharePath(f.id, name, day)}
        imagePath={`/api/og/q/${f.id}?n=${encodeURIComponent(name)}&d=${day}`}
        title={`Quẻ ${f.name}`}
        text={`${name} xin được ${f.name} ở Phố Xin Việc 3D`}
        label="Chia sẻ quẻ"
      />
    </article>
  );
}

export function TemplePanel() {
  const backend = useSession((s) => s.backend);
  const me = useSession((s) => s.me);
  const refreshMe = useSession((s) => s.refreshMe);
  const incenseToday = useWorld((s) => s.incenseToday);
  const setIncense = useWorld((s) => s.setIncense);
  const candidates = useWorld((s) => s.candidates);
  const toast = useUi((s) => s.toast);
  const [target, setTarget] = useState('');
  const [shaking, setShaking] = useState(false);
  const [fortune, setFortune] = useState<{ f: Fortune; day: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const options = useMemo(
    () => Object.values(candidates).filter((c) => c.status === 'sitting' && c.id !== me?.candidate?.id).sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi')),
    [candidates, me?.candidate?.id],
  );
  const done = !!me?.quota.incenseDone;

  const light = async () => {
    if (!backend || busy) return;
    unlockAudio();
    setBusy(true);
    const r = await backend.lightIncense(target || undefined);
    setBusy(false);
    if (!r.ok) {
      toast({ tone: 'error', text: errorMessage(r.error, r.field) });
    } else {
      playIncense();
      setIncense(r.data.incenseToday);
      toast({ tone: 'info', text: 'Nhang đã thắp, khói bay lên. Cầu cho job về như nước 🪔' });
    }
    await refreshMe();
  };

  const draw = async () => {
    if (!backend || shaking) return;
    unlockAudio();
    setShaking(true);
    setFortune(null);
    const [r] = await Promise.all([backend.getFortune(), new Promise((res) => setTimeout(res, 2500))]);
    setShaking(false);
    if (!r.ok) return toast({ tone: 'error', text: errorMessage(r.error) });
    setFortune({ f: selectFortune(r.data), day: r.data.day });
  };

  return (
    <Modal title="Đền Xin Việc">
      <section className="temple">
        <h3>🪔 Thắp nhang cầu job</h3>
        <p>Hôm nay đã có <strong>{incenseToday}</strong> nén nhang. Nhang chỉ để vui, không cộng điểm xếp hạng.</p>
        {me?.profile.role !== 'candidate' || options.length > 0 ? (
          <label className="field">
            <span>Cầu cho ai?</span>
            <select value={target} onChange={(e) => setTarget(e.target.value)} disabled={done}>
              <option value="">{me?.candidate ? 'Chính mình' : 'Cầu chung cho cả phố'}</option>
              {options.map((c) => <option key={c.id} value={c.id}>{c.displayName}{c.isSample ? ' (Mẫu)' : ''}</option>)}
            </select>
          </label>
        ) : null}
        <button className="btn primary" onClick={light} disabled={busy || done || !me}>
          {done ? 'Mai thắp tiếp nhé' : 'Thắp nhang'}
        </button>
      </section>

      <section className="temple">
        <h3>🎋 Xin quẻ</h3>
        <p className="dim">Mỗi ngày một quẻ, không xin lại được. Bấm lại vẫn ra đúng quẻ cũ.</p>
        <div className={`tube${shaking ? ' shake' : ''}`} aria-hidden>🎋</div>
        <button className="btn accent" onClick={draw} disabled={shaking || !me}>
          {shaking ? 'Đang lắc ống xăm...' : 'Xin quẻ hôm nay'}
        </button>
        {fortune && <FortuneCard f={fortune.f} day={fortune.day} name={me?.profile.displayName ?? 'Một người qua đường'} />}
      </section>
    </Modal>
  );
}
