'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { timeAgo, formatTokenAmount, shortAddr } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion } from 'framer-motion'
import { Check, X, Loader2, RefreshCw, ShieldAlert, Inbox, Clock, ArrowDownToLine, ArrowUpFromLine, Users, ShoppingCart, Headphones } from 'lucide-react'
import { UsersAdmin } from '@/components/dashboard/views/admin-users'
import { BuysAdmin } from '@/components/dashboard/views/admin-buys'
import { AdminSupport } from '@/components/dashboard/views/admin-support'

interface AdminDeposit {
  id: string
  token: string
  network: string
  amount: number
  status: string
  createdAt: string
  user: { uid: string; email: string; name: string | null }
}
interface AdminWithdrawal {
  id: string
  token: string
  network: string
  amount: number
  address: string
  status: string
  bankName: string | null
  accountName: string | null
  birrAmount: number | null
  createdAt: string
  user: { uid: string; email: string; name: string | null }
}

type Section = 'deposits' | 'withdrawals' | 'buys' | 'users' | 'support'
type StatusTab = 'pending' | 'approved' | 'rejected' | 'all'

export function AdminView() {
  const { toast } = useToast()
  const [section, setSection] = useState<Section>('deposits')
  const [statusTab, setStatusTab] = useState<StatusTab>('pending')
  const [deposits, setDeposits] = useState<AdminDeposit[]>([])
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([])
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (section === 'users' || section === 'buys' || section === 'support') {
      // These sections load their own data internally.
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      if (section === 'deposits') {
        // Map 'approved'/'rejected' to deposit statuses; 'all' passes through.
        const q = statusTab === 'approved' ? 'approved' : statusTab === 'rejected' ? 'rejected' : statusTab
        const data = await apiFetch<{ deposits: AdminDeposit[] }>(`/api/admin/deposits?status=${q}`)
        setDeposits(data.deposits)
      } else {
        const q = statusTab === 'approved' ? 'completed' : statusTab === 'rejected' ? 'rejected' : statusTab === 'all' ? 'all' : 'pending'
        const data = await apiFetch<{ withdrawals: AdminWithdrawal[] }>(`/api/admin/withdrawals?status=${q}`)
        setWithdrawals(data.withdrawals)
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to load', description: err.message })
    } finally {
      setLoading(false)
    }
  }, [section, statusTab, toast])

  useEffect(() => {
    load()
  }, [load])

  async function actDeposit(id: string, action: 'approve' | 'reject') {
    setActing(id)
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>(`/api/admin/deposits/${action}`, {
        method: 'POST',
        body: JSON.stringify({ depositId: id }),
      })
      toast({ title: action === 'approve' ? 'Deposit Approved' : 'Deposit Rejected', description: res.message })
      await load()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Action failed', description: err.message })
    } finally {
      setActing(null)
    }
  }

  async function actWithdrawal(id: string, action: 'approve' | 'reject') {
    setActing(id)
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>(`/api/admin/withdrawals/${action}`, {
        method: 'POST',
        body: JSON.stringify({ id }),
      })
      toast({ title: action === 'approve' ? 'Withdrawal Approved' : 'Withdrawal Rejected', description: res.message })
      await load()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Action failed', description: err.message })
    } finally {
      setActing(null)
    }
  }

  const pendingCount = (section === 'deposits' ? deposits : withdrawals).filter((d) => d.status === 'pending').length

  return (
    <div className="space-y-6">
      {/* Big hero header */}
      <div className="relative overflow-hidden rounded-3xl gradient-border glass-card p-8 shadow-gold-lg">
        <div className="bg-gold-glow pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full opacity-20" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold ring-2 ring-gold/20">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">Admin Panel</h1>
                <p className="text-sm text-muted-foreground">Manage deposits, withdrawals, buys, users & support</p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="lg" onClick={load} disabled={loading} className="border-gold/30 text-gold hover:bg-gold/10">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
          </Button>
        </div>
      </div>

      {/* Quick stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard icon={ArrowDownToLine} label="Deposits" color="text-up" onClick={() => { setSection('deposits'); setStatusTab('pending') }} active={section === 'deposits'} />
        <StatCard icon={ArrowUpFromLine} label="Withdrawals" color="text-down" onClick={() => { setSection('withdrawals'); setStatusTab('pending') }} active={section === 'withdrawals'} />
        <StatCard icon={ShoppingCart} label="Buys" color="text-gold" onClick={() => setSection('buys')} active={section === 'buys'} />
        <StatCard icon={Headphones} label="Support" color="text-chart-4" onClick={() => setSection('support')} active={section === 'support'} />
      </div>

      {/* Section toggle — big pill buttons (scrollable on mobile) */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <SectionPill icon={ArrowDownToLine} label="Deposits" active={section === 'deposits'} onClick={() => { setSection('deposits'); setStatusTab('pending') }} color="up" />
        <SectionPill icon={ArrowUpFromLine} label="Withdrawals" active={section === 'withdrawals'} onClick={() => { setSection('withdrawals'); setStatusTab('pending') }} color="down" />
        <SectionPill icon={ShoppingCart} label="Buys" active={section === 'buys'} onClick={() => setSection('buys')} color="gold" />
        <SectionPill icon={Users} label="Users" active={section === 'users'} onClick={() => setSection('users')} color="gold" />
        <SectionPill icon={Headphones} label="Support" active={section === 'support'} onClick={() => setSection('support')} color="chart-4" />
      </div>

      {/* Pending alert */}
      {statusTab === 'pending' && pendingCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/5 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/15 text-gold animate-pulse-gold">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold">{pendingCount} {section === 'deposits' ? 'deposit' : 'withdrawal'}{pendingCount > 1 ? 's' : ''} awaiting your approval</div>
            <div className="text-xs text-muted-foreground">
              {section === 'deposits'
                ? 'Funds are NOT credited until you click Approve.'
                : 'Funds are already deducted from the user. Approve to send, Reject to refund.'}
            </div>
          </div>
        </motion.div>
      )}

      {/* Content area */}
      <div className="min-h-[400px]">
        {section === 'users' ? (
          <UsersAdmin />
        ) : section === 'buys' ? (
          <BuysAdmin refreshKey={0} />
        ) : section === 'support' ? (
          <AdminSupport />
        ) : (
          <>
            <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as StatusTab)}>
              <TabsList className="mb-4">
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">{section === 'deposits' ? 'Approved' : 'Completed'}</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>

            {section === 'deposits' ? (
              <DepositsTable deposits={deposits} acting={acting} onAct={actDeposit} />
            ) : (
              <WithdrawalsTable withdrawals={withdrawals} acting={acting} onAct={actWithdrawal} />
            )}

            <div className="mt-6 rounded-xl glass-card p-4 text-xs text-muted-foreground">
              <b className="text-foreground">How this works:</b>
              {section === 'deposits'
                ? ' When a user clicks "I Deposited", their balance is not credited. The deposit appears here as Pending. Click Approve to credit their balance instantly, or Reject to decline.'
                : ' When a user requests an external withdrawal, the amount is deducted and held as Pending. Click Approve to confirm as sent, or Reject to return the funds. Internal transfers (UID to UID) are instant.'}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, color, onClick, active }: { icon: any; label: string; color: string; onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`group glass-card rounded-2xl p-5 text-left transition-all hover:shadow-gold ${active ? 'ring-2 ring-gold/40 shadow-gold' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/60 ${color} transition-transform group-hover:scale-110`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-bold">{label}</div>
          <div className="text-[10px] text-muted-foreground">Click to manage</div>
        </div>
      </div>
    </button>
  )
}

