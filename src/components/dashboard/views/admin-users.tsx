'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { formatTokenAmount, formatUsd, timeAgo } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { motion } from 'framer-motion'
import {
  Search, Loader2, ShieldCheck, Ban, Trash2, Send, Gift,
  Lock, Unlock, AlertTriangle, Mail, AtSign, Hash,
} from 'lucide-react'

interface SearchUser {
  id: string
  uid: string
  username: string | null
  email: string
  name: string | null
  avatarUrl: string | null
  isBlocked: boolean
  createdAt: string
  totalUsd: number
}

interface UserDetail {
  user: {
    id: string; uid: string; username: string | null; email: string; name: string | null
    avatarUrl: string | null; isBlocked: boolean; blockedReason: string | null
    provider: string; country: string | null; phone: string | null; createdAt: string
  }
  balances: { symbol: string; name: string; amount: number; usdValue: number; price: number; color: string; icon: string }[]
  totalUsd: number
  transactions: { id: string; type: string; token: string; amount: number; status: string; note: string | null; createdAt: string }[]
}

const TOKENS = ['USDT', 'USDC', 'BTC', 'TON', 'HABESHA']

export function UsersAdmin() {
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<UserDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [acting, setActing] = useState<string | null>(null)
  // notify + reward dialogs
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [rewardOpen, setRewardOpen] = useState(false)
  const [notifTitle, setNotifTitle] = useState('')
  const [notifMsg, setNotifMsg] = useState('')
  const [rewardToken, setRewardToken] = useState('USDT')
  const [rewardAmount, setRewardAmount] = useState('')
  const [rewardNote, setRewardNote] = useState('')

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    try {
      const data = await apiFetch<{ users: SearchUser[] }>(`/api/admin/users/search?q=${encodeURIComponent(q.trim())}`)
      setResults(data.users)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Search failed', description: err.message })
    } finally {
      setSearching(false)
    }
  }, [toast])

  useEffect(() => {
    const id = setTimeout(() => search(query), 350)
    return () => clearTimeout(id)
  }, [query, search])

  const loadDetail = useCallback(async (userId: string) => {
    setLoadingDetail(true)
    try {
      const data = await apiFetch<UserDetail>(`/api/admin/users/detail?userId=${userId}`)
      setDetail(data)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to load', description: err.message })
    } finally {
      setLoadingDetail(false)
    }
  }, [toast])

  useEffect(() => {
    if (selectedId) loadDetail(selectedId)
  }, [selectedId, loadDetail])

  async function act(kind: 'block' | 'unblock' | 'delete', extra?: { reason?: string }) {
    if (!detail) return
    setActing(kind)
    try {
      const body = kind === 'block' ? { userId: detail.user.id, reason: extra?.reason } : { userId: detail.user.id }
      const res = await apiFetch<{ ok: boolean; message: string }>(`/api/admin/users/${kind}`, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      toast({ title: kind === 'block' ? 'User Blocked' : kind === 'unblock' ? 'User Unblocked' : 'User Deleted', description: res.message })
      if (kind === 'delete') {
        setDetail(null)
        setSelectedId(null)
        setQuery('')
        setResults([])
      } else {
        await loadDetail(detail.user.id)
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Action failed', description: err.message })
    } finally {
      setActing(null)
    }
  }

  async function sendNotify() {
    if (!detail) return
    setActing('notify')
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>(`/api/admin/users/notify`, {
        method: 'POST',
        body: JSON.stringify({ userId: detail.user.id, title: notifTitle, message: notifMsg }),
      })
      toast({ title: 'Notification sent', description: res.message })
      setNotifyOpen(false); setNotifTitle(''); setNotifMsg('')
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message })
    } finally {
      setActing(null)
    }
  }

  async function sendReward() {
    if (!detail) return
    setActing('reward')
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>(`/api/admin/users/reward`, {
        method: 'POST',
        body: JSON.stringify({ userId: detail.user.id, token: rewardToken, amount: Number(rewardAmount), note: rewardNote }),
      })
      toast({ title: 'Reward sent 🎁', description: res.message })
      setRewardOpen(false); setRewardAmount(''); setRewardNote('')
      await loadDetail(detail.user.id)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message })
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <ShieldCheck className="h-6 w-6 text-gold" /> User Management
        </h2>
        <p className="text-sm text-muted-foreground">Search by username, UID, email, or name — then view balances, block, delete, notify, or reward.</p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search username, UID, email, or name…"
          className="border-border bg-card pl-10"
        />
        {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      {/* Search results */}
      {query.trim() && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
              <Search className="mb-2 h-7 w-7 opacity-30" />
              No users found
            </div>
          ) : (
            results.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedId(u.id)}
                className="flex w-full items-center gap-3 border-b border-border/50 px-4 py-3 text-left last:border-0 transition-colors hover:bg-secondary/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 text-sm font-bold text-gold">
                  {(u.username || u.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold truncate">@{u.username || '—'}</span>
                    {u.isBlocked && <span className="rounded bg-down/15 px-1.5 py-0.5 text-[9px] font-bold text-down">BLOCKED</span>}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">{u.email} · UID {u.uid}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-semibold">{formatUsd(u.totalUsd)}</div>
                  <div className="text-[10px] text-muted-foreground">{timeAgo(u.createdAt)}</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* User detail drawer */}
      <Sheet open={!!selectedId} onOpenChange={(v) => !v && (setSelectedId(null), setDetail(null))}>
        <SheetContent className="w-full overflow-y-auto border-border bg-card sm:max-w-lg">
          {loadingDetail || !detail ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gold" />
            </div>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  User @{detail.user.username || '—'}
                  {detail.user.isBlocked && <span className="rounded bg-down/15 px-1.5 py-0.5 text-[10px] font-bold text-down">BLOCKED</span>}
                </SheetTitle>
                <SheetDescription>UID {detail.user.uid} · joined {timeAgo(detail.user.createdAt)}</SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-5">
                {/* Profile info */}
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-secondary/30 p-3 text-xs">
                  <Info icon={AtSign} label="Username" value={`@${detail.user.username || '—'}`} />
                  <Info icon={Mail} label="Email" value={detail.user.email} />
                  <Info icon={Hash} label="UID" value={detail.user.uid} />
                  <Info icon={Mail} label="Phone" value={detail.user.phone || '—'} />
                  <Info icon={Mail} label="Provider" value={detail.user.provider} />
                </div>

                {detail.user.isBlocked && detail.user.blockedReason && (
                  <div className="flex items-start gap-2 rounded-lg border border-down/40 bg-down/5 p-2.5 text-[11px] text-down">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>Blocked reason: {detail.user.blockedReason}</span>
                  </div>
                )}

                {/* Total balance */}
                <div className="rounded-xl border border-gold/30 bg-gold/5 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Balance</div>
                  <div className="mt-0.5 text-2xl font-extrabold tabular-nums text-foreground">{formatUsd(detail.totalUsd)}</div>
                </div>

                {/* Token balances */}
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Token Holdings</div>
                  <div className="space-y-1.5">
                    {detail.balances.map((b) => (
                      <div key={b.symbol} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/20 px-3 py-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: `${b.color}22`, color: b.color }}>{b.icon}</div>
                        <div className="flex-1">
                          <div className="text-xs font-bold">{b.symbol}</div>
                          <div className="text-[10px] text-muted-foreground">{b.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm font-semibold">{formatTokenAmount(b.amount, b.symbol)}</div>
                          <div className="text-[10px] text-muted-foreground">{formatUsd(b.usdValue)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent transactions */}
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Transactions</div>
                  <div className="max-h-48 space-y-1 overflow-y-auto custom-scroll">
                    {detail.transactions.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">No transactions</div>
                    ) : (
                      detail.transactions.map((t) => (
                        <div key={t.id} className="flex items-center justify-between rounded border border-border/50 bg-secondary/20 px-2.5 py-1.5 text-[11px]">
                          <div>
                            <div className="font-semibold">{t.type} · {t.token}</div>
                            <div className="text-[10px] text-muted-foreground">{t.note || ''} · {timeAgo(t.createdAt)}</div>
                          </div>
                          <div className="font-mono font-bold">{t.amount}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Admin actions */}
                <div className="space-y-2 border-t border-border pt-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Admin Actions</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="h-10 border-gold/30 text-gold hover:bg-gold/10" onClick={() => setRewardOpen(true)}>
                      <Gift className="mr-1 h-4 w-4" /> Reward
                    </Button>
                    <Button variant="outline" className="h-10 border-border hover:bg-secondary" onClick={() => setNotifyOpen(true)}>
                      <Send className="mr-1 h-4 w-4" /> Notify
                    </Button>
                    {detail.user.isBlocked ? (
                      <Button variant="outline" className="h-10 border-up/40 text-up hover:bg-up/10" disabled={acting === 'unblock'} onClick={() => act('unblock')}>
                        {acting === 'unblock' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="mr-1 h-4 w-4" />} Unblock
                      </Button>
                    ) : (
                      <Button variant="outline" className="h-10 border-gold/40 text-gold hover:bg-gold/10" disabled={acting === 'block'} onClick={() => {
                        const reason = prompt('Reason for blocking? (optional)')
                        act('block', { reason: reason || undefined })
                      }}>
                        {acting === 'block' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="mr-1 h-4 w-4" />} Block
                      </Button>
                    )}
                    <Button variant="outline" className="h-10 border-down/40 text-down hover:bg-down/10" disabled={acting === 'delete'} onClick={() => {
                      if (confirm(`Permanently delete @${detail.user.username}? This removes ALL their data (balances, transactions). This cannot be undone.`)) act('delete')
                    }}>
                      {acting === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />} Delete
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Notify dialog */}
      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent className="max-w-[420px] border-border bg-card">
          <DialogTitle className="text-lg font-bold">Send Notification</DialogTitle>
          <DialogDescription className="text-xs">Write a message to @{detail?.user.username}</DialogDescription>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Title</Label>
              <Input value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} placeholder="e.g. Account Update" className="bg-secondary/40" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Message</Label>
              <Textarea value={notifMsg} onChange={(e) => setNotifMsg(e.target.value)} placeholder="Type your message…" className="min-h-[100px] bg-secondary/40" />
            </div>
            <Button className="bg-gold-gradient h-11 w-full font-semibold text-primary-foreground" disabled={acting === 'notify' || !notifTitle.trim() || !notifMsg.trim()} onClick={sendNotify}>
              {acting === 'notify' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />} Send Notification
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reward dialog */}
      <Dialog open={rewardOpen} onOpenChange={setRewardOpen}>
        <DialogContent className="max-w-[420px] border-border bg-card">
          <DialogTitle className="text-lg font-bold">Reward User 🎁</DialogTitle>
          <DialogDescription className="text-xs">Credit any token to @{detail?.user.username}</DialogDescription>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Token</Label>
              <Select value={rewardToken} onValueChange={setRewardToken}>
                <SelectTrigger className="bg-secondary/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TOKENS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Amount</Label>
              <Input type="number" min="0" step="any" value={rewardAmount} onChange={(e) => setRewardAmount(e.target.value)} placeholder="0.00" className="bg-secondary/40" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Note (optional)</Label>
              <Input value={rewardNote} onChange={(e) => setRewardNote(e.target.value)} placeholder="e.g. Loyalty bonus" className="bg-secondary/40" />
            </div>
            <Button className="bg-gold-gradient h-11 w-full font-semibold text-primary-foreground" disabled={acting === 'reward' || !rewardAmount} onClick={sendReward}>
              {acting === 'reward' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="mr-1 h-4 w-4" />} Send Reward
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate font-medium text-foreground">{value}</div>
      </div>
    </div>
  )
}
