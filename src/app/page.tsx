'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useUI } from '@/hooks/use-ui'
import { LandingPage } from '@/components/landing/landing-page'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { AuthModal } from '@/components/auth/auth-modal'
import { TokenDetailModal } from '@/components/modals/token-detail-modal'
import { BrandIntro, LogoLoader } from '@/components/common/logo-loader'

export default function Home() {
  const { user, authChecked, fetchMe } = useAuth()
  const { authOpen, authTab, closeAuth } = useUI()
  const [introDone, setIntroDone] = useState(false)

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  const booting = !introDone || !authChecked

  return (
    <>
      {introDone ? null : <BrandIntro onDone={() => setIntroDone(true)} />}

      {booting && introDone && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-background">
          <LogoLoader visible label="Loading" />
        </div>
      )}

      {!booting && (
        user ? <DashboardShell /> : <LandingPage />
      )}

      <AuthModal open={authOpen} onOpenChange={(v) => !v && closeAuth()} defaultTab={authTab} />
      <TokenDetailModal />
    </>
  )
}