function SectionPill({ icon: Icon, label, active, onClick, color }: { icon: any; label: string; active: boolean; onClick: () => void; color: string }) {
  const colorMap: Record<string, string> = {
    up: 'bg-up/15 text-up',
    down: 'bg-down/15 text-down',
    gold: 'bg-gold/15 text-gold',
    'chart-4': 'bg-chart-4/15 text-chart-4',
  }
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
        active ? colorMap[color] : 'bg-secondary/30 text-muted-foreground hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
      <Inbox className="mb-2 h-8 w-8 opacity-30" />
      {label}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-gold/15 text-gold',
    approved: 'bg-up/15 text-up',
    completed: 'bg-up/15 text-up',
    rejected: 'bg-down/15 text-down',
  }
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${map[status] || 'bg-secondary text-muted-foreground'}`}>{status}</span>
}

function DepositsTable({ deposits, acting, onAct }: { deposits: AdminDeposit[]; acting: string | null; onAct: (id: string, action: 'approve' | 'reject') => void }) {
  if (deposits.length === 0) return <div className="overflow-hidden glass-card rounded-2xl shadow-premium"><EmptyState label="No deposits" /></div>
  return (
    <div className="overflow-hidden glass-card rounded-2xl shadow-premium">
      <div className="hidden grid-cols-12 gap-2 border-b border-border px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground sm:grid">
        <div className="col-span-2">User</div>
        <div className="col-span-2">Amount</div>
        <div className="col-span-3">Network</div>
        <div className="col-span-2">Time</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>
      {deposits.map((d, i) => (
        <motion.div key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="grid grid-cols-12 items-center gap-2 border-b border-border/50 px-5 py-3.5 last:border-0 transition-colors hover:bg-secondary/30">
          <div className="col-span-12 sm:col-span-2">
            <div className="text-sm font-bold text-gold">UID {d.user.uid}</div>
            <div className="truncate text-[11px] text-muted-foreground">{d.user.email}</div>
          </div>
          <div className="col-span-6 sm:col-span-2">
            <div className="font-mono text-sm font-bold">{formatTokenAmount(d.amount, d.token)}</div>
            <div className="text-[11px] text-muted-foreground">{d.token}</div>
          </div>
          <div className="col-span-6 sm:col-span-3 text-xs text-muted-foreground">{d.network}</div>
          <div className="col-span-6 text-[11px] text-muted-foreground sm:col-span-2">{timeAgo(d.createdAt)}</div>
          <div className="col-span-6 sm:col-span-1"><StatusBadge status={d.status} /></div>
          <div className="col-span-12 flex justify-end gap-1.5 sm:col-span-2">
            {d.status === 'pending' ? (
              <>
                <Button size="sm" className="h-8 bg-up text-white hover:bg-up/90" disabled={acting === d.id} onClick={() => onAct(d.id, 'approve')}>
                  {acting === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve
                </Button>
                <Button size="sm" variant="outline" className="h-8 border-down/40 text-down hover:bg-down/10" disabled={acting === d.id} onClick={() => onAct(d.id, 'reject')}>
                  {acting === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Reject
                </Button>
              </>
            ) : <span className="text-[11px] text-muted-foreground">—</span>}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function WithdrawalsTable({ withdrawals, acting, onAct }: { withdrawals: AdminWithdrawal[]; acting: string | null; onAct: (id: string, action: 'approve' | 'reject') => void }) {
  if (withdrawals.length === 0) return <div className="overflow-hidden glass-card rounded-2xl shadow-premium"><EmptyState label="No withdrawals" /></div>
  return (
    <div className="overflow-hidden glass-card rounded-2xl shadow-premium">
      <div className="hidden grid-cols-12 gap-2 border-b border-border px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground sm:grid">
        <div className="col-span-2">User</div>
        <div className="col-span-2">Amount</div>
        <div className="col-span-2">Network</div>
        <div className="col-span-3">Destination</div>
        <div className="col-span-1">Time</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-1 text-right">Actions</div>
      </div>
      {withdrawals.map((w, i) => {
        const isBank = w.network === 'bank'
        return (
          <motion.div key={w.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="grid grid-cols-12 items-start gap-2 border-b border-border/50 px-5 py-3.5 last:border-0 transition-colors hover:bg-secondary/30">
            <div className="col-span-12 sm:col-span-2">
              <div className="text-sm font-bold text-gold">UID {w.user.uid}</div>
              <div className="truncate text-[11px] text-muted-foreground">{w.user.email}</div>
            </div>
            <div className="col-span-6 sm:col-span-2">
              <div className="font-mono text-sm font-bold">{formatTokenAmount(w.amount, w.token)}</div>
              <div className="text-[11px] text-muted-foreground">{w.token}</div>
              {isBank && w.birrAmount != null && (
                <div className="mt-0.5 text-[11px] font-bold text-gold">≈ {Number(w.birrAmount).toLocaleString('en-US')} ETB</div>
              )}
            </div>
            <div className="col-span-6 text-xs sm:col-span-2">
              {isBank ? (
                <span className="inline-flex items-center gap-1 rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-gold">BANK · {w.bankName}</span>
              ) : (
                <span className="text-muted-foreground">{w.network}</span>
              )}
            </div>
            <div className="col-span-12 sm:col-span-3">
              {isBank ? (
                <div className="space-y-0.5 text-[11px]">
                  <div className="font-mono text-muted-foreground" title={w.address}>Acct: {w.address}</div>
                  <div className="text-muted-foreground">Name: {w.accountName}</div>
                </div>
              ) : (
                <div className="truncate font-mono text-[11px] text-muted-foreground" title={w.address}>{shortAddr(w.address, 8)}</div>
              )}
            </div>
            <div className="col-span-6 text-[11px] text-muted-foreground sm:col-span-1">{timeAgo(w.createdAt)}</div>
            <div className="col-span-6 sm:col-span-1"><StatusBadge status={w.status} /></div>
            <div className="col-span-12 flex justify-end gap-1.5 sm:col-span-1">
              {w.status === 'pending' ? (
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-8 bg-up px-2 text-white hover:bg-up/90" disabled={acting === w.id} onClick={() => onAct(w.id, 'approve')} title="Approve">
                    {acting === w.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 border-down/40 px-2 text-down hover:bg-down/10" disabled={acting === w.id} onClick={() => onAct(w.id, 'reject')} title="Reject & refund">
                    {acting === w.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              ) : <span className="text-[11px] text-muted-foreground">—</span>}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
