'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api-client'

export interface UserSettings {
  defaultToken: string
  slippage: number
  showBalanceUsd: boolean
  compactView: boolean
  defaultNetwork: string
  autoConvertDust: boolean
  hideSmallBalances: boolean
  emailNotifs: boolean
  pushNotifs: boolean
  depositAlerts: boolean
  withdrawAlerts: boolean
}

const DEFAULTS: UserSettings = {
  defaultToken: 'USDT',
  slippage: 1.0,
  showBalanceUsd: true,
  compactView: false,
  defaultNetwork: 'TRON (TRC20)',
  autoConvertDust: false,
  hideSmallBalances: false,
  emailNotifs: true,
  pushNotifs: true,
  depositAlerts: true,
  withdrawAlerts: true,
}

/**
 * Hook that loads the user's settings from the API and provides a save function.
 * Used by the Settings page and by other views (wallet, exchange) to respect
 * the user's preferences.
 */
export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ settings: UserSettings }>('/api/user/settings')
      setSettings({ ...DEFAULTS, ...data.settings })
    } catch {
      // Use defaults if the API is unreachable
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = useCallback(async (partial: Partial<UserSettings>) => {
    setSaving(true)
    try {
      const data = await apiFetch<{ ok: boolean; settings: UserSettings }>('/api/user/settings', {
        method: 'POST',
        body: JSON.stringify(partial),
      })
      setSettings({ ...DEFAULTS, ...data.settings })
      return true
    } catch {
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  return { settings, loading, saving, save, reload: load }
}
