import { create } from 'zustand';
import type { ZoneId } from '@/lib/rules';

export type Panel =
  | { kind: 'none' }
  | { kind: 'candidate'; id: string }
  | { kind: 'form' }
  | { kind: 'inbox' }
  | { kind: 'board' }
  | { kind: 'temple' }
  | { kind: 'invite'; id: string }
  | { kind: 'offer'; id: string }
  | { kind: 'account' };

export interface Toast {
  id: number;
  key?: string;
  tone: 'info' | 'coin' | 'note' | 'offer' | 'love' | 'error';
  text: string;
  prominent?: boolean;
  action?: { label: string; panel: Panel };
}

interface UiState {
  panel: Panel;
  toasts: Toast[];
  muted: boolean;
  focusZone: ZoneId;
  setFocusZone: (z: ZoneId) => void;
  setPanel: (p: Panel) => void;
  close: () => void;
  setMutedState: (m: boolean) => void;
  toast: (t: Omit<Toast, 'id'>) => number;
  dismiss: (id: number) => void;
}

let nextId = 1;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

export const useUi = create<UiState>((set, get) => ({
  panel: { kind: 'none' },
  toasts: [],
  muted: false,
  focusZone: 'backend',
  setFocusZone: (focusZone) => set({ focusZone }),
  setPanel: (panel) => set({ panel }),
  close: () => set({ panel: { kind: 'none' } }),
  setMutedState: (muted) => set({ muted }),
  toast: (t) => {
    const existing = t.key ? get().toasts.find((x) => x.key === t.key) : undefined;
    const id = existing?.id ?? nextId++;
    set((s) => ({
      toasts: existing
        ? s.toasts.map((x) => (x.id === id ? { ...x, ...t, id } : x))
        : [...s.toasts, { ...t, id }].slice(-4),
    }));
    const prev = timers.get(id);
    if (prev) clearTimeout(prev);
    timers.set(id, setTimeout(() => get().dismiss(id), t.prominent ? 12_000 : 5_000));
    return id;
  },
  dismiss: (id) => {
    const t = timers.get(id);
    if (t) clearTimeout(t);
    timers.delete(id);
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
  },
}));
