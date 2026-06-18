'use client'

import { create } from 'zustand'

export type ViewKey = 'overview' | 'markets' | 'wallet' | 'transactions' | 'kyc' | 'support' | 'profile'

interface ModalState {
  view: ViewKey
  setView: (v: ViewKey) => void
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
  // modals
  depositToken: string | null
  withdrawToken: string | null
  transferToken: string | null
  kycOpen: boolean
  supportOpen: boolean
  notifOpen: boolean
  openDeposit: (t: string) => void
  openWithdraw: (t: string) => void
  openTransfer: (t: string) => void
  openKyc: () => void
  openSupport: () => void
  openNotif: () => void
  closeAll: () => void
}

export const useUI = create<ModalState>((set) => ({
  view: 'overview',
  setView: (v) => set({ view: v, sidebarOpen: false }),
  sidebarOpen: false,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  depositToken: null,
  withdrawToken: null,
  transferToken: null,
  kycOpen: false,
  supportOpen: false,
  notifOpen: false,
  openDeposit: (t) => set({ depositToken: t }),
  openWithdraw: (t) => set({ withdrawToken: t }),
  openTransfer: (t) => set({ transferToken: t }),
  openKyc: () => set({ kycOpen: true }),
  openSupport: () => set({ supportOpen: true }),
  openNotif: () => set({ notifOpen: true }),
  closeAll: () =>
    set({ depositToken: null, withdrawToken: null, transferToken: null, kycOpen: false, supportOpen: false, notifOpen: false }),
}))
