import { describe, expect, it } from 'vitest';
import { effectiveStatus, NotificationAggregator } from '@/lib/notify';
import { formatTickerLine } from '@/lib/events';

describe('notify', () => {
  it('aggregates > 5 gifts in 10 s and gates sound to 1/s', () => {
    const a = new NotificationAggregator();
    const out = [0, 100, 200, 300, 400, 500, 600].map((t) => a.push({ type: 'gift' }, t));
    expect(out.slice(0, 5).every((o) => o.kind === 'single')).toBe(true);
    expect(out[5]).toMatchObject({ kind: 'aggregate', count: 6 });
    expect(out[6]).toMatchObject({ kind: 'aggregate', count: 7 });
    expect(out.filter((o) => o.sound)).toHaveLength(1);
    expect(a.push({ type: 'gift' }, 1200)).toMatchObject({ kind: 'aggregate', sound: true });
  });

  it('window slides after 10 s', () => {
    const a = new NotificationAggregator();
    for (let i = 0; i < 6; i++) a.push({ type: 'gift' }, i * 10);
    expect(a.push({ type: 'gift' }, 20_000).kind).toBe('single');
  });

  it('500k and offers are individual and always sound', () => {
    const a = new NotificationAggregator();
    a.push({ type: 'gift' }, 0);
    expect(a.push({ type: 'invite_received' }, 10)).toEqual({ kind: 'single', sound: true, prominent: true });
    expect(a.push({ type: 'offer_received' }, 20)).toMatchObject({ kind: 'single', sound: true, prominent: true });
  });

  it('effectiveStatus applies lazy expiry', () => {
    const now = Date.parse('2026-11-04T00:00:00Z');
    expect(effectiveStatus({ status: 'pending', expiresAt: '2026-11-03T00:00:00Z' }, now)).toBe('expired');
    expect(effectiveStatus({ status: 'pending', expiresAt: '2026-11-05T00:00:00Z' }, now)).toBe('pending');
    expect(effectiveStatus({ status: 'accepted', expiresAt: '2026-11-03T00:00:00Z' }, now)).toBe('accepted');
  });

  it('ticker lines never include message text', () => {
    const line = formatTickerLine({
      type: 'invite', id: '1', at: '', giver: { id: 'h', name: 'Lan', role: 'hr', company: 'ACME' },
      candidate: { id: 'c', name: 'Nam', zone: 'qa' },
    });
    expect(line).toContain('500k');
    expect(line).toContain('ACME');
    expect(formatTickerLine({ type: 'candidate_remove', id: 'x', at: '' })).toBeNull();
  });
});

import { notifView } from '@/lib/notifText';

describe('notifView', () => {
  it('formats gifts, 500k and offers with the right sound and prominence', () => {
    expect(notifView({ type: 'gift', payload: { kind: 'xu', giverName: 'Lan', giverCompany: 'ACME' } })).toMatchObject({
      sound: 'coin', prominent: false, text: expect.stringContaining('HR Lan @ ACME'),
    });
    expect(notifView({ type: 'gift', payload: { kind: 'love', giverName: 'Nam' } }).sound).toBe('love');
    expect(notifView({ type: 'invite_received', payload: { hrName: 'Lan' } })).toMatchObject({ sound: 'note', prominent: true });
    expect(notifView({ type: 'offer_received', payload: { hrName: 'Lan', position: 'Dev' } })).toMatchObject({ sound: 'offer', prominent: true });
    expect(notifView({ type: 'invite_responded', payload: { candidateName: 'A', accepted: true } }).text).toContain('nhận lời mời');
    expect(notifView({ type: 'incense_for_you', payload: {} }).text).toContain('nhang');
  });
  it('keeps hostile payloads as plain text', () => {
    const v = notifView({ type: 'gift', payload: { kind: 'xu', giverName: '<script>alert(1)</script>' } });
    expect(v.text).toContain('<script>');
  });
});
