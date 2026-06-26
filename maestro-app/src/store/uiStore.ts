// src/store/uiStore.ts — Zustand UI state store
import { create } from 'zustand';

interface UIStore {
  activeCaseId: string | null;
  activeStage: string | null;
  sidebarOpen: boolean;
  activeView: string;
  setActiveCaseId: (id: string | null) => void;
  setActiveStage: (stage: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveView: (view: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeCaseId: null,
  activeStage: null,
  sidebarOpen: true,
  activeView: 'dashboard',
  setActiveCaseId: (id) => set({ activeCaseId: id }),
  setActiveStage: (stage) => set({ activeStage: stage }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveView: (view) => set({ activeView: view }),
}));
