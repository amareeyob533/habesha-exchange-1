'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { LandingPage } from '@/components/landing/landing-page'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { AuthModal } from '@/components/auth/auth-modal'
import { BrandIntro, LogoLoader } from '@/components/common/logo-loader'

export default function Home() {
  const { user, authChecked, fetchMe } = useAuth()
  const [introDone, setIntroDone] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login')

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  function openAuth(tab: 'login' | 'signup') {
    setAuthTab(tab)
    setAuthOpen(true)
  }

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
        user ? <DashboardShell /> : <LandingPage onAuth={openAuth} />
      )}

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultTab={authTab} />
    </>
  )
}
