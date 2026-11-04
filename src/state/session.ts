import { create } from 'zustand';
import type { Backend, Me } from '@/backend/types';

interface SessionState {
  backend: Backend | null;
  me: Me | null;
  ready: boolean;
  /** remote backend lost its connection (never true in demo mode) */
  offline: boolean;
  setOffline: (v: boolean) => void;
  setBackend: (b: Backend) => void;
  setMe: (m: Me | null) => void;
  setReady: () => void;
  refreshMe: () => Promise<void>;
}

export const useSession = create<SessionState>((set, get) => ({
  backend: null,
  me: null,
  ready: false,
  offline: false,
  setOffline: (offline) => set({ offline }),
  setBackend: (backend) => set({ backend }),
  setMe: (me) => set({ me }),
  setReady: () => set({ ready: true }),
  refreshMe: async () => {
    const b = get().backend;
    if (!b) return;
    set({ me: await b.getMe() });
  },
}));
