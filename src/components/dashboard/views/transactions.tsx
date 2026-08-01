'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { apiFetch } from '@/lib/api-client'
import { formatTokenAmount, timeAgo, shortAddr } from '@/lib/format'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { RefreshCw, ArrowDownToLine, ArrowUpFromLine, Send, Gift, Download, Undo2, ChevronDown, Landmark, ShoppingCart, Wallet, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
  buy: { icon: ShoppingCart, label: 'Buy Order', color: 'text-up', sign: '+' },
  reward: { icon: Gift, label: 'Reward', color: 'text-up', sign: '+' },
}

export function TransactionsView() {
  const { fetchMe } = useAuth()
  const [tab, setTab] = useState<'all' | 'deposit' | 'withdraw' | 'transfer'>('all')
  const [txs, setTxs] = useState<Tx[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

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

  /**
   * Parse the transaction `note` field to extract structured details.
   * Bank withdrawal notes look like:
   *   "Bank withdrawal approved → CBE · Amare Yalew · 0718373923 · 9300 ETB"
   * Buy order notes look like:
   *   "Buy order approved — 9300 ETB via CBE"
   */
  function parseNote(note: string | null, type: string, network: string | null): { bank?: string; accountName?: string; accountNo?: string; etb?: string } {
    if (!note) return {}
    const result: any = {}
    // Bank withdrawal: "Bank withdrawal approved → CBE · Amare Yalew · 0718373923 · 9300 ETB"
    if (note.includes('→') && note.includes('·')) {
      const parts = note.split('→')[1].split('·').map((p) => p.trim())
      if (parts[0]) result.bank = parts[0]
      if (parts[1]) result.accountName = parts[1]
      if (parts[2]) result.accountNo = parts[2]
      if (parts[3]) result.etb = parts[3]
    }
    // Buy order: "Buy order approved — 9300 ETB via CBE"
    if (note.includes('ETB via') || note.includes('ETB ·')) {
      const etbMatch = note.match(/([\d,.]+)\s*ETB/i)
      if (etbMatch) result.etb = etbMatch[1] + ' ETB'
      const bankMatch = note.match(/via\s+(\w[\w\s-]*)/i)
      if (bankMatch) result.bank = bankMatch[1].trim()
    }
    return result
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Transactions</h2>
          <p className="text-sm text-muted-foreground">Your deposit, withdrawal & transfer history · tap for details</p>
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

      <div className="overflow-hidden glass-card rounded-2xl shadow-premium">
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
            const isExpanded = expandedId === t.id
            const details = parseNote(t.note, t.type, t.network)
            const hasDetails = t.note || t.address || t.network

            return (
              <div key={t.id}>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => hasDetails ? setExpandedId(isExpanded ? null : t.id) : undefined}
                  className={`flex w-full items-center gap-3 border-b border-border/50 px-4 py-3.5 text-left transition-colors ${
                    hasDetails ? 'cursor-pointer hover:bg-secondary/40' : 'cursor-default'
                  } ${isExpanded ? 'bg-secondary/30' : ''}`}
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
                      {t.type === 'buy' && t.note ? t.note : ''}
                      {t.type === 'airdrop' && t.note ? t.note : ''}
                      {t.type === 'reward' && t.note ? t.note : ''}
                      {' · '}{timeAgo(t.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono text-sm font-bold ${isOut ? 'text-down' : 'text-up'}`}>
                      {meta.sign}{formatTokenAmount(t.amount, t.token)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{t.token}</div>
                  </div>
                  {hasDetails && (
                    <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  )}
                </motion.button>

                {/* Expanded details panel */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-b border-border/50 bg-secondary/20"
                    >
                      <div className="space-y-2.5 px-4 py-4">
                        {/* Date */}
                        <DetailRow icon={RefreshCw} label="Date" value={new Date(t.createdAt).toLocaleString()} />

                        {/* Type + status */}
                        <DetailRow icon={Icon} label="Type" value={`${meta.label} (${t.status})`} />

                        {/* Amount */}
                        <DetailRow icon={Wallet} label="Amount" value={`${meta.sign}${formatTokenAmount(t.amount, t.token)} ${t.token}`} />

                        {/* Network */}
                        {t.network && t.network !== 'internal' && t.network !== 'bank' && (
                          <DetailRow icon={Send} label="Network" value={t.network} />
                        )}

                        {/* Address (external crypto) */}
                        {t.address && t.network !== 'internal' && t.network !== 'bank' && (
                          <DetailRow icon={Wallet} label="Address" value={t.address} mono />
                        )}

                        {/* Internal transfer UID */}
                        {t.address && t.network === 'internal' && (
                          <DetailRow icon={User} label={t.type === 'transfer_out' ? 'Sent to UID' : 'Received from UID'} value={t.address} />
                        )}

                        {/* Bank withdrawal details */}
                        {details.bank && (
                          <DetailRow icon={Landmark} label="Bank" value={details.bank} />
                        )}
                        {details.accountName && (
                          <DetailRow icon={User} label="Account Name" value={details.accountName} />
                        )}
                        {details.accountNo && (
                          <DetailRow icon={Wallet} label="Account Number" value={details.accountNo} mono />
                        )}
                        {details.etb && (
                          <DetailRow icon={Landmark} label="ETB Amount" value={details.etb} />
                        )}

                        {/* Buy order details */}
                        {t.type === 'buy' && details.etb && !details.bank && (
                          <DetailRow icon={Landmark} label="ETB Paid" value={details.etb} />
                        )}

                        {/* Full note (if any extra info) */}
                        {t.note && !details.bank && !details.accountNo && (
                          <DetailRow icon={RefreshCw} label="Note" value={t.note} />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function DetailRow({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 text-xs">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <span className={`ml-auto truncate font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
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
