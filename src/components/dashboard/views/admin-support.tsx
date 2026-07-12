'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { timeAgo } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'
import { Headphones, Send, Loader2, CheckCircle2, MessageCircle } from 'lucide-react'

interface Reply {
  id: string
  senderRole: string
  message: string
  createdAt: string
}
interface Ticket {
  id: string
  subject: string
  message: string
  status: string
  createdAt: string
  user: { uid: string; email: string; username: string | null; name: string | null }
  replies: Reply[]
}

export function AdminSupport() {
  const { toast } = useToast()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [resolving, setResolving] = useState(false)

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    try {
      const data = await apiFetch<{ tickets: Ticket[] }>('/api/admin/support?status=open')
      const next = data.tickets || []
      // Only update state if data actually changed (prevents flicker during polling)
      setTickets((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
      // Update selected ticket if it's still in the list (only when changed)
      if (selected) {
        const updated = next.find((t) => t.id === selected.id)
        if (updated) {
          setSelected((prev) => (prev && JSON.stringify(prev) === JSON.stringify(updated) ? prev : updated))
        }
      }
    } catch { toast({ variant: 'destructive', title: 'Failed to load' }) }
    finally { if (!opts?.silent) setLoading(false) }
  }, [toast, selected])

  useEffect(() => { load() }, [load])

  // Real-time polling: when a ticket conversation is open, fetch new replies every 2s.
  // Stop polling when no ticket is selected or when the tab is hidden.
  useEffect(() => {
    if (!selected) return
    let id: ReturnType<typeof setInterval> | null = null
    const start = () => { if (!id) id = setInterval(() => load({ silent: true }), 2000) }
    const stop = () => { if (id) { clearInterval(id); id = null } }
    const onVis = () => { document.hidden ? stop() : start() }
    start()
    document.addEventListener('visibilitychange', onVis)
    return () => { stop(); document.removeEventListener('visibilitychange', onVis) }
  }, [selected, load])

  async function sendReply() {
    if (!selected || !replyText.trim()) return
    setReplying(true)
    try {
      await apiFetch('/api/admin/support/reply', {
        method: 'POST',
        body: JSON.stringify({ ticketId: selected.id, message: replyText }),
      })
      setReplyText('')
      // Immediately reload replies (don't wait for next poll tick) so the admin sees their message instantly
      await load({ silent: true })
      toast({ title: 'Reply sent' })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message })
    } finally { setReplying(false) }
  }

  async function resolve() {
    if (!selected) return
    setResolving(true)
    try {
      await apiFetch('/api/admin/support/resolve', {
        method: 'POST',
        body: JSON.stringify({ ticketId: selected.id }),
      })
      await load()
      setSelected(null)
      toast({ title: 'Ticket resolved' })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message })
    } finally { setResolving(false) }
  }

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to tickets
          </button>
          <Button variant="outline" size="sm" className="border-up/40 text-up hover:bg-up/10" onClick={resolve} disabled={resolving}>
            {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Mark Resolved
          </Button>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <div className="text-sm font-bold">{selected.subject}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            From: {selected.user.name || selected.user.email} · UID {selected.user.uid} · {timeAgo(selected.createdAt)}
          </div>
        </div>

        {/* Chat */}
        <div className="glass-card rounded-2xl p-4">
          <div className="max-h-[350px] space-y-3 overflow-y-auto custom-scroll pr-1">
            <ChatBubble role="user" message={selected.message} time={selected.createdAt} name={selected.user.name || selected.user.email} />
            {selected.replies.map((r) => (
              <ChatBubble key={r.id} role={r.senderRole} message={r.message} time={r.createdAt} name={r.senderRole === 'admin' ? 'You (Admin)' : selected.user.name || selected.user.email} />
            ))}
          </div>

          {/* Reply */}
          <div className="mt-4 flex gap-2">
            <Input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              className="bg-secondary/40"
              onKeyDown={(e) => { if (e.key === 'Enter' && !replying) sendReply() }}
            />
            <Button className="bg-gold-gradient font-semibold text-primary-foreground" onClick={sendReply} disabled={replying || !replyText.trim()}>
              {replying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
          <MessageCircle className="mb-2 h-8 w-8 opacity-30" />
          No open support tickets
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tickets.map((t, i) => (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelected(t)}
              className="glass-card rounded-2xl p-4 text-left transition-all hover:shadow-gold"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 text-gold">
                    <Headphones className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">{t.subject}</div>
                    <div className="text-[11px] text-muted-foreground">{t.user.name || t.user.email} · UID {t.user.uid}</div>
                  </div>
                </div>
                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase text-gold">
                  {t.status}
                </span>
              </div>
              <div className="mt-2 truncate text-xs text-muted-foreground">{t.message}</div>
              <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>{timeAgo(t.createdAt)}</span>
                {t.replies.length > 0 && <span>{t.replies.length} replies</span>}
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}

function ChatBubble({ role, message, time, name }: { role: string; message: string; time: string; name: string }) {
  const isAdmin = role === 'admin'
  return (
    <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
        isAdmin ? 'bg-gold/10 border border-gold/20' : 'bg-secondary/60 border border-border'
      }`}>
        <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {name}
        </div>
        <div>{message}</div>
        <div className="mt-1 text-[9px] text-muted-foreground">{timeAgo(time)}</div>
      </div>
    </div>
  )
}
