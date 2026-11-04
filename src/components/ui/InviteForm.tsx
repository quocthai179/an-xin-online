'use client';

import { useEffect, useState } from 'react';
import { errorMessage } from '@/lib/messages';
import { LIMITS } from '@/lib/rules';
import { playNote, unlockAudio } from '@/audio/sfx';
import { useSession } from '@/state/session';
import { useUi } from '@/state/ui';
import { Modal } from './Modal';

export function InviteForm({ id }: { id: string }) {
  const backend = useSession((s) => s.backend);
  const me = useSession((s) => s.me);
  const refreshMe = useSession((s) => s.refreshMe);
  const setPanel = useUi((s) => s.setPanel);
  const toast = useUi((s) => s.toast);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [err, setErr] = useState<{ field?: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  /** TOO_NEW: seconds until a new HR account may send a 500k (counts down) */
  const [wait, setWait] = useState(0);
  const r = LIMITS.invite;

  useEffect(() => {
    if (wait <= 0) return;
    const t = setInterval(() => setWait((w) => Math.max(0, w - 1)), 1000);
    return () => clearInterval(t);
  }, [wait > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void backend?.getCandidate(id).then((c) => setName(c?.displayName ?? ''));
  }, [backend, id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backend || busy) return;
    unlockAudio();
    setBusy(true);
    setErr(null);
    const res = await backend.sendInvitation(id, message, contact);
    setBusy(false);
    if (!res.ok) {
      if (res.error === 'TOO_NEW' && res.retryAfterSec) setWait(res.retryAfterSec);
      setErr({ field: res.field, text: errorMessage(res.error, res.field) });
      return;
    }
    playNote();
    toast({ tone: 'note', text: `Tờ 500k đã rơi vào nón của ${name}. Liên hệ sẽ mở khi bạn ấy gật đầu.` });
    await refreshMe();
    setPanel({ kind: 'candidate', id });
  };

  return (
    <Modal title={`Thả 500k cho ${name || 'ứng viên'}`}>
      <form onSubmit={submit} noValidate>
        <p className="dim">
          Còn {r.perDay - (me?.quota.inviteUsed ?? 0)}/{r.perDay} tờ hôm nay. Tờ 500k là xu ảo, nhưng lời mời phỏng vấn là thật nên hãy nghiêm túc nhé.
        </p>
        <p className="notice">Liên hệ của ứng viên chỉ mở sau khi bạn ấy nhận lời tờ 500k này.</p>
        <label className="field">
          <span>Lời nhắn ({r.messageMin}–{r.messageMax} ký tự)</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={r.messageMax + 50} rows={4} aria-invalid={err?.field === 'message'} />
          <small>{message.length}/{r.messageMax}</small>
          {err?.field === 'message' && <em className="error">{err.text}</em>}
        </label>
        <label className="field">
          <span>Cách liên hệ với bạn (email / link / số điện thoại)</span>
          <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={r.contactMax + 20} aria-invalid={err?.field === 'hr_contact'} />
          {err?.field === 'hr_contact' && <em className="error">{err.text}</em>}
        </label>
        {err && !err.field && <em className="error">{err.text}</em>}
        {wait > 0 && (
          <p className="notice" role="status">
            Còn {Math.floor(wait / 60)}:{String(wait % 60).padStart(2, '0')} nữa bạn mới thả được 500k.
          </p>
        )}
        <div className="actions">
          <button className="btn accent" disabled={busy || wait > 0}>{busy ? 'Đang thả...' : 'Thả 500k'}</button>
          <button type="button" className="btn ghost" onClick={() => setPanel({ kind: 'candidate', id })}>Quay lại</button>
        </div>
      </form>
    </Modal>
  );
}
