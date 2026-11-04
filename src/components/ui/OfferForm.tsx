'use client';

import { useEffect, useState } from 'react';
import { errorMessage } from '@/lib/messages';
import { LIMITS } from '@/lib/rules';
import { playOffer, unlockAudio } from '@/audio/sfx';
import { useSession } from '@/state/session';
import { useUi } from '@/state/ui';
import { Modal } from './Modal';

export function OfferForm({ id }: { id: string }) {
  const backend = useSession((s) => s.backend);
  const refreshMe = useSession((s) => s.refreshMe);
  const setPanel = useUi((s) => s.setPanel);
  const toast = useUi((s) => s.toast);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [pkg, setPkg] = useState('');
  const [message, setMessage] = useState('');
  const [showCompany, setShowCompany] = useState(false);
  const [err, setErr] = useState<{ field?: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const r = LIMITS.offer;

  useEffect(() => {
    void backend?.getCandidate(id).then((c) => setName(c?.displayName ?? ''));
  }, [backend, id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backend || busy) return;
    unlockAudio();
    setBusy(true);
    setErr(null);
    const res = await backend.sendOffer(id, { position, package: pkg, message: message || undefined, showCompany });
    setBusy(false);
    if (!res.ok) {
      setErr({ field: res.field, text: errorMessage(res.error, res.field) });
      return;
    }
    playOffer();
    toast({ tone: 'offer', text: `Đã gửi offer bao trọn ${name}. Chờ bạn ấy trả lời nhé.`, prominent: true });
    await refreshMe();
    setPanel({ kind: 'candidate', id });
  };

  return (
    <Modal title={`Bao trọn ${name || 'ứng viên'}`}>
      <form onSubmit={submit} noValidate>
        <label className="field">
          <span>Vị trí (tối đa {r.positionMax} ký tự)</span>
          <input value={position} onChange={(e) => setPosition(e.target.value)} maxLength={r.positionMax + 20} aria-invalid={err?.field === 'position'} />
          {err?.field === 'position' && <em className="error">{err.text}</em>}
        </label>
        <label className="field">
          <span>Mức lương / gói đãi ngộ (tối đa {r.packageMax} ký tự)</span>
          <input value={pkg} onChange={(e) => setPkg(e.target.value)} maxLength={r.packageMax + 20} aria-invalid={err?.field === 'package'} />
          {err?.field === 'package' && <em className="error">{err.text}</em>}
        </label>
        <label className="field">
          <span>Lời nhắn (tùy chọn, tối đa {r.messageMax} ký tự)</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={r.messageMax + 50} />
          {err?.field === 'message' && <em className="error">{err.text}</em>}
        </label>
        <label className="check">
          <input type="checkbox" checked={showCompany} onChange={(e) => setShowCompany(e.target.checked)} />
          <span>Đồng ý hiện tên công ty trên Tường vinh danh (nếu ứng viên cũng đồng ý)</span>
        </label>
        {err && !err.field && <em className="error">{err.text}</em>}
        <div className="actions">
          <button className="btn accent" disabled={busy}>{busy ? 'Đang gửi...' : 'Gửi offer'}</button>
          <button type="button" className="btn ghost" onClick={() => setPanel({ kind: 'candidate', id })}>Quay lại</button>
        </div>
      </form>
    </Modal>
  );
}
