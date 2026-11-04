import { create } from 'zustand';
import type { Backend, Me } from '@/backend/types';

interface SessionState {
  backend: Backend | null;
  me: Me | null;
  ready: boolean;
  setBackend: (b: Backend) => void;
  setMe: (m: Me | null) => void;
  setReady: () => void;
  refreshMe: () => Promise<void>;
}

export const useSession = create<SessionState>((set, get) => ({
  backend: null,
  me: null,
  ready: false,
  setBackend: (backend) => set({ backend }),
  setMe: (me) => set({ me }),
  setReady: () => set({ ready: true }),
  refreshMe: async () => {
    const b = get().backend;
    if (!b) return;
    set({ me: await b.getMe() });
  },
}));
