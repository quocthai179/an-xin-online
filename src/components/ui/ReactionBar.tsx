'use client';

import { useState } from 'react';
import type { ReactionEmoji } from '@/backend/types';
import { REACTION_COOLDOWN_MS } from '@/backend/topics';
import { input } from '@/state/input';
import { onPeerReaction } from '@/state/peers';
import { useSession } from '@/state/session';
import { useUi } from '@/state/ui';
import { playLove } from '@/audio/sfx';

const REACTIONS: { key: ReactionEmoji; emoji: string; label: string }[] = [
  { key: 'heart', emoji: '❤️', label: 'Thả tim' },
  { key: 'laugh', emoji: '😂', label: 'Cười' },
  { key: 'pray', emoji: '🙏', label: 'Cầu nguyện' },
  { key: 'fire', emoji: '🔥', label: 'Cháy' },
];

/** Four fixed emoji, 1 per 3 s per user (enforced by PresenceApi, the bar mirrors it with a cooldown state). */
export function ReactionBar() {
  const backend = useSession((s) => s.backend);
  const [cool, setCool] = useState(false);
  const send = (key: ReactionEmoji) => {
    if (!backend || cool) return;
    const { x, z } = input.player;
    const ok = backend.presence.sendReaction(key, x, z);
    if (!ok) {
      useUi.getState().toast({ key: 'react-cd', tone: 'info', text: 'Từ từ thôi, mỗi 3 giây thả một cảm xúc nhé.' });
      return;
    }
    onPeerReaction('me', key, x, z);
    if (key === 'heart') playLove();
    setCool(true);
    setTimeout(() => setCool(false), REACTION_COOLDOWN_MS);
  };
  return (
    <div className={`reaction-bar${cool ? ' cooling' : ''}`} role="group" aria-label="Cảm xúc">
      {REACTIONS.map((r) => (
        <button key={r.key} className="react-btn" onClick={() => send(r.key)} aria-label={r.label} disabled={cool}>
          {r.emoji}
        </button>
      ))}
    </div>
  );
}
