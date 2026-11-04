'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CandidateDetail, Contact, ReportReason, Result } from '@/backend/types';
import { errorMessage } from '@/lib/messages';
import { contactHref } from '@/lib/validation/contact';
import { formatSalary, sitDays, WORK_MODE_LABELS } from '@/lib/format';
import { LIMITS } from '@/lib/rules';
import { rankInZone } from '@/lib/seats';
import { ZONES } from '@/lib/zones';
import { playCoin, playIncense, playLove, unlockAudio } from '@/audio/sfx';
import { useNow } from '@/hooks/useNow';
import { useSession } from '@/state/session';
import { useUi } from '@/state/ui';
import { useWorld } from '@/state/world';
import { Modal } from './Modal';
import { candidateSharePath } from '@/lib/shareData';
import { ShareSheet } from './ShareSheet';
import { SignCanvas } from './SignCanvas';

const REPORT_REASONS: [ReportReason, string][] = [
  ['obscene', 'Tục tĩu'], ['harassment', 'Công kích cá nhân'], ['spam', 'Spam'], ['personal_info', 'Thông tin cá nhân'], ['other', 'Khác'],
];

function useCandidate(id: string) {
  const backend = useSession((s) => s.backend);
  const [detail, setDetail] = useState<CandidateDetail | null | undefined>(undefined);
  const [gone, setGone] = useState(false);
  const [contact, setContact] = useState<Contact | null>(null);

  const load = useCallback(async () => {
    if (!backend) return;
    const d = await backend.getCandidate(id);
    setDetail(d);
    if (d?.me?.canSeeContact) {
      const c = await backend.getCandidateContact(d.id);
      setContact(c.ok ? c.data : null);
    } else setContact(null);
  }, [backend, id]);

  useEffect(() => {
    queueMicrotask(() => void load());
    if (!backend) return;
    const off = backend.onStreetEvent((e) => {
      if (e.type === 'candidate_remove' && e.id === id) setGone(true);
      else if ('candidate' in e && e.candidate.id === id) {
        setGone(false);
        void load();
      }
    });
    const offN = backend.onNotification(() => void load());
    return () => {
      off();
      offN();
    };
  }, [backend, id, load]);

  return { detail, gone, contact, reload: load };
}

