'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AppNotification, Invitation, Offer } from '@/backend/types';
import { errorMessage } from '@/lib/messages';
import { notifView } from '@/lib/notifText';
import { effectiveStatus } from '@/lib/notify';
import { relativeTime } from '@/lib/format';
import { playNote, playOffer, unlockAudio } from '@/audio/sfx';
import { useNow } from '@/hooks/useNow';
import { useSession } from '@/state/session';
import { useUi } from '@/state/ui';
import { useWorld } from '@/state/world';
import { Modal } from './Modal';

const STATUS_LABEL = { pending: 'Chờ phản hồi', accepted: 'Đã nhận lời', declined: 'Từ chối', expired: 'Hết hạn', closed: 'Ứng viên đã nhận việc khác' } as const;

export function Inbox() {
  const backend = useSession((s) => s.backend);
  const me = useSession((s) => s.me);
  const refreshMe = useSession((s) => s.refreshMe);
  const setPanel = useUi((s) => s.setPanel);
  const toast = useUi((s) => s.toast);
  const candidates = useWorld((s) => s.candidates);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [invs, setInvs] = useState<Invitation[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [showCo, setShowCo] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const now = useNow();

  const load = useCallback(async () => {
    if (!backend) return;
    const [n, i, o] = await Promise.all([backend.listNotifications(50), backend.listMyInvitations(), backend.listMyOffers()]);
    setNotifs(n);
    setInvs(i);
    setOffers(o);
  }, [backend]);

  useEffect(() => {
    queueMicrotask(() => void load());
    if (!backend) return;
    const off = backend.onNotification(() => void load());
    return off;
  }, [backend, load]);

  // opening the inbox marks everything as read, but keep the "new" markers for this view
  useEffect(() => {
    if (!backend) return;
    const t = setTimeout(() => {
      void backend.markNotificationsRead().then(() => refreshMe());
    }, 800);
    return () => clearTimeout(t);
  }, [backend, refreshMe]);

  const guard = async (fn: () => Promise<{ ok: boolean; error?: never } | { ok: false; error: Parameters<typeof errorMessage>[0]; field?: string }>, okMsg: string, sound?: () => void) => {
    if (busy) return;
    unlockAudio();
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (!r.ok && 'error' in r && r.error) toast({ tone: 'error', text: errorMessage(r.error, r.field) });
    else {
      sound?.();
      toast({ tone: 'info', text: okMsg });
    }
    await load();
    await refreshMe();
  };

  const isCandidate = me?.profile.role === 'candidate';
  const myCandId = me?.candidate?.id;
  const received = invs.filter((i) => i.candidateId === myCandId);
  const sent = invs.filter((i) => i.hrId === me?.profile.id);
  const receivedOffers = offers.filter((o) => o.candidateId === myCandId);
  const sentOffers = offers.filter((o) => o.hrId === me?.profile.id);

  return (
    <Modal title="Hộp thư" wide>
      {isCandidate && (
        <section>
          <h3>Lời mời & offer dành cho bạn</h3>
          {receivedOffers.length + received.length === 0 && <p className="dim">Chưa có tờ 500k nào. Kiên nhẫn, phố còn dài.</p>}
          {receivedOffers.map((o) => {
            const st = effectiveStatus(o, now);
            return (
              <article key={o.id} className="card item">
                <h4>🎉 Offer từ {o.hrName} @ {o.hrCompany || '—'} <span className={`status ${st}`}>{STATUS_LABEL[st]}</span></h4>
                <p><strong>{o.position}</strong> · {o.package}</p>
                {o.message && <p className="quote">{o.message}</p>}
                {st === 'pending' && (
                  <div className="actions">
                    <label className="check">
                      <input type="checkbox" checked={!!showCo[o.id]} onChange={(e) => setShowCo({ ...showCo, [o.id]: e.target.checked })} />
                      <span>Hiện tên công ty trên Tường vinh danh</span>
                    </label>
                    <button className="btn primary" disabled={busy} onClick={() => guard(() => backend!.respondOffer(o.id, true, { showCompany: !!showCo[o.id] }), 'Chúc mừng, bạn đã được bao! 🎉', playOffer)}>Chấp nhận</button>
                    <button className="btn" disabled={busy} onClick={() => guard(() => backend!.respondOffer(o.id, false), 'Đã từ chối offer.')}>Từ chối</button>
                  </div>
                )}
              </article>
            );
          })}
          {received.map((i) => {
            const st = effectiveStatus(i, now);
            return (
              <article key={i.id} className="card item">
                <h4>💸 500k từ {i.hrName} @ {i.hrCompany || '—'} <span className="badge">Chưa xác minh</span> <span className={`status ${st}`}>{STATUS_LABEL[st]}</span></h4>
                <p className="quote">{i.message}</p>
                <p className="dim">Liên hệ HR: {i.hrContact} · {relativeTime(i.createdAt, now)}</p>
                {st === 'pending' && (
                  <div className="actions">
                    <input
                      placeholder="Lý do từ chối (tùy chọn)"
                      value={reasons[i.id] ?? ''}
                      maxLength={200}
                      onChange={(e) => setReasons({ ...reasons, [i.id]: e.target.value })}
                      aria-label="Lý do từ chối"
                    />
                    <button className="btn primary" disabled={busy} onClick={() => guard(() => backend!.respondInvitation(i.id, true), 'Đã nhận lời. HR sẽ liên hệ bạn.', playNote)}>Nhận lời</button>
                    <button className="btn" disabled={busy} onClick={() => guard(() => backend!.respondInvitation(i.id, false, reasons[i.id]), 'Đã từ chối lời mời.')}>Từ chối</button>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      {me?.profile.role === 'hr' && (
        <section>
          <h3>Lời mời & offer bạn đã gửi</h3>
          {sent.length === 0 && <p className="dim">Bạn chưa thả tờ 500k nào.</p>}
          {sent.map((i) => {
            const st = effectiveStatus(i, now);
            const c = candidates[i.candidateId];
            const offer = sentOffers.find((o) => o.invitationId === i.id);
            return (
              <article key={i.id} className="card item">
                <h4>
                  💸 Gửi {c?.displayName ?? 'ứng viên'} <span className={`status ${st}`}>{STATUS_LABEL[st]}</span>
                  {offer && <span className={`status ${effectiveStatus(offer, now)}`}>Offer: {STATUS_LABEL[effectiveStatus(offer, now)]}</span>}
                </h4>
                <p className="quote">{i.message}</p>
                {i.responseReason && <p className="dim">Lý do: {i.responseReason}</p>}
                <div className="actions">
                  {c && <button className="btn small" onClick={() => setPanel({ kind: 'candidate', id: c.id })}>Xem CV</button>}
                  {st === 'accepted' && !offer && c?.status === 'sitting' && (
                    <button className="btn small accent" onClick={() => setPanel({ kind: 'offer', id: i.candidateId })}>Bao trọn</button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      <section>
        <h3>Thông báo</h3>
        {notifs.length === 0 ? (
          <p className="dim">Chưa có thông báo. Phố đang yên ắng.</p>
        ) : (
          <ul className="notif-list">
            {notifs.map((n) => (
              <li key={n.id} className={n.readAt ? '' : 'unread'}>
                <span>{notifView(n).text}</span>
                <small>{relativeTime(n.createdAt, now)}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Modal>
  );
}
