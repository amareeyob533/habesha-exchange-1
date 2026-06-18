'use client'

import { useAuth } from '@/hooks/use-auth'
import { useUI } from '@/hooks/use-ui'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ShieldCheck, ShieldAlert, Clock, ScanFace, IdCard, RefreshCw, CheckCircle2 } from 'lucide-react'

export function KycView() {
  const { user, fetchMe } = useAuth()
  const { openKyc } = useUI()
  const status = user?.kycStatus || 'none'
  const level = user?.kycLevel || 'none'

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Account Verification</h2>
        <p className="text-sm text-muted-foreground">Complete KYC to unlock deposits & withdrawals</p>
      </div>

      {/* Status banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-gold/10 via-card to-card p-6">
        <div className="bg-gold-glow pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-40" />
        <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
              status === 'approved' ? 'bg-up/15 text-up ring-2 ring-up/30' : status === 'pending' ? 'bg-gold/15 text-gold ring-2 ring-gold/30' : 'bg-down/15 text-down ring-2 ring-down/30'
            }`}>
              {status === 'approved' ? <ShieldCheck className="h-7 w-7" /> : status === 'pending' ? <Clock className="h-7 w-7" /> : <ShieldAlert className="h-7 w-7" />}
            </div>
            <div>
              <div className="text-lg font-bold">
                {status === 'approved' ? `${level === 'high' ? 'High KYC' : 'Normal KYC'} Verified` : status === 'pending' ? 'Verification Under Review' : 'Not Verified'}
              </div>
              <div className="text-sm text-muted-foreground">
                {status === 'approved'
                  ? level === 'high' ? 'Unlimited deposits & withdrawals enabled.' : 'Deposits & withdrawals enabled (limit $100,000).'
                  : status === 'pending'
                  ? 'Usually approved within a few seconds. Refresh to check.'
                  : 'Complete verification to enable deposits & withdrawals.'}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {status === 'pending' && (
              <Button variant="outline" onClick={() => fetchMe()}><RefreshCw className="mr-1 h-4 w-4" /> Refresh</Button>
            )}
            {status !== 'pending' && status !== 'approved' && (
              <Button className="bg-gold-gradient font-semibold text-primary-foreground" onClick={openKyc}>Start Verification</Button>
            )}
            {status === 'approved' && level === 'normal' && (
              <Button variant="outline" className="border-gold/30 text-gold" onClick={openKyc}>Upgrade to High KYC</Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Levels comparison */}
      <div className="grid gap-4 md:grid-cols-2">
        <KycLevelCard
          active={level === 'normal'}
          title="Normal KYC"
          icon={ScanFace}
          requirement="Live face check"
          benefits={['Deposits enabled', 'Withdrawals enabled', 'Max limit: $100,000', 'Internal transfers']}
          cta={status === 'none' ? 'Verify Normal' : undefined}
          onCta={openKyc}
        />
        <KycLevelCard
          active={level === 'high'}
          highlight
          title="High KYC"
          icon={IdCard}
          requirement="National ID + live selfie"
          benefits={['Everything in Normal KYC', 'Unlimited deposits', 'Unlimited withdrawals', 'Priority support']}
          cta={status === 'none' || level === 'normal' ? 'Verify High' : undefined}
          onCta={openKyc}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        <b className="text-foreground">Note:</b> For verification purposes, KYC submissions are currently auto-reviewed within ~30 seconds. In production, our compliance team manually reviews each application.
      </div>
    </div>
  )
}

function KycLevelCard({ active, highlight, title, icon: Icon, requirement, benefits, cta, onCta }: {
  active: boolean
  highlight?: boolean
  title: string
  icon: any
  requirement: string
  benefits: string[]
  cta?: string
  onCta?: () => void
}) {
  return (
    <div className={`relative rounded-2xl border p-6 transition-colors ${highlight ? 'border-gold/40 bg-gold/5' : 'border-border bg-card'} ${active ? 'ring-2 ring-up/40' : ''}`}>
      {highlight && <span className="absolute right-4 top-4 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">RECOMMENDED</span>}
      {active && <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-up/15 px-2 py-0.5 text-[10px] font-bold text-up"><CheckCircle2 className="h-3 w-3" /> ACTIVE</span>}
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${highlight ? 'bg-gold/20' : 'bg-secondary'} text-gold`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-lg font-bold">{title}</div>
          <div className="text-xs text-muted-foreground">Requirement: {requirement}</div>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {benefits.map((b) => (
          <li key={b} className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-up" /> {b}
          </li>
        ))}
      </ul>
      {cta && <Button className={`mt-5 w-full font-semibold ${highlight ? 'bg-gold-gradient text-primary-foreground' : 'variant-outline'}`} variant={highlight ? 'default' : 'outline'} onClick={onCta}>{cta}</Button>}
    </div>
  )
}
