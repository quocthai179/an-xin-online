'use client';

import { useWorld } from '@/state/world';

export function Ticker() {
  const lines = useWorld((s) => s.ticker);
  return (
    <div className="ticker" aria-label="Sự kiện trên phố" aria-live="off">
      <strong>Trên phố:</strong>
      {lines.length === 0 ? (
        <span className="ticker-line dim">Phố đang yên ắng. Thả một xu cho phố có không khí.</span>
      ) : (
        lines.map((l) => (
          <span key={l.id} className="ticker-line">
            {l.text}
          </span>
        ))
      )}
    </div>
  );
}
