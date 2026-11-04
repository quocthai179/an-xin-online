'use client';

import { useState } from 'react';
import { isMuted, setMuted, unlockAudio } from '@/audio/sfx';
import { LIMITS } from '@/lib/rules';
import { ROLE_LABELS } from '@/lib/format';
import { useSession } from '@/state/session';
import { useUi } from '@/state/ui';
import { useWorld } from '@/state/world';
import { forgetSessionIdentity } from '@/backend/demo/identity';
import { WebStorageStore } from '@/backend/demo/db';

export function Hud({ onToggleView, sceneAvailable, view }: { onToggleView: () => void; sceneAvailable: boolean; view: '2d' | '3d' }) {
  const me = useSession((s) => s.me);
  const backend = useSession((s) => s.backend);
  const online = useWorld((s) => s.online);
  const setPanel = useUi((s) => s.setPanel);
  const [muted, setM] = useState(isMuted());
  const [menu, setMenu] = useState(false);
  const profile = me?.profile;
  const q = me?.quota;

  const toggleMute = () => {
    unlockAudio();
    setMuted(!muted);
    setM(!muted);
  };

  return (
    <header className={`hud${sceneAvailable && view === '3d' ? ' hud-3d' : ''}${menu ? ' open' : ''}`}>
      <div className="brand">
        <span aria-hidden>🪧</span> <strong>Phố Xin Việc</strong>
        <span className="online" title="Số người đang đi dạo">● {online} người đang đi dạo</span>
        <button className="btn small hud-burger" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label={menu ? 'Đóng menu' : 'Mở menu'}>
          {menu ? '✕' : '☰'}
        </button>
      </div>
      {profile && (
        <div className="me">
          <button className="chip-btn" onClick={() => setPanel({ kind: 'account' })} title="Đổi tên / vai trò">
            {profile.displayName} · {ROLE_LABELS[profile.role]}
            {profile.role === 'hr' && <small> · Chưa xác minh</small>}
          </button>
          {q && profile.role === 'hr' && (
            <span className="quota" title="Quota hôm nay">
              🪙 {LIMITS.xu.perDay - q.xuUsed}/{LIMITS.xu.perDay} · 💸 {LIMITS.invite.perDay - q.inviteUsed}/{LIMITS.invite.perDay}
            </span>
          )}
          {q && profile.role !== 'hr' && (
            <span className="quota" title="Xu tình thương hôm nay">
              💛 {LIMITS.love.perDay - q.loveUsed}/{LIMITS.love.perDay}
            </span>
          )}
        </div>
      )}
      <nav className="hud-actions" aria-label="Menu">
        {profile?.role === 'candidate' && (
          <button className="btn small primary" onClick={() => setPanel(me?.candidate ? { kind: 'candidate', id: me.candidate.id } : { kind: 'form' })}>
            {me?.candidate ? 'Hồ sơ của tôi' : '🪧 Ra ngồi'}
          </button>
        )}
        <button className="btn small" onClick={() => setPanel({ kind: 'inbox' })} aria-label={`Hộp thư, ${me?.unread ?? 0} chưa đọc`}>
          ✉️ Hộp thư{!!me?.unread && <b className="badge-count">{me.unread}</b>}
        </button>
        <button className="btn small" onClick={() => setPanel({ kind: 'board' })}>🏆 Xếp hạng</button>
        <button className="btn small" onClick={() => setPanel({ kind: 'temple' })}>🪔 Đền</button>
        {sceneAvailable && <button className="btn small" onClick={onToggleView}>{view === '2d' ? '🎮 Phố 3D' : '📋 Danh sách'}</button>}
        <button className="btn small ghost" onClick={toggleMute} aria-pressed={!muted} aria-label="Âm thanh" title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}>
          {muted ? '🔇' : '🔊'}
        </button>
        {backend?.mode === 'demo' && (
          <button
            className="btn small ghost"
            title="Tab này sẽ trở thành một người dùng demo khác"
            onClick={() => {
              forgetSessionIdentity(new WebStorageStore(window.sessionStorage));
              window.location.reload();
            }}
          >
            Đổi người (demo)
          </button>
        )}
      </nav>
    </header>
  );
}
