'use client';

import { useEffect, useState } from 'react';
import { visitSpot, zoneIndexAtZ, zoneStartZ, SPAWN } from '@/lib/layout';
import { ZONE_IDS } from '@/lib/rules';
import { ZONE_LIST } from '@/lib/zones';
import { input, requestTeleport } from '@/state/input';
import { useSession } from '@/state/session';
import { useWorld } from '@/state/world';

/** Quick teleport chips: plaza, each zone gate and "my seat". Also shows the current zone. */
export function ZoneNav() {
  const [zoneIdx, setZoneIdx] = useState(-1);
  const myId = useSession((s) => s.me?.candidate?.id);
  const seat = useWorld((s) => (myId ? s.plan.seats.get(myId) : undefined));

  useEffect(() => {
    const t = setInterval(() => setZoneIdx(zoneIndexAtZ(input.player.z)), 400);
    return () => clearInterval(t);
  }, []);

  return (
    <nav className="zone-nav" aria-label="Đi nhanh tới khu">
      <button className={`zone-chip${zoneIdx === -1 ? ' active' : ''}`} style={{ ['--zone' as string]: '#c0562b' }} onClick={() => requestTeleport(SPAWN.x, SPAWN.z, SPAWN.ry)}>
        🏛️ Quảng trường
      </button>
      {seat && (
        <button
          className="zone-chip"
          style={{ ['--zone' as string]: '#d99a1f' }}
          onClick={() => {
            const v = visitSpot(ZONE_IDS.indexOf(seat.zone), seat.seat);
            requestTeleport(v.x, v.z, v.ry);
          }}
        >
          📍 Chỗ tôi
        </button>
      )}
      {ZONE_LIST.map((z, i) => (
        <button
          key={z.id}
          className={`zone-chip${zoneIdx === i ? ' active' : ''}`}
          style={{ ['--zone' as string]: z.color }}
          onClick={() => requestTeleport(0, zoneStartZ(i) - 3, 0)}
          title={z.name}
        >
          {z.emoji} {z.short}
        </button>
      ))}
    </nav>
  );
}
