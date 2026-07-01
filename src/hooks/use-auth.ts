'use client'

import { create } from 'zustand'
import { apiFetch, setStoredToken, clearStoredToken, getStoredToken } from '@/lib/api-client'
import { useUI } from '@/hooks/use-ui'

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
  username: string | null
  name: string | null
  avatarUrl: string | null
  provider: string
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
  signup: (email: string, password: string, name?: string, username?: string) => Promise<void>
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
    // If we have no stored token, there's nothing to fetch — avoid a 401 round-trip.
    if (!getStoredToken()) {
      set({ user: null, authChecked: true })
      return
    }
    try {
      const data = await apiFetch<{
        user: AuthUser | null
        balances: Balance[]
        totalUsd: number
        notifications: AppNotification[]
        blocked?: boolean
        blockedReason?: string
      }>('/api/auth/me')
      // Blocked accounts: clear the session and surface the reason.
      if (data.blocked) {
        clearStoredToken()
        set({ user: null, balances: [], totalUsd: 0, notifications: [], authChecked: true })
        if (typeof window !== 'undefined') {
          alert(data.blockedReason || 'Your account has been blocked.')
        }
        return
      }
      set({
        user: data.user,
        balances: data.balances || [],
        totalUsd: data.totalUsd || 0,
        notifications: data.notifications || [],
        authChecked: true,
      })
    } catch {
      clearStoredToken()
      set({ user: null, authChecked: true })
    }
  },

  login: async (email, password) => {
    set({ loading: true })
    try {
      const res = await apiFetch<{ token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      if (res.token) setStoredToken(res.token)
      useUI.getState().setView('overview')
      await get().fetchMe()
    } finally {
      set({ loading: false })
    }
  },

  signup: async (email, password, name, username) => {
    set({ loading: true })
    try {
      const res = await apiFetch<{ token: string }>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, name, username }),
      })
      if (res.token) setStoredToken(res.token)
      useUI.getState().setView('overview')
      await get().fetchMe()
    } finally {
      set({ loading: false })
    }
  },

  loginWithGoogle: async (profile) => {
    set({ loading: true })
    try {
      const res = await apiFetch<{ token: string }>('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify(profile),
      })
      if (res.token) setStoredToken(res.token)
      useUI.getState().setView('overview')
      await get().fetchMe()
    } finally {
      set({ loading: false })
    }
  },

  logout: async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore network errors on logout
    }
    clearStoredToken()
    set({ user: null, balances: [], totalUsd: 0, notifications: [] })
  },

  updateProfile: async (data) => {
    await apiFetch('/api/user', { method: 'PUT', body: JSON.stringify(data) })
    await get().fetchMe()
  },
}))
