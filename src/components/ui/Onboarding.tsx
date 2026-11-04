'use client';

import { useRef, useState } from 'react';
import type { Me, Role } from '@/backend/types';
import { errorMessage } from '@/lib/messages';
import { defaultAvatar } from '@/lib/format';
import { hashString } from '@/lib/hash';
import { FIELD_LIMITS } from '@/lib/rules';
import { unlockAudio } from '@/audio/sfx';
import { CaptchaWidget } from './CaptchaWidget';
import { useSession } from '@/state/session';
import { useUi } from '@/state/ui';

const ROLES: { id: Role; title: string; desc: string; emoji: string }[] = [
  { id: 'candidate', title: 'Ứng viên', desc: 'Ra ngồi vỉa hè, cầm biển carton tự trào, chờ leng keng.', emoji: '🪧' },
  { id: 'hr', title: 'HR / Nhà tuyển dụng', desc: 'Đi dạo, xem CV, thả xu, thả 500k, bao trọn.', emoji: '💼' },
  { id: 'viewer', title: 'Khách qua đường', desc: 'Đi xem cho vui, thắp nhang, xin quẻ, thả xu tình thương.', emoji: '🚶' },
];

export function Onboarding({ initial, onDone }: { initial?: Me['profile']; onDone?: () => void }) {
  const backend = useSession((s) => s.backend);
  const setMe = useSession((s) => s.setMe);
  const toast = useUi((s) => s.toast);
  const [name, setName] = useState(initial?.displayName ?? '');
  const [role, setRole] = useState<Role>(initial?.role ?? 'candidate');
  const [company, setCompany] = useState(initial?.company ?? '');
  const [agree, setAgree] = useState(false);
  const [trap, setTrap] = useState('');
  const [err, setErr] = useState<{ field?: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const inflight = useRef(false); // a double click can fire twice before `busy` re-renders

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    unlockAudio();
    if (trap) return; // honeypot: bots fill the hidden field, humans never see it
    if (!backend || busy || inflight.current) return;
    if (!agree) {
      setErr({ field: 'agree', text: 'Tick vào ô đồng ý để vào phố nhé.' });
      return;
    }
    inflight.current = true;
    setBusy(true);
    setErr(null);
    const r = await backend.register({
      displayName: name,
      role,
      company: role === 'hr' ? company : undefined,
      avatar: initial?.avatar ?? defaultAvatar(hashString(name || 'x')),
    }).finally(() => {
      inflight.current = false;
    });
    setBusy(false);
    if (!r.ok) {
      setErr({ field: r.field, text: errorMessage(r.error, r.field) });
      return;
    }
    setMe(r.data);
    toast({ tone: 'info', text: `Chào ${r.data.profile.displayName}, mời vào phố!` });
    onDone?.();
  };

  return (
    <form className="onboarding card" onSubmit={submit} noValidate>
      <h1>Phố Xin Việc 3D</h1>
      <p className="lead">
        Con phố nơi dân IT ngồi xin việc cho vui, tự trào mà có tâm. <strong>Xu và 500k đều là xu ảo</strong>, không ai xin tiền thật.
      </p>

      <label className="field">
        <span>Tên hiển thị ({FIELD_LIMITS.nameMin}–{FIELD_LIMITS.nameMax} ký tự)</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoComplete="off"
          placeholder="Ví dụ: Dev Hẻm Số 7"
          aria-invalid={err?.field === 'display_name'}
          autoFocus
        />
        {err?.field === 'display_name' && <em className="error">{err.text}</em>}
      </label>

      <fieldset className="field roles">
        <legend>Bạn đến phố để làm gì?</legend>
        {ROLES.map((r) => (
          <label key={r.id} className={`role-card${role === r.id ? ' active' : ''}`}>
            <input type="radio" name="role" value={r.id} checked={role === r.id} onChange={() => setRole(r.id)} />
            <span className="emoji" aria-hidden>
              {r.emoji}
            </span>
            <span>
              <strong>{r.title}</strong>
              <small>{r.desc}</small>
            </span>
          </label>
        ))}
      </fieldset>

      {role === 'hr' && (
        <label className="field">
          <span>Công ty ({FIELD_LIMITS.companyMin}–{FIELD_LIMITS.companyMax} ký tự) · hiển thị kèm nhãn “Chưa xác minh”</span>
          <input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={60} aria-invalid={err?.field === 'company'} />
          {err?.field === 'company' && <em className="error">{err.text}</em>}
        </label>
      )}

      {role === 'candidate' && (
        <p className="notice">
          Bạn sẽ ngồi trên phố công khai, ai cũng thấy biển của bạn. Đừng ghi công ty hiện tại nếu không muốn sếp thấy. Bạn có thể đứng dậy ra về hoặc xóa
          hồ sơ bất cứ lúc nào.
        </p>
      )}

      <label className="field hp" aria-hidden>
        <span>Website</span>
        <input tabIndex={-1} autoComplete="off" name="website" value={trap} onChange={(e) => setTrap(e.target.value)} />
      </label>

      <label className="check">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>
          Mình từ 16 tuổi trở lên và hiểu đây là trò chơi, xu chỉ là xu ảo. (
          <a href="/terms" target="_blank" rel="noopener">Điều khoản</a>)
        </span>
      </label>
      {err?.field === 'agree' && <em className="error">{err.text}</em>}
      {err && !['display_name', 'company', 'agree'].includes(err.field ?? '') && <em className="error">{err.text}</em>}

      {!initial && backend?.mode === 'supabase' && <CaptchaWidget />}

      <button className="btn primary big" type="submit" disabled={busy || !backend}>
        {busy ? 'Đang vào phố...' : initial ? 'Lưu thay đổi' : 'Vào phố'}
      </button>
    </form>
  );
}
