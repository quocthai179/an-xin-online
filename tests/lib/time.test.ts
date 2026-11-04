import { describe, expect, it } from 'vitest';
import { addDays, dayDiff, startOfIsoWeekVn, vnDay } from '@/lib/time';

describe('time', () => {
  it('rolls the VN day at 17:00 UTC', () => {
    expect(vnDay(Date.parse('2026-11-04T16:59:59Z'))).toBe('2026-11-04');
    expect(vnDay(Date.parse('2026-11-04T17:00:00Z'))).toBe('2026-11-05');
  });
  it('dayDiff / addDays', () => {
    expect(dayDiff('2026-11-01', '2026-11-08')).toBe(7);
    expect(dayDiff('2026-02-28', '2026-03-01')).toBe(1);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('week starts on Monday (VN)', () => {
    expect(startOfIsoWeekVn(Date.parse('2026-11-04T05:00:00Z'))).toBe('2026-11-02'); // Wed
    expect(startOfIsoWeekVn(Date.parse('2026-11-01T05:00:00Z'))).toBe('2026-10-26'); // Sun
    expect(startOfIsoWeekVn(Date.parse('2026-11-02T00:00:00Z'))).toBe('2026-11-02'); // Mon
  });
});
