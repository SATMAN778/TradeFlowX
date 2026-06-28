// src/store/authStore.ts — Zustand auth store (Blueprint v3)
import { create } from 'zustand';

interface AuthStore {
  userId: string;
  roles: string[];
  sessionId: string;
  isAdmin: boolean;
  userName: string | null;
  userEmail: string | null;
  setAuth: (payload: Partial<AuthStore>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  userId: '',
  roles: [],
  sessionId: '',
  isAdmin: false,
  userName: null,
  userEmail: null,
  setAuth: (payload) => set((state) => ({ ...state, ...payload })),
  clearAuth: () => set({
    userId: '',
    roles: [],
    sessionId: '',
    isAdmin: false,
    userName: null,
    userEmail: null,
  }),
}));
