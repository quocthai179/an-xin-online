'use client';

import { useMemo, useState } from 'react';
import type { CandidateInput, WorkMode } from '@/backend/types';
import { errorMessage } from '@/lib/messages';
import { FIELD_LIMITS } from '@/lib/rules';
import { randomTemplate } from '@/lib/signTemplates';
import { validateCandidateInput } from '@/lib/validation/candidate';
import { ZONE_LIST } from '@/lib/zones';
import { WORK_MODE_LABELS } from '@/lib/format';
import { useSession } from '@/state/session';
import { useUi } from '@/state/ui';
import { Modal } from './Modal';
import { SignCanvas } from './SignCanvas';


export function CandidateForm() {
  const backend = useSession((s) => s.backend);
  const me = useSession((s) => s.me);
  const refreshMe = useSession((s) => s.refreshMe);
  const close = useUi((s) => s.close);
  const setPanel = useUi((s) => s.setPanel);
  const setFocusZone = useUi((s) => s.setFocusZone);
  const toast = useUi((s) => s.toast);
  const existing = me?.candidate ?? null;

  const [sign, setSign] = useState(existing?.signText ?? '');
  const [zone, setZone] = useState(existing?.zone ?? 'backend');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [years, setYears] = useState(existing ? String(existing.yearsExp) : '');
  const [skills, setSkills] = useState(existing?.skills.join(', ') ?? '');
  const [smin, setSmin] = useState(existing?.salaryMin != null ? String(existing.salaryMin) : '');
  const [smax, setSmax] = useState(existing?.salaryMax != null ? String(existing.salaryMax) : '');
  const [negotiable, setNegotiable] = useState(existing?.salaryNegotiable ?? false);
  const [city, setCity] = useState(existing?.city ?? '');
  const [modes, setModes] = useState<WorkMode[]>(existing?.workModes ?? []);
  const [bio, setBio] = useState(existing?.bio ?? '');
  const [ckind, setCkind] = useState<'email' | 'url' | 'phone'>(existing?.contact.kind ?? 'email');
  const [cval, setCval] = useState(existing?.contact.value ?? '');
  const [hideTicker, setHideTicker] = useState(existing?.hideFromTicker ?? false);
  const [showSalary, setShowSalary] = useState(existing?.showSalaryOnCard ?? false);
  const [agree, setAgree] = useState(!!existing);
  const [err, setErr] = useState<{ field: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const skillList = useMemo(() => skills.split(/[,\n]/).map((s) => s.trim()).filter(Boolean), [skills]);

  const build = (): unknown => ({
    signText: sign,
    title,
    yearsExp: years.trim() === '' ? NaN : Number(years),
    skills: skillList,
    salaryMin: smin.trim() === '' ? null : Number(smin),
    salaryMax: smax.trim() === '' ? null : Number(smax),
    salaryNegotiable: negotiable,
    city: city || null,
    workModes: modes,
    bio: bio || null,
    zone,
    hideFromTicker: hideTicker,
    showSalaryOnCard: showSalary,
    contact: { kind: ckind, value: cval },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backend || busy) return;
    if (!agree) return setErr({ field: 'agree', text: 'Tick vào ô đồng ý để ra ngồi nhé.' });
    const v = validateCandidateInput(build());
    if (!v.ok) return setErr({ field: v.field, text: errorMessage(v.error, v.field) });
    setBusy(true);
    setErr(null);
    const r = await backend.saveMyCandidate(v.value as CandidateInput);
    setBusy(false);
    if (!r.ok) return setErr({ field: r.field ?? '', text: errorMessage(r.error, r.field) });
    await refreshMe();
    setFocusZone(v.value.zone);
    toast({ tone: 'info', text: existing ? 'Đã lưu hồ sơ.' : 'Bạn đã ra ngồi! Nón đã đặt trước mặt, chờ leng keng thôi.' });
    if (existing) close();
    else setPanel({ kind: 'candidate', id: r.data.id });
  };

  const fieldErr = (f: string) => (err?.field === f ? <em className="error">{err.text}</em> : null);

  return (
    <Modal title={existing ? 'Sửa hồ sơ của bạn' : 'Ra ngồi vỉa hè'} wide>
      <form onSubmit={submit} noValidate className="cand-form">
        {!existing && (
          <p className="notice">
            Bạn sẽ ngồi trên phố công khai, ai cũng thấy biển. Đừng ghi công ty hiện tại nếu không muốn sếp thấy. Hài hước là do bạn chọn, tụi mình chỉ
            khuyến khích tự trào.
          </p>
        )}
        <div className="sign-edit">
          <label className="field">
            <span>Biển carton ({FIELD_LIMITS.signMin}–{FIELD_LIMITS.signMax} ký tự, tối đa 2 dòng)</span>
            <textarea value={sign} onChange={(e) => setSign(e.target.value)} rows={2} maxLength={FIELD_LIMITS.signMax + 40} aria-invalid={err?.field === 'sign_text'} />
            <small>{[...sign].length}/{FIELD_LIMITS.signMax}</small>
            {fieldErr('sign_text')}
          </label>
          <button
            type="button"
            className="btn small"
            onClick={() => setSign(randomTemplate(Math.random, { skill: skillList[0], years: years ? Number(years) : null }))}
          >
            🎲 Gợi ý
          </button>
          <SignCanvas text={sign} className="preview" label="Xem trước biển carton" />
        </div>

        <div className="grid2">
          <label className="field">
            <span>Khu ngồi</span>
            <select value={zone} onChange={(e) => setZone(e.target.value as typeof zone)} aria-invalid={err?.field === 'zone'}>
              {ZONE_LIST.map((z) => <option key={z.id} value={z.id}>{z.emoji} {z.name}</option>)}
            </select>
            {fieldErr('zone')}
          </label>
          <label className="field">
            <span>Chức danh</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={FIELD_LIMITS.titleMax + 10} aria-invalid={err?.field === 'title'} />
            {fieldErr('title')}
          </label>
          <label className="field">
            <span>Số năm kinh nghiệm</span>
            <input inputMode="numeric" value={years} onChange={(e) => setYears(e.target.value.replace(/[^0-9]/g, ''))} aria-invalid={err?.field === 'years_exp'} />
            {fieldErr('years_exp')}
          </label>
          <label className="field">
            <span>Kỹ năng (cách nhau bằng dấu phẩy, 1–10)</span>
            <input value={skills} onChange={(e) => setSkills(e.target.value)} aria-invalid={err?.field === 'skills'} />
            {fieldErr('skills')}
          </label>
          <label className="field">
            <span>Lương mong muốn từ (triệu/tháng)</span>
            <input inputMode="numeric" value={smin} onChange={(e) => setSmin(e.target.value.replace(/[^0-9]/g, ''))} aria-invalid={err?.field === 'salary'} />
          </label>
          <label className="field">
            <span>đến (triệu/tháng)</span>
            <input inputMode="numeric" value={smax} onChange={(e) => setSmax(e.target.value.replace(/[^0-9]/g, ''))} aria-invalid={err?.field === 'salary'} />
          </label>
        </div>
        {fieldErr('salary')}
        <label className="check">
          <input type="checkbox" checked={negotiable} onChange={(e) => setNegotiable(e.target.checked)} />
          <span>Lương thỏa thuận</span>
        </label>

        <div className="grid2">
          <label className="field">
            <span>Thành phố</span>
            <input value={city} onChange={(e) => setCity(e.target.value)} list="cities" maxLength={FIELD_LIMITS.cityMax + 10} aria-invalid={err?.field === 'city'} />
            <datalist id="cities">
              {['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Cần Thơ', 'Huế', 'Hải Phòng'].map((c) => <option key={c} value={c} />)}
            </datalist>
            {fieldErr('city')}
          </label>
          <fieldset className="field">
            <legend>Hình thức làm việc</legend>
            <div className="inline">
              {(Object.keys(WORK_MODE_LABELS) as WorkMode[]).map((m) => (
                <label key={m} className="check">
                  <input type="checkbox" checked={modes.includes(m)} onChange={(e) => setModes(e.target.checked ? [...modes, m] : modes.filter((x) => x !== m))} />
                  <span>{WORK_MODE_LABELS[m]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <label className="field">
          <span>Giới thiệu ngắn (tùy chọn, tối đa {FIELD_LIMITS.bioMax} ký tự, không ghi link/email/số điện thoại)</span>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={FIELD_LIMITS.bioMax + 40} aria-invalid={err?.field === 'bio'} />
          {fieldErr('bio')}
        </label>

        <div className="grid2">
          <label className="field">
            <span>Liên hệ (chỉ HR có lời 500k mà bạn đã nhận lời mới thấy)</span>
            <select value={ckind} onChange={(e) => setCkind(e.target.value as typeof ckind)}>
              <option value="email">Email</option>
              <option value="url">Link (LinkedIn, GitHub, Zalo...)</option>
              <option value="phone">Số điện thoại</option>
            </select>
          </label>
          <label className="field">
            <span>Giá trị liên hệ</span>
            <input value={cval} onChange={(e) => setCval(e.target.value)} aria-invalid={err?.field === 'contact'} />
            {fieldErr('contact')}
          </label>
        </div>

        <label className="check">
          <input type="checkbox" checked={hideTicker} onChange={(e) => setHideTicker(e.target.checked)} />
          <span>Ẩn tên tôi khỏi ticker (hiện “một bạn ẩn danh”)</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={showSalary} onChange={(e) => setShowSalary(e.target.checked)} />
          <span>Hiện lương trên thẻ chia sẻ</span>
        </label>
        {!existing && (
          <label className="check">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>Mình đồng ý hiển thị công khai biển và hồ sơ này trên phố.</span>
          </label>
        )}
        {fieldErr('agree')}
        {err && !err.field && <em className="error">{err.text}</em>}

        <div className="actions">
          <button className="btn primary" disabled={busy}>{busy ? 'Đang lưu...' : existing ? 'Lưu' : 'Ra ngồi'}</button>
          <button type="button" className="btn ghost" onClick={close}>Hủy</button>
        </div>
      </form>
    </Modal>
  );
}
