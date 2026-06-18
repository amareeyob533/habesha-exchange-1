'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { timeAgo, formatTokenAmount, shortAddr } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion } from 'framer-motion'
import { Check, X, Loader2, RefreshCw, ShieldAlert, Inbox, Clock, ArrowDownToLine, ArrowUpFromLine, ShieldCheck } from 'lucide-react'
import { KycAdmin } from '@/components/dashboard/views/admin-kyc'

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

type Section = 'deposits' | 'withdrawals' | 'kyc'
type StatusTab = 'pending' | 'approved' | 'rejected' | 'all'

export function AdminView() {
  const { toast } = useToast()
  const [section, setSection] = useState<Section>('deposits')
  const [statusTab, setStatusTab] = useState<StatusTab>('pending')
  const [deposits, setDeposits] = useState<AdminDeposit[]>([])
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([])
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState<string | null>(null)
  const [kycRefreshKey, setKycRefreshKey] = useState(0)

  const load = useCallback(async () => {
    if (section === 'kyc') {
      // KYC section loads its own data inside KycAdmin; just clear loading state.
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
            <ShieldAlert className="h-6 w-6 text-gold" /> Admin · Approvals
          </h2>
          <p className="text-sm text-muted-foreground">Review and approve user deposits & withdrawals</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { load(); setKycRefreshKey((k) => k + 1) }} disabled={loading}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Section toggle: Deposits / Withdrawals / KYC */}
      <div className="inline-flex rounded-xl border border-border bg-card p-1">
        <button
          onClick={() => { setSection('deposits'); setStatusTab('pending') }}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${section === 'deposits' ? 'bg-up/15 text-up' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <ArrowDownToLine className="h-4 w-4" /> Deposits
        </button>
        <button
          onClick={() => { setSection('withdrawals'); setStatusTab('pending') }}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${section === 'withdrawals' ? 'bg-down/15 text-down' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <ArrowUpFromLine className="h-4 w-4" /> Withdrawals
        </button>
        <button
          onClick={() => { setSection('kyc') }}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${section === 'kyc' ? 'bg-gold/15 text-gold' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <ShieldCheck className="h-4 w-4" /> KYC
        </button>
      </div>

      {/* Pending alert */}
      {statusTab === 'pending' && pendingCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/5 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/15 text-gold animate-pulse-gold">
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

      {section === 'kyc' ? (
        <KycAdmin refreshKey={kycRefreshKey} />
      ) : (
        <>
          <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as StatusTab)}>
            <TabsList>
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

          <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
            <b className="text-foreground">How this works:</b>
            {section === 'deposits' ? (
              <> When a user clicks "I Deposited", their balance is <b>not</b> credited. The deposit appears here as <b className="text-gold">Pending</b>. Click <b className="text-up">Approve</b> to credit their balance instantly, or <b className="text-down">Reject</b> to decline.</>
            ) : (
              <> When a user requests an external withdrawal, the amount is deducted from their balance and held as <b className="text-gold">Pending</b>. Click <b className="text-up">Approve</b> to confirm the withdrawal as sent, or <b className="text-down">Reject</b> to return the funds to the user. <b>Internal transfers</b> (UID to UID) are instant and do not appear here.</>
            )}
          </div>
        </>
      )}
    </div>
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
  if (deposits.length === 0) return <div className="overflow-hidden rounded-2xl border border-border bg-card"><EmptyState label="No deposits" /></div>
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
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
  if (withdrawals.length === 0) return <div className="overflow-hidden rounded-2xl border border-border bg-card"><EmptyState label="No withdrawals" /></div>
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
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
