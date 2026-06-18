'use client'

import { create } from 'zustand'
import { apiFetch } from '@/lib/api-client'

export interface Balance {
  symbol: string
  name: string
  amount: number
  usdValue: number
  price: number
  color: string
  icon: string
}
export interface AppNotification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
}
export interface AuthUser {
  id: string
  uid: string
  email: string
  name: string | null
  avatarUrl: string | null
  provider: string
  kycStatus: string
  kycLevel: string
  country?: string | null
  phone?: string | null
  createdAt: string
}

interface AuthState {
  user: AuthUser | null
  balances: Balance[]
  totalUsd: number
  notifications: AppNotification[]
  loading: boolean
  authChecked: boolean
  fetchMe: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name?: string) => Promise<void>
  loginWithGoogle: (profile: { email: string; name?: string; avatarUrl?: string }) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: { name?: string; country?: string; phone?: string }) => Promise<void>
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  balances: [],
  totalUsd: 0,
  notifications: [],
  loading: false,
  authChecked: false,

  fetchMe: async () => {
    try {
      const data = await apiFetch<{ user: AuthUser | null; balances: Balance[]; totalUsd: number; notifications: AppNotification[] }>('/api/auth/me')
      set({
        user: data.user,
        balances: data.balances || [],
        totalUsd: data.totalUsd || 0,
        notifications: data.notifications || [],
        authChecked: true,
      })
    } catch {
      set({ user: null, authChecked: true })
    }
  },

  login: async (email, password) => {
    set({ loading: true })
    try {
      await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      await get().fetchMe()
    } finally {
      set({ loading: false })
    }
  },

  signup: async (email, password, name) => {
    set({ loading: true })
    try {
      await apiFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      })
      await get().fetchMe()
    } finally {
      set({ loading: false })
    }
  },

  loginWithGoogle: async (profile) => {
    set({ loading: true })
    try {
      await apiFetch('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify(profile),
      })
      await get().fetchMe()
    } finally {
      set({ loading: false })
    }
  },

  logout: async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' })
    set({ user: null, balances: [], totalUsd: 0, notifications: [] })
  },

  updateProfile: async (data) => {
    await apiFetch('/api/user', { method: 'PUT', body: JSON.stringify(data) })
    await get().fetchMe()
  },
}))
