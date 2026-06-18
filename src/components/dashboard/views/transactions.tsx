'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { apiFetch } from '@/lib/api-client'
import { formatTokenAmount, timeAgo, shortAddr } from '@/lib/format'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { RefreshCw, ArrowDownToLine, ArrowUpFromLine, Send, Gift, Download, Undo2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface Tx {
  id: string
  type: string
  token: string
  amount: number
  status: string
  counterpartyUid: string | null
  network: string | null
  address: string | null
  note: string | null
  createdAt: string
}
interface Transfer {
  id: string
  token: string
  amount: number
  status: string
  createdAt: string
  fromUserId: string
  toUserId: string
  fromUser: { uid: string }
  toUser: { uid: string }
}

const TYPE_META: Record<string, { icon: any; label: string; color: string; sign: string }> = {
  deposit: { icon: ArrowDownToLine, label: 'Deposit', color: 'text-up', sign: '+' },
  withdraw: { icon: ArrowUpFromLine, label: 'Withdrawal', color: 'text-down', sign: '-' },
  transfer_in: { icon: Download, label: 'Transfer In', color: 'text-up', sign: '+' },
  transfer_out: { icon: Send, label: 'Transfer Out', color: 'text-down', sign: '-' },
  airdrop: { icon: Gift, label: 'Airdrop', color: 'text-up', sign: '+' },
  refund: { icon: Undo2, label: 'Refund', color: 'text-up', sign: '+' },
}

export function TransactionsView() {
  const { fetchMe } = useAuth()
  const [tab, setTab] = useState<'all' | 'deposit' | 'withdraw' | 'transfer'>('all')
  const [txs, setTxs] = useState<Tx[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch<{ transactions: Tx[]; transfers: Transfer[] }>('/api/transactions')
      setTxs(data.transactions)
      setTransfers(data.transfers)
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    fetchMe()
  }, [load, fetchMe])

  const filtered = txs.filter((t) => {
    if (tab === 'all') return true
    if (tab === 'deposit') return t.type === 'deposit'
    if (tab === 'withdraw') return t.type === 'withdraw'
    if (tab === 'transfer') return t.type === 'transfer_in' || t.type === 'transfer_out'
    return true
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Transactions</h2>
          <p className="text-sm text-muted-foreground">Your deposit, withdrawal & transfer history</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="deposit">Deposits</TabsTrigger>
          <TabsTrigger value="withdraw">Withdrawals</TabsTrigger>
          <TabsTrigger value="transfer">Transfers</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
            <RefreshCw className="mb-2 h-7 w-7 opacity-30" />
            No transactions yet
          </div>
        ) : (
          filtered.map((t, i) => {
            const meta = TYPE_META[t.type] || TYPE_META.airdrop
            const Icon = meta.icon
            const isOut = t.type === 'withdraw' || t.type === 'transfer_out'
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center gap-3 border-b border-border/50 px-4 py-3.5 last:border-0 transition-colors hover:bg-secondary/30"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/60 ${meta.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {meta.label}
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {t.type === 'transfer_out' && t.counterpartyUid ? `To UID ${t.counterpartyUid}` : ''}
                    {t.type === 'transfer_in' && t.counterpartyUid ? `From UID ${t.counterpartyUid}` : ''}
                    {t.type === 'deposit' && t.network ? `${t.network}` : ''}
                    {t.type === 'withdraw' && t.address ? `${t.network === 'internal' ? `UID ${t.address}` : shortAddr(t.address)}` : ''}
                    {t.type === 'airdrop' && t.note ? t.note : ''}
                    {' · '}{timeAgo(t.createdAt)}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-mono text-sm font-bold ${isOut ? 'text-down' : 'text-up'}`}>
                    {meta.sign}{formatTokenAmount(t.amount, t.token)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{t.token}</div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'bg-up/15 text-up',
    pending: 'bg-gold/15 text-gold',
    failed: 'bg-down/15 text-down',
  }
  return <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${map[status] || 'bg-secondary text-muted-foreground'}`}>{status}</span>
}
