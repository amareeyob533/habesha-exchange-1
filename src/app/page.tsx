'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useUI } from '@/hooks/use-ui'
import { LandingPage } from '@/components/landing/landing-page'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { AuthModal } from '@/components/auth/auth-modal'
import { TokenDetailModal } from '@/components/modals/token-detail-modal'
import { BrandIntro } from '@/components/common/logo-loader'
import { getStoredToken } from '@/lib/api-client'

export default function Home() {
  const { user, authChecked, fetchMe } = useAuth()
  const { authOpen, authTab, closeAuth } = useUI()
  const [introDone, setIntroDone] = useState(false)

  // Initial session restore.
  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  // AUTO-RETRY: If we have a stored token but fetchMe failed (e.g. the dev
  // server was restarting), retry every 5s until the session is restored.
  useEffect(() => {
    if (!authChecked) return
    if (user) return
    if (!getStoredToken()) return
    const id = setInterval(() => {
      fetchMe()
    }, 5000)
    return () => clearInterval(id)
  }, [authChecked, user, fetchMe])

  const booting = !introDone || !authChecked

  return (
    <>
      {/* Clean static splash — just logo + name, like Binance */}
      {introDone ? null : <BrandIntro onDone={() => setIntroDone(true)} />}

      {/* Once intro is done, show the app (even if auth is still checking) */}
      {!booting && (
        user ? <DashboardShell /> : <LandingPage />
      )}

      <AuthModal open={authOpen} onOpenChange={(v) => !v && closeAuth()} defaultTab={authTab} />
      <TokenDetailModal />
    </>
  )
}
