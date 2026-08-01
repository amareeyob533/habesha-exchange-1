'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiFetch, getStoredToken } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { timeAgo } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { Check, X, Loader2, Inbox, ShoppingCart } from 'lucide-react'

interface BuyOrder {
  id: string
  usdtAmount: number
  birrAmount: number
  rate: number
  bank: string
  screenshotUrl: string | null
  transactionCode: string | null
  status: string
  createdAt: string
  user: { uid: string; email: string; username: string | null; name: string | null }
}

export function BuysAdmin({ refreshKey }: { refreshKey: number }) {
  const { toast } = useToast()
  const [orders, setOrders] = useState<BuyOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState<string | null>(null)

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!getStoredToken()) return
    if (!opts?.silent) setLoading(true)
    try {
      const data = await apiFetch<{ orders: BuyOrder[] }>('/api/admin/buys?status=pending')
      const next = data.orders
      // Only update state if data actually changed (prevents flicker during polling)
      setOrders((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
    } catch (err: any) {
      // Silently skip auth errors (happens during logout)
      const msg = String(err?.message || '')
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) return
      // Only show error toast on non-silent (manual) loads — silent polls fail quietly
      if (!opts?.silent) toast({ variant: 'destructive', title: 'Failed to load', description: err.message })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load, refreshKey])

  // Fast polling: refresh pending buy orders every 5s so new ones show up quickly.
  // Stop polling when the tab is hidden.
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null
    const start = () => { if (!id) id = setInterval(() => load({ silent: true }), 2000) }
    const stop = () => { if (id) { clearInterval(id); id = null } }
    const onVis = () => { document.hidden ? stop() : start() }
    start()
    document.addEventListener('visibilitychange', onVis)
    return () => { stop(); document.removeEventListener('visibilitychange', onVis) }
  }, [load])

  async function act(orderId: string, action: 'approve' | 'reject') {
    setActing(orderId)
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>(`/api/admin/buys/${action}`, {
        method: 'POST',
        body: JSON.stringify({ orderId }),
      })
      toast({ title: action === 'approve' ? 'Buy Order Approved' : 'Buy Order Rejected', description: res.message })
      await load({ silent: true })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Action failed', description: err.message })
    } finally {
      setActing(null)
    }
  }

  if (orders.length === 0) {
    return (
      <div className="overflow-hidden glass-card rounded-2xl shadow-premium">
        <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
          <Inbox className="mb-2 h-8 w-8 opacity-30" />
          No pending buy orders
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {orders.map((o, i) => (
        <motion.div
          key={o.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="overflow-hidden glass-card rounded-2xl shadow-premium"
        >
          <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-3">
            <div>
              <div className="text-sm font-bold text-gold">@{o.user.username || o.user.email}</div>
              <div className="text-[11px] text-muted-foreground">UID {o.user.uid} · {timeAgo(o.createdAt)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold">{o.usdtAmount.toFixed(4)} USDT</div>
              <div className="text-[11px] text-muted-foreground">{o.birrAmount.toLocaleString('en-US')} ETB · {o.bank}</div>
            </div>
          </div>
          <div className="space-y-3 p-4">
            {o.screenshotUrl && (
              <div>
                <div className="mb-1.5 text-[11px] font-semibold text-muted-foreground">Payment Screenshot</div>
                <img src={o.screenshotUrl} alt="Payment proof" className="w-full rounded-lg border border-border" />
              </div>
            )}
            {o.transactionCode && (
              <div className="text-[11px] text-muted-foreground">
                Transaction code: <b className="font-mono text-foreground">{o.transactionCode}</b>
              </div>
            )}
            <div className="flex gap-2 border-t border-border pt-3">
              <Button size="sm" className="h-9 flex-1 bg-up text-white hover:bg-up/90" disabled={acting === o.id} onClick={() => act(o.id, 'approve')}>
                {acting === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve (Credit USDT)
              </Button>
              <Button size="sm" variant="outline" className="h-9 border-down/40 text-down hover:bg-down/10" disabled={acting === o.id} onClick={() => act(o.id, 'reject')}>
                {acting === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Reject
              </Button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
