import { create } from 'zustand';

/** Ephemeral (non-persisted) UI state shared across the app shell. */
interface UIState {
  quickAddOpen: boolean;
  mobileMoreOpen: boolean;
  openQuickAdd: () => void;
  closeQuickAdd: () => void;
  setMobileMoreOpen: (open: boolean) => void;
}

export const useUI = create<UIState>()((set) => ({
  quickAddOpen: false,
  mobileMoreOpen: false,
  openQuickAdd: () => set({ quickAddOpen: true, mobileMoreOpen: false }),
  closeQuickAdd: () => set({ quickAddOpen: false }),
  setMobileMoreOpen: (mobileMoreOpen) => set({ mobileMoreOpen }),
}));
