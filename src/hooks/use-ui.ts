'use client'

import { create } from 'zustand'

export type ViewKey = 'overview' | 'markets' | 'wallet' | 'exchange' | 'transactions' | 'support' | 'profile' | 'admin'

interface ModalState {
  view: ViewKey
  setView: (v: ViewKey) => void
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
  // modals
  depositToken: string | null
  withdrawToken: string | null
  transferToken: string | null
  buyOpen: boolean
  supportOpen: boolean
  notifOpen: boolean
  openDeposit: (t: string) => void
  openWithdraw: (t: string) => void
  openTransfer: (t: string) => void
  openBuy: () => void
  openSupport: () => void
  openNotif: () => void
  closeAll: () => void
  // token detail modal (chart)
  tokenDetail: string | null
  openTokenDetail: (symbol: string) => void
  // auth modal
  authOpen: boolean
  authTab: 'login' | 'signup'
  openAuth: (tab?: 'login' | 'signup') => void
  closeAuth: () => void
}

export const useUI = create<ModalState>((set) => ({
  view: 'overview',
  setView: (v) => set({ view: v, sidebarOpen: false }),
  sidebarOpen: false,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  depositToken: null,
  withdrawToken: null,
  transferToken: null,
  buyOpen: false,
  supportOpen: false,
  notifOpen: false,
  openDeposit: (t) => set({ depositToken: t }),
  openWithdraw: (t) => set({ withdrawToken: t }),
  openTransfer: (t) => set({ transferToken: t }),
  openBuy: () => set({ buyOpen: true }),
  openSupport: () => set({ supportOpen: true }),
  openNotif: () => set({ notifOpen: true }),
  closeAll: () =>
    set({ depositToken: null, withdrawToken: null, transferToken: null, supportOpen: false, notifOpen: false }),
  tokenDetail: null,
  openTokenDetail: (symbol) => set({ tokenDetail: symbol }),
  authOpen: false,
  authTab: 'login',
  openAuth: (tab = 'login') => set({ authOpen: true, authTab: tab }),
  closeAuth: () => set({ authOpen: false }),
}))