export function CandidatePanel({ id }: { id: string }) {
  const backend = useSession((s) => s.backend);
  const me = useSession((s) => s.me);
  const refreshMe = useSession((s) => s.refreshMe);
  const setPanel = useUi((s) => s.setPanel);
  const close = useUi((s) => s.close);
  const toast = useUi((s) => s.toast);
  const plan = useWorld((s) => s.plan);
  const now = useNow();
  const { detail, gone, contact, reload } = useCandidate(id);
  const [busy, setBusy] = useState(false);
  const [drop, setDrop] = useState<'xu' | 'love' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('spam');
  const [note, setNote] = useState('');

  if (detail === undefined) return <Modal title="Đang mở CV..."><p className="dim">Đợi xíu...</p></Modal>;
  if (detail === null) {
    return (
      <Modal title="Không thấy người này">
        <p>Người này đã về nhà hoặc đang ẩn. Phố vẫn còn nhiều người khác.</p>
        <button className="btn" onClick={close}>Đóng</button>
      </Modal>
    );
  }

  const c = detail;
  const role = me?.profile.role;
  const quota = me?.quota;
  const my = c.me;
  const unavailable = gone || c.status !== 'sitting';
  const isMine = !!my?.isMine;
  const rank = rankInZone(plan, c.id);
  const seat = plan.seats.get(c.id)?.seat;
  const salary = formatSalary(c);

  const act = async <T,>(fn: () => Promise<Result<T>>, ok: (d: T) => void) => {
    if (busy || !backend) return;
    unlockAudio();
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (!r.ok) {
      toast({ tone: 'error', text: errorMessage(r.error, r.field) });
    } else {
      ok(r.data);
    }
    await reload();
    await refreshMe();
  };

  const throwCoin = (kind: 'xu' | 'love') => {
    setDrop(kind);
    setTimeout(() => setDrop(null), 800);
  };

  const dropXu = () =>
    act(() => backend!.dropGift(c.id, 'xu'), (d) => {
      playCoin();
      throwCoin('xu');
      toast({ tone: 'coin', text: `Leng keng! Đã thả xu cho ${c.displayName}. Hôm nay còn ${d.remainingToday} xu.` });
    });
  const dropLove = () =>
    act(() => backend!.dropGift(c.id, 'love'), (d) => {
      playLove();
      throwCoin('love');
      toast({ tone: 'love', text: `Đã thả xu tình thương 💛 Hôm nay còn ${d.remainingToday} lượt.` });
    });

  const xuReason = !me ? 'Vào phố trước đã'
    : role !== 'hr' ? 'Đăng ký HR để thả xu (khách dùng xu tình thương)'
    : unavailable ? 'Người này không nhận xu lúc này'
    : isMine ? 'Không tự thả cho mình'
    : (quota?.xuUsed ?? 0) >= LIMITS.xu.perDay ? 'Hết xu hôm nay, mai quay lại'
    : (my?.xuToday ?? 0) >= LIMITS.xu.perCandidatePerDay ? 'Hôm nay đã thả đủ cho người này'
    : null;
  const loveReason = !me ? 'Vào phố trước đã'
    : unavailable ? 'Người này không nhận xu lúc này'
    : isMine ? 'Không tự thả cho mình'
    : (quota?.loveUsed ?? 0) >= LIMITS.love.perDay ? 'Hết xu tình thương hôm nay'
    : (my?.loveToday ?? 0) >= LIMITS.love.perCandidatePerDay ? 'Hôm nay đã thả cho người này rồi'
    : null;
  const inviteReason = role !== 'hr' ? 'Đăng ký HR để thả 500k'
    : unavailable ? 'Người này không nhận lời mời lúc này'
    : c.isSample ? 'Ứng viên mẫu chưa nhận 500k được'
    : my?.openInvite ? 'Bạn đã có lời mời đang chờ'
    : (quota?.inviteUsed ?? 0) >= LIMITS.invite.perDay ? 'Hết tờ 500k hôm nay'
    : c.openInvites >= LIMITS.invite.maxOpenPerCandidate ? 'Ứng viên đang kín lịch'
    : null;
  const offerReason = role !== 'hr' ? 'Đăng ký HR để bao trọn'
    : unavailable ? 'Người này không nhận offer lúc này'
    : !my?.acceptedInviteId ? 'Cần ứng viên nhận lời 500k trước'
    : c.openOffer ? 'Ứng viên đang cân nhắc một offer khác'
    : null;

  const href = contact ? contactHref(contact) : null;

  return (
    <Modal title={`CV của ${c.displayName}`} wide>
      {gone && <p className="notice warn">Người này vừa đứng dậy ra về. Các nút đã bị vô hiệu.</p>}
      {c.status === 'placed' && (
        <p className="notice ok">
          ĐÃ ĐƯỢC BAO{c.placedCompany ? ` bởi ${c.placedCompany}` : ''}! Chúc mừng 🎉
        </p>
      )}

      <div className="sign-wrap">
        <SignCanvas text={c.signState === 'ok' ? (c.signText ?? '') : 'Biển đang chờ duyệt'} />
        {drop && <span className={`fly fly-${drop}`} aria-hidden>{drop === 'xu' ? '🪙' : '💛'}</span>}
      </div>

      <h3 className="who">
        {c.displayName} {c.isSample && <span className="badge sample">Mẫu</span>}
      </h3>
      <p className="sub">
        {c.title} · {c.yearsExp} năm kinh nghiệm · {ZONES[c.zone].name}
      </p>
      <p className="chips">{c.skills.map((s, i) => <span key={`${s}-${i}`} className="chip">{s}</span>)}</p>

      <dl className="facts">
        {salary && (<><dt>Lương mong muốn</dt><dd>{salary}</dd></>)}
        {(c.city || c.workModes.length > 0) && (
          <><dt>Địa điểm</dt><dd>{[c.city, c.workModes.map((m) => WORK_MODE_LABELS[m]).join(' / ')].filter(Boolean).join(' · ')}</dd></>
        )}
        <dt>Ngồi lì</dt><dd>{sitDays(c, now)} ngày</dd>
        {c.status === 'sitting' && rank && (<><dt>Thứ hạng</dt><dd>Hạng #{rank} trong {ZONES[c.zone].short}{seat ? ` (ghế ${seat})` : ' (hàng chờ)'}</dd></>)}
        <dt>Xu HR</dt><dd>🪙 {c.totals.xu}</dd>
        <dt>Xu tình thương</dt><dd>💛 {c.totals.love}</dd>
        <dt>Nhang</dt><dd>🪔 {c.totals.incense} nén</dd>
      </dl>
      {c.bio && <p className="bio">{c.bio}</p>}

      <div className="contact">
        <strong>Liên hệ: </strong>
        {contact ? (
          href ? <a href={href} target="_blank" rel="noopener noreferrer nofollow ugc">{contact.value}</a> : <span>{contact.value}</span>
        ) : (
          <span className="dim">Thả 500k để mở liên hệ</span>
        )}
      </div>

      {isMine ? (
        <div className="actions">
          <button className="btn" onClick={() => setPanel({ kind: 'form' })}>Sửa hồ sơ</button>
          {c.status !== 'sitting' ? (
            <button className="btn primary" onClick={() => act(() => backend!.setMyCandidateStatus('sitting'), () => toast({ tone: 'info', text: 'Đã ra ngồi lại. Ngồi lì tính lại từ đầu nhé.' }))}>
              Ra ngồi lại
            </button>
          ) : (
            <button className="btn" onClick={() => act(() => backend!.setMyCandidateStatus('hidden'), () => toast({ tone: 'info', text: 'Bạn đã đứng dậy ra về. Hồ sơ vẫn được giữ.' }))}>
              Đứng dậy ra về
            </button>
          )}
          <button
            className="btn danger"
            onClick={() => {
              if (!confirmDelete) return setConfirmDelete(true);
              void act(() => backend!.deleteMyCandidate(), () => {
                toast({ tone: 'info', text: 'Đã xóa hồ sơ. Hẹn gặp lại trên phố.' });
                close();
              });
            }}
          >
            {confirmDelete ? 'Chắc chắn xóa? Bấm lần nữa' : 'Xóa hồ sơ'}
          </button>
        </div>
      ) : (
        <>
          <div className="actions">
            <button className="btn primary" disabled={busy || !!xuReason} title={xuReason ?? ''} onClick={dropXu}>
              🪙 Thả xu
            </button>
            <button className="btn" disabled={busy || !!loveReason} title={loveReason ?? ''} onClick={dropLove}>
              💛 Xu tình thương
            </button>
            <button className="btn accent" disabled={busy || !!inviteReason} title={inviteReason ?? ''} onClick={() => setPanel({ kind: 'invite', id: c.id })}>
              💸 Thả 500k
            </button>
            <button className="btn accent" disabled={busy || !!offerReason} title={offerReason ?? ''} onClick={() => setPanel({ kind: 'offer', id: c.id })}>
              🎉 Bao trọn
            </button>
          </div>
          <ul className="reasons">
            {[xuReason && `Thả xu: ${xuReason}`, loveReason && `Xu tình thương: ${loveReason}`, inviteReason && `500k: ${inviteReason}`, offerReason && `Bao trọn: ${offerReason}`]
              .filter(Boolean)
              .map((t) => <li key={t as string}>{t}</li>)}
          </ul>
          <div className="actions secondary">
            <button
              className="btn small"
              disabled={busy || !me || me.quota.incenseDone || unavailable}
              title={me?.quota.incenseDone ? 'Hôm nay thắp rồi, mai thắp tiếp nhé' : ''}
              onClick={() => act(() => backend!.lightIncense(c.id), () => { playIncense(); toast({ tone: 'info', text: `Đã thắp nhang cầu job cho ${c.displayName} 🪔` }); })}
            >
              🪔 Thắp nhang cầu job cho bạn này
            </button>
            <ShareSheet
              path={candidateSharePath(c)}
              imagePath={candidateSharePath(c).replace('/c/', '/api/og/c/')}
              title={`${c.displayName} đang ngồi ở Phố Xin Việc`}
              text={`${c.displayName} đang ngồi ở Phố Xin Việc 3D: ${c.signText ?? ''}`}
            />
            <button className="btn small ghost" disabled={!me || !!my?.reported} onClick={() => setReportOpen((v) => !v)}>
              {my?.reported ? 'Đã báo cáo' : 'Báo cáo'}
            </button>
          </div>
          {reportOpen && !my?.reported && (
            <form
              className="report-form card"
              onSubmit={(e) => {
                e.preventDefault();
                void act(() => backend!.report(c.id, reason, note), () => {
                  toast({ tone: 'info', text: 'Đã gửi báo cáo. Cảm ơn bạn giữ phố sạch.' });
                  setReportOpen(false);
                });
              }}
            >
              <label className="field">
                <span>Lý do</span>
                <select value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
                  {REPORT_REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Ghi chú (tùy chọn)</span>
                <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
              </label>
              <button className="btn small danger" disabled={busy}>Gửi báo cáo</button>
            </form>
          )}
        </>
      )}
    </Modal>
  );
}
