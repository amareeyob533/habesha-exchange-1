'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch, getStoredToken } from '@/lib/api-client'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { motion } from 'framer-motion'
import { Clock, CheckCircle2, XCircle, ArrowDownToLine, ArrowUpFromLine, ShoppingCart } from 'lucide-react'
import { timeAgo } from '@/lib/format'

interface PendingItem {
  id: string
  type: string
  description: string
  amount: string
  status: string // pending | approved | rejected
  createdAt: string
  updatedAt: string
}

const SEEN_KEY = 'habesha_seen_resolved'

function getSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function markSeen(id: string) {
  try {
    const seen = getSeenIds()
    seen.add(id)
    const arr = Array.from(seen).slice(-50)
    localStorage.setItem(SEEN_KEY, JSON.stringify(arr))
  } catch {}
}

export function PendingIcon() {
  const [items, setItems] = useState<PendingItem[]>([])
  const [open, setOpen] = useState(false)
  const [hasToken, setHasToken] = useState(false)
  const [, forceUpdate] = useState(0)

  const load = useCallback(async () => {
    if (!getStoredToken()) { setHasToken(false); setItems([]); return }
    setHasToken(true)
    try {
      const data = await apiFetch<{ items: PendingItem[]; hasPending: boolean }>('/api/pending')
      setItems(data.items || [])
    } catch {
      setItems([])
    }
  }, [])

  // Poll every 5 seconds for fast updates (when tab is visible)
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) load()
    }, 5000)
    return () => clearInterval(id)
  }, [load])

  // Determine what to show:
  // - pending items → rotating red/yellow glow + "pending" text
  // - approved items NOT yet seen → solid green glow + "completed" text
  // - rejected items NOT yet seen → solid red glow + "rejected" text
  // - resolved items that have been seen → hide
  // - no items at all → hide
  const seenIds = getSeenIds()
  // Filter out items the user has already seen (opened the panel)
  const unseenPending = items.filter((i) => i.status === 'pending' && !seenIds.has(i.id))
  const unseenResolved = items.filter((i) => (i.status === 'approved' || i.status === 'rejected') && !seenIds.has(i.id))
  const visibleItems = [...unseenPending, ...unseenResolved]

  const hasPending = unseenPending.length > 0
  const hasUnseenApproved = unseenResolved.some((i) => i.status === 'approved')
  const hasUnseenRejected = unseenResolved.some((i) => i.status === 'rejected')
  const shouldShow = hasPending || hasUnseenApproved || hasUnseenRejected

  // Determine the display state (priority: pending > rejected > approved)
  const displayState: 'pending' | 'approved' | 'rejected' = hasPending ? 'pending' : hasUnseenRejected ? 'rejected' : 'approved'

  // When user opens the panel, mark ALL currently visible items as seen
  // (pending + approved + rejected). After closing, the icon disappears
  // unless new items appear (polled every 5s).
  const handleOpenChange = (v: boolean) => {
    setOpen(v)
    if (v) {
      // Mark ALL currently-visible items as seen (pending + resolved)
      for (const item of visibleItems) {
        markSeen(item.id)
      }
      // Force re-render so the seen IDs are re-evaluated immediately
      setTimeout(() => forceUpdate((n) => n + 1), 100)
    }
  }

  if (!hasToken || !shouldShow) return null

  // Colors per state
  const colors = {
    pending: { border: 'rgba(255, 77, 109, 0.4)', bg: 'rgba(255, 77, 109, 0.08)', text: 'text-down', glow: '#FF4D6D' },
    approved: { border: 'rgba(0, 214, 143, 0.4)', bg: 'rgba(0, 214, 143, 0.08)', text: 'text-up', glow: '#00D68F' },
    rejected: { border: 'rgba(255, 77, 109, 0.4)', bg: 'rgba(255, 77, 109, 0.08)', text: 'text-down', glow: '#FF4D6D' },
  }
  const c = colors[displayState]
  const labelText = displayState === 'pending' ? 'pending' : displayState === 'approved' ? 'completed' : 'rejected'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative inline-flex h-9 items-center gap-1.5 rounded-full border px-3 transition-colors"
        style={{ borderColor: c.border, backgroundColor: c.bg }}
        aria-label={labelText}
      >
        {/* Rotating red/yellow glow when pending */}
        {displayState === 'pending' && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, #FF4D6D 0deg, #FF4D6D 180deg, #F0B90B 180deg, #F0B90B 360deg)',
              padding: '2px',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          />
        )}

        {/* Solid glow when approved (green) or rejected (red) — no rotation */}
        {displayState !== 'pending' && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: c.glow,
              padding: '2px',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          />
        )}

        {/* Icon + text */}
        {displayState === 'approved' ? (
          <CheckCircle2 className={`relative h-4 w-4 ${c.text}`} />
        ) : displayState === 'rejected' ? (
          <XCircle className={`relative h-4 w-4 ${c.text}`} />
        ) : (
          <Clock className={`relative h-4 w-4 ${c.text}`} />
        )}
        <span className={`relative text-xs font-bold ${c.text}`}>{labelText}</span>
      </button>

      {/* Panel */}
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="w-full border-border bg-card sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {displayState === 'pending' ? (
                <><Clock className="h-4 w-4 text-down" /> Your Pending Orders</>
              ) : displayState === 'approved' ? (
                <><CheckCircle2 className="h-4 w-4 text-up" /> Completed Orders</>
              ) : (
                <><XCircle className="h-4 w-4 text-down" /> Order Updates</>
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 max-h-[calc(100vh-6rem)] space-y-2 overflow-y-auto custom-scroll pr-1">
            {visibleItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="mb-2 h-8 w-8 text-up opacity-50" />
                All caught up — no pending orders.
              </div>
            ) : (
              visibleItems.map((item) => {
                const isPending = item.status === 'pending'
                const isApproved = item.status === 'approved'
                const isRejected = item.status === 'rejected'
                const Icon = item.type === 'deposit' ? ArrowDownToLine : item.type === 'withdrawal' ? ArrowUpFromLine : ShoppingCart
                const badgeColor = isPending ? 'bg-down/15 text-down' : isApproved ? 'bg-up/15 text-up' : 'bg-down/15 text-down'
                const borderColor = isPending ? 'border-down/30 bg-down/5' : isApproved ? 'border-up/30 bg-up/5' : 'border-down/30 bg-down/5'
                const iconBg = isPending ? 'bg-down/15 text-down' : isApproved ? 'bg-up/15 text-up' : 'bg-down/15 text-down'
                return (
                  <div key={item.id} className={`rounded-xl border p-3 ${borderColor}`}>
                    <div className="flex items-start gap-2.5">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold">{item.description}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">{timeAgo(item.createdAt)}</div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${badgeColor}`}>
                        {isPending ? 'Pending' : isApproved ? 'Approved' : 'Rejected'}
                      </span>
                    </div>
                    {isPending && (
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        Your order is being reviewed by our team. Please allow some time for processing. We'll notify you once it's approved. Thank you for your patience.
                      </div>
                    )}
                    {isApproved && (
                      <div className="mt-2 text-[11px] text-up">
                        ✓ Your order has been approved and processed successfully.
                      </div>
                    )}
                    {isRejected && (
                      <div className="mt-2 text-[11px] text-down">
                        ✕ Your order was rejected. If you believe this is an error, please contact our support team for assistance.
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
