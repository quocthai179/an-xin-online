import { DAY_MS } from './rules';

const VN_OFFSET_MS = 7 * 3_600_000;

/** Calendar day (YYYY-MM-DD) in Asia/Ho_Chi_Minh (UTC+7, no DST). */
export function vnDay(ms: number): string {
  return new Date(ms + VN_OFFSET_MS).toISOString().slice(0, 10);
}

function dayToUtcMs(day: string): number {
  return Date.parse(`${day}T00:00:00Z`);
}

/** Whole days from `from` to `to` (to - from). */
export function dayDiff(from: string, to: string): number {
  return Math.round((dayToUtcMs(to) - dayToUtcMs(from)) / DAY_MS);
}

/** Monday of the ISO week containing `ms`, as VN day string. */
export function startOfIsoWeekVn(ms: number): string {
  const day = vnDay(ms);
  const dow = new Date(dayToUtcMs(day)).getUTCDay(); // 0=Sun
  const sinceMonday = (dow + 6) % 7;
  return addDays(day, -sinceMonday);
}

export function addDays(day: string, n: number): string {
  return new Date(dayToUtcMs(day) + n * DAY_MS).toISOString().slice(0, 10);
}
