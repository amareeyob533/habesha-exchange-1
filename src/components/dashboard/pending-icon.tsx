'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch, getStoredToken } from '@/lib/api-client'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { motion } from 'framer-motion'
import { Clock, CheckCircle2, ArrowDownToLine, ArrowUpFromLine, ShoppingCart } from 'lucide-react'
import { timeAgo } from '@/lib/format'

interface PendingItem {
  id: string
  type: string
  description: string
  amount: string
  status: string
  createdAt: string
  updatedAt: string
}

const SEEN_KEY = 'habesha_seen_approved'

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
    // Keep only last 50 entries to avoid bloat
    const arr = Array.from(seen).slice(-50)
    localStorage.setItem(SEEN_KEY, JSON.stringify(arr))
  } catch {}
}

export function PendingIcon() {
  const [items, setItems] = useState<PendingItem[]>([])
  const [open, setOpen] = useState(false)
  const [hasToken, setHasToken] = useState(false)

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
  // - pending items → show with rotating red/yellow glow + "pending" text
  // - approved items NOT yet seen → show with solid green glow + "completed" text
  // - approved items that have been seen → hide
  // - no items at all → hide
  const seenIds = getSeenIds()
  const pendingItems = items.filter((i) => i.status === 'pending')
  const unseenApproved = items.filter((i) => i.status === 'approved' && !seenIds.has(i.id))
  const visibleItems = [...pendingItems, ...unseenApproved]

  const hasPending = pendingItems.length > 0
  const hasUnseenApproved = unseenApproved.length > 0
  const shouldShow = hasPending || hasUnseenApproved

  // When user opens the panel, mark all approved items as seen
  const handleOpenChange = (v: boolean) => {
    setOpen(v)
    if (v) {
      // Mark all currently-visible approved items as seen
      for (const item of unseenApproved) {
        markSeen(item.id)
      }
    }
  }

  if (!hasToken || !shouldShow) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative inline-flex h-9 items-center gap-1.5 rounded-full border px-3 transition-colors"
        style={{
          borderColor: hasPending ? 'rgba(255, 77, 109, 0.4)' : 'rgba(0, 214, 143, 0.4)',
          backgroundColor: hasPending ? 'rgba(255, 77, 109, 0.08)' : 'rgba(0, 214, 143, 0.08)',
        }}
        aria-label={hasPending ? 'Pending orders' : 'Completed orders'}
      >
        {/* Rotating red/yellow glow when pending */}
        {hasPending && (
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

        {/* Solid green glow when approved (no rotation, just steady green) */}
        {!hasPending && hasUnseenApproved && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: '#00D68F',
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
        <Clock className={`relative h-4 w-4 ${hasPending ? 'text-down' : 'text-up'}`} />
        <span className={`relative text-xs font-bold ${hasPending ? 'text-down' : 'text-up'}`}>
          {hasPending ? 'pending' : 'completed'}
        </span>
      </button>

      {/* Panel */}
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="w-full border-border bg-card sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {hasPending ? (
                <><Clock className="h-4 w-4 text-down" /> Your Pending Orders</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 text-up" /> Completed Orders</>
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
                const Icon = item.type === 'deposit' ? ArrowDownToLine : item.type === 'withdrawal' ? ArrowUpFromLine : ShoppingCart
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-3 ${isPending ? 'border-down/30 bg-down/5' : 'border-up/30 bg-up/5'}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isPending ? 'bg-down/15 text-down' : 'bg-up/15 text-up'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold">{item.description}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">{timeAgo(item.createdAt)}</div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${isPending ? 'bg-down/15 text-down' : 'bg-up/15 text-up'}`}>
                        {isPending ? 'Pending' : 'Approved'}
                      </span>
                    </div>
                    {isPending ? (
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        Your order is being reviewed by our team. Please allow some time for processing. We'll notify you once it's approved. Thank you for your patience.
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] text-up">
                        ✓ Your order has been approved and processed successfully.
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
