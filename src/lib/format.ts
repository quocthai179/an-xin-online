import type { CandidateCard, CandidateDetail, Role } from '@/backend/types';
import { DAY_MS } from './rules';

export const ROLE_LABELS: Record<Role, string> = { hr: 'HR', candidate: 'Ứng viên', viewer: 'Người qua đường' };

export function sitDays(c: Pick<CandidateCard, 'sittingSince'>, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - Date.parse(c.sittingSince)) / DAY_MS));
}

export function formatSalary(c: Pick<CandidateDetail, 'salaryMin' | 'salaryMax' | 'salaryNegotiable'>): string | null {
  const { salaryMin: a, salaryMax: b } = c;
  if (a != null && b != null) return a === b ? `${a} triệu/tháng` : `${a} – ${b} triệu/tháng`;
  if (a != null) return `từ ${a} triệu/tháng`;
  if (b != null) return `đến ${b} triệu/tháng`;
  return c.salaryNegotiable ? 'Thỏa thuận' : null;
}

export const WORK_MODE_LABELS = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'Onsite' } as const;

export function relativeTime(iso: string, nowMs: number): string {
  const s = Math.max(0, Math.round((nowMs - Date.parse(iso)) / 1000));
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return `${Math.floor(s / 86400)} ngày trước`;
}

export function defaultAvatar(seed: number) {
  const hats = ['non_la', 'cap', 'beanie', 'none'] as const;
  const bowls = ['bowl', 'hat', 'box'] as const;
  return {
    skin: seed % 5,
    shirt: (seed >> 3) % 8,
    pants: (seed >> 6) % 4,
    hat: hats[(seed >> 9) % hats.length],
    bowl: bowls[(seed >> 12) % bowls.length],
  };
}
