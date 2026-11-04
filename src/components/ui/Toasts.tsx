'use client';

import { useUi } from '@/state/ui';

const ICON = { info: 'ℹ️', coin: '🪙', note: '💸', offer: '🎉', love: '💛', error: '⚠️' } as const;

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  const dismiss = useUi((s) => s.dismiss);
  const setPanel = useUi((s) => s.setPanel);
  return (
    <div className="toasts" aria-live="polite" role="status">
      {toasts.map((t) => (
        <div key={t.id} className={`toast tone-${t.tone}${t.prominent ? ' prominent' : ''}`}>
          <span className="toast-icon" aria-hidden>
            {ICON[t.tone]}
          </span>
          <span className="toast-text">{t.text}</span>
          {t.action && (
            <button
              className="btn small"
              onClick={() => {
                setPanel(t.action!.panel);
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
          <button className="icon-btn" onClick={() => dismiss(t.id)} aria-label="Đóng thông báo">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
