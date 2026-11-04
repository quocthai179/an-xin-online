import { describe, expect, it } from 'vitest';
import { appendNewcomer, assignSeats, rankInZone, removeCandidate } from '@/lib/seats';
import { seatTransform } from '@/lib/layout';
import type { Ranked } from '@/lib/ranking';

const mk = (id: string, zone: Ranked['zone'], score: number, status: Ranked['status'] = 'sitting'): Ranked => ({
  id, zone, score, sittingSince: 0, createdAt: 0, status,
});

describe('seats', () => {
  it('is deterministic and ranks by score within zone', () => {
    const c = [mk('a', 'backend', 1), mk('b', 'backend', 9), mk('c', 'qa', 5)];
    const p1 = assignSeats(c);
    const p2 = assignSeats([...c].reverse());
    expect(Object.fromEntries(p1.seats)).toEqual(Object.fromEntries(p2.seats));
    expect(p1.seats.get('b')).toEqual({ zone: 'backend', seat: 1 });
    expect(p1.seats.get('a')).toEqual({ zone: 'backend', seat: 2 });
    expect(p1.seats.get('c')).toEqual({ zone: 'qa', seat: 1 });
  });

  it('seats 30 per zone and queues the rest', () => {
    const c = Array.from({ length: 35 }, (_, i) => mk(`id${String(i).padStart(2, '0')}`, 'design', 100 - i));
    const p = assignSeats(c);
    expect([...p.seats.values()].filter((s) => s.zone === 'design')).toHaveLength(30);
    expect(p.queue.design).toHaveLength(5);
    expect(p.queue.design[0]).toBe('id30');
    expect(rankInZone(p, 'id33')).toBe(34);
  });

  it('excludes placed and hidden candidates', () => {
    const p = assignSeats([mk('a', 'qa', 1), mk('b', 'qa', 2, 'placed'), mk('c', 'qa', 3, 'hidden')]);
    expect([...p.seats.keys()]).toEqual(['a']);
  });

  it('odd seats are left, even right, seat 1 closest to head', () => {
    const s1 = seatTransform(0, 1);
    const s2 = seatTransform(0, 2);
    const s3 = seatTransform(0, 3);
    expect(s1.x).toBeLessThan(0);
    expect(s2.x).toBeGreaterThan(0);
    expect(s1.z).toBe(s2.z);
    expect(s3.z).toBeLessThan(s1.z);
    expect(s1.rotY).toBeCloseTo(Math.PI / 2);
    expect(s2.rotY).toBeCloseTo(-Math.PI / 2);
    expect(seatTransform(1, 1).z).toBeLessThan(seatTransform(0, 30).z);
  });

  it('appendNewcomer takes the last free seat; remove leaves a gap', () => {
    let p = assignSeats([mk('a', 'qa', 3), mk('b', 'qa', 2), mk('c', 'qa', 1)]);
    p = appendNewcomer(p, mk('n', 'qa', 0));
    expect(p.seats.get('n')?.seat).toBe(4);
    p = removeCandidate(p, 'b');
    expect(p.seats.has('b')).toBe(false);
    expect(p.seats.get('c')?.seat).toBe(3);
    p = appendNewcomer(p, mk('m', 'qa', 0));
    expect(p.seats.get('m')?.seat).toBe(5);
  });

  it('appendNewcomer fills a gap when the zone is full, else queues', () => {
    const c = Array.from({ length: 30 }, (_, i) => mk(`id${i}`, 'qa', 100 - i));
    let p = assignSeats(c);
    p = appendNewcomer(p, mk('x', 'qa', 0));
    expect(p.queue.qa).toEqual(['x']);
    p = removeCandidate(p, 'id4');
    p = appendNewcomer(p, mk('y', 'qa', 0));
    expect(p.seats.get('y')?.seat).toBe(5);
  });
});
