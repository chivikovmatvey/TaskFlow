import { create } from 'zustand'

export const useModalStore = create((set) => ({
  count: 0,
  open: () => set((s) => ({ count: s.count + 1 })),
  close: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
}))

export const selectIsAnyModalOpen = (s) => s.count > 0
