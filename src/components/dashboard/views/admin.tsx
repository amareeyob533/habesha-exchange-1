'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { timeAgo, formatTokenAmount } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion } from 'framer-motion'
import { Check, X, Loader2, RefreshCw, ShieldAlert, Inbox, Clock } from 'lucide-react'

interface AdminDeposit {
  id: string
  token: string
  network: string
  amount: number
  status: string
  createdAt: string
  user: { uid: string; email: string; name: string | null }
}

export function AdminView() {
  const { toast } = useToast()
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [deposits, setDeposits] = useState<AdminDeposit[]>([])
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch<{ deposits: AdminDeposit[] }>(`/api/admin/deposits?status=${tab}`)
      setDeposits(data.deposits)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to load', description: err.message })
    } finally {
      setLoading(false)
    }
  }, [tab, toast])

  useEffect(() => {
    load()
  }, [load])

  async function act(depositId: string, action: 'approve' | 'reject') {
    setActing(depositId)
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>(`/api/admin/deposits/${action}`, {
        method: 'POST',
        body: JSON.stringify({ depositId }),
      })
      toast({ title: action === 'approve' ? 'Deposit Approved' : 'Deposit Rejected', description: res.message })
      await load()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Action failed', description: err.message })
    } finally {
      setActing(null)
    }
  }

  const pendingCount = deposits.filter((d) => d.status === 'pending').length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
            <ShieldAlert className="h-6 w-6 text-gold" /> Admin · Deposit Approvals
          </h2>
          <p className="text-sm text-muted-foreground">Review and approve pending user deposits</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Pending alert */}
      {tab === 'pending' && pendingCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/5 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/15 text-gold animate-pulse-gold">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold">{pendingCount} deposit{pendingCount > 1 ? 's' : ''} awaiting your approval</div>
            <div className="text-xs text-muted-foreground">Funds are NOT credited until you click Approve.</div>
          </div>
        </motion.div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {deposits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
            <Inbox className="mb-2 h-8 w-8 opacity-30" />
            No {tab !== 'all' ? tab : ''} deposits
          </div>
        ) : (
          <>
            {/* Desktop table header */}
            <div className="hidden grid-cols-12 gap-2 border-b border-border px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground sm:grid">
              <div className="col-span-2">User</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-3">Network</div>
              <div className="col-span-2">Time</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            {deposits.map((d, i) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="grid grid-cols-12 items-center gap-2 border-b border-border/50 px-5 py-3.5 last:border-0 transition-colors hover:bg-secondary/30"
              >
                {/* User */}
                <div className="col-span-12 sm:col-span-2">
                  <div className="text-sm font-bold text-gold">UID {d.user.uid}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{d.user.email}</div>
                </div>
                {/* Amount */}
                <div className="col-span-6 sm:col-span-2">
                  <div className="font-mono text-sm font-bold">{formatTokenAmount(d.amount, d.token)}</div>
                  <div className="text-[11px] text-muted-foreground">{d.token}</div>
                </div>
                {/* Network */}
                <div className="col-span-6 sm:col-span-3 text-xs text-muted-foreground">{d.network}</div>
                {/* Time */}
                <div className="col-span-6 text-[11px] text-muted-foreground sm:col-span-2">{timeAgo(d.createdAt)}</div>
                {/* Status */}
                <div className="col-span-6 sm:col-span-1">
                  <StatusBadge status={d.status} />
                </div>
                {/* Actions */}
                <div className="col-span-12 flex justify-end gap-1.5 sm:col-span-2">
                  {d.status === 'pending' ? (
                    <>
                      <Button
                        size="sm"
                        className="h-8 bg-up text-white hover:bg-up/90"
                        disabled={acting === d.id}
                        onClick={() => act(d.id, 'approve')}
                      >
                        {acting === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-down/40 text-down hover:bg-down/10"
                        disabled={acting === d.id}
                        onClick={() => act(d.id, 'reject')}
                      >
                        {acting === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                        Reject
                      </Button>
                    </>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">—</span>
                  )}
                </div>
              </motion.div>
            ))}
          </>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        <b className="text-foreground">How this works:</b> When a user clicks "I Deposited", their balance is <b>not</b> credited. The deposit appears here as <b className="text-gold">Pending</b>. Click <b className="text-up">Approve</b> to credit their balance instantly, or <b className="text-down">Reject</b> to decline. An email with approve/reject links is also sent to {process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'amareeyob533@gmail.com'} (once SMTP is configured).
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-gold/15 text-gold',
    approved: 'bg-up/15 text-up',
    rejected: 'bg-down/15 text-down',
  }
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${map[status] || 'bg-secondary text-muted-foreground'}`}>{status}</span>
}
