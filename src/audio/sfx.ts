// All sounds are synthesized with WebAudio, no asset files (DESIGN section 9).
const MUTE_KEY = 'pxv:muted';

let ctx: AudioContext | null = null;
let muted = false;
try {
  muted = typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1';
} catch {
  muted = false;
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/** Call from a user gesture (AC-13.4). */
export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === 'suspended') void c.resume();
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(v: boolean): void {
  muted = v;
  try {
    localStorage.setItem(MUTE_KEY, v ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function strike(c: AudioContext, out: AudioNode, t0: number, f: number, partials: readonly (readonly [number, number])[], decay: number) {
  for (const [mult, amp] of partials) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = f * mult;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(amp, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
    o.connect(g).connect(out);
    o.start(t0);
    o.stop(t0 + decay + 0.05);
  }
}

const METAL = [[1, 1], [2.76, 0.45], [5.4, 0.2]] as const;

function play(fn: (c: AudioContext, out: GainNode, t0: number) => void, gainDb = 0, base = 0.22): void {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  const out = c.createGain();
  out.gain.value = base * 10 ** (gainDb / 20);
  out.connect(c.destination);
  fn(c, out, c.currentTime);
}

/** "leng keng": two metallic strikes */
export function playCoin(gainDb = 0): void {
  play((c, out, t0) => {
    strike(c, out, t0, 2093, METAL, 0.55);
    strike(c, out, t0 + 0.09, 2637, METAL, 0.55);
  }, gainDb);
}

/** 500k: three rising strikes plus a paper rustle */
export function playNote(gainDb = 0): void {
  play((c, out, t0) => {
    [1568, 1976, 2349].forEach((f, i) => strike(c, out, t0 + i * 0.11, f, METAL, 0.6));
    const len = Math.floor(c.sampleRate * 0.25);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3500;
    const g = c.createGain();
    g.gain.value = 0.25;
    src.connect(bp).connect(g).connect(out);
    src.start(t0);
  }, gainDb);
}

/** Offer: gong plus a C-E-G arpeggio */
export function playOffer(gainDb = 0): void {
  play((c, out, t0) => {
    strike(c, out, t0, 110, [[1, 1], [2.4, 0.5]], 2.5);
    [523.25, 659.25, 783.99].forEach((f, i) => strike(c, out, t0 + 0.3 + i * 0.15, f, [[1, 0.6], [2, 0.2]], 0.7));
  }, gainDb);
}

export function playLove(gainDb = 0): void {
  play((c, out, t0) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(880, t0);
    o.frequency.exponentialRampToValueAtTime(1320, t0 + 0.12);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.8, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
    o.connect(g).connect(out);
    o.start(t0);
    o.stop(t0 + 0.3);
  }, gainDb);
}

/** Temple bell */
export function playIncense(gainDb = 0): void {
  play((c, out, t0) => strike(c, out, t0, 520, [[1, 1], [1.5, 0.4], [2, 0.25]], 2), gainDb);
}

export type SoundName = 'coin' | 'note' | 'offer' | 'love' | 'incense';
export function playSound(name: SoundName | null, gainDb = 0): void {
  if (name === 'coin') playCoin(gainDb);
  else if (name === 'note') playNote(gainDb);
  else if (name === 'offer') playOffer(gainDb);
  else if (name === 'love') playLove(gainDb);
  else if (name === 'incense') playIncense(gainDb);
}
