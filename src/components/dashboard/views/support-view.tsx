'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { timeAgo } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { motion } from 'framer-motion'
import { LifeBuoy, MessageCircle, Send, Mail, Clock, Plus, Loader2, Headphones, ExternalLink } from 'lucide-react'
import { useUI } from '@/hooks/use-ui'

const ADMIN_EMAIL = 'amareeyob533@gmail.com'
const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP || '+251900000000'

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
  replies: Reply[]
}

export function SupportView() {
  const { openSupport } = useUI()
  const { toast } = useToast()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ tickets: Ticket[] }>('/api/support/ticket')
      setTickets(data.tickets || [])
    } catch { toast({ variant: 'destructive', title: 'Failed to load' }) }
    finally { setLoading(false) }
  }, [toast])

  useEffect(() => { load() }, [load])

  async function sendReply() {
    if (!selectedTicket || !replyText.trim()) return
    setReplying(true)
    try {
      await apiFetch('/api/support/reply', {
        method: 'POST',
        body: JSON.stringify({ ticketId: selectedTicket.id, message: replyText }),
      })
      setReplyText('')
      await load()
      // Update selected ticket
      const updated = tickets.find((t) => t.id === selectedTicket.id)
      if (updated) setSelectedTicket(updated)
      toast({ title: 'Reply sent' })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message })
    } finally { setReplying(false) }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <LifeBuoy className="h-6 w-6 text-gold" /> Support
        </h2>
        <p className="text-sm text-muted-foreground">We're here to help, 24/7</p>
      </div>

      {/* Contact cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-card gradient-border rounded-2xl p-5 shadow-gold">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#25D366]">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="mt-3 text-base font-bold">WhatsApp</div>
          <p className="mt-1 text-xs text-muted-foreground">Fastest way to reach us</p>
          <a href={`https://wa.me/${WHATSAPP.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-sm font-bold text-white hover:opacity-90">
            <MessageCircle className="h-4 w-4" /> Chat now <ExternalLink className="h-3 w-3" />
          </a>
          <div className="mt-2 text-center text-xs text-muted-foreground">{WHATSAPP}</div>
        </div>

        <div className="glass-card gradient-border rounded-2xl p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-gold">
            <Mail className="h-5 w-5" />
          </div>
          <div className="mt-3 text-base font-bold">Email Support</div>
          <p className="mt-1 text-xs text-muted-foreground">Send us a message anytime</p>
          <a href={`mailto:${ADMIN_EMAIL}`} className="mt-3 block w-full rounded-xl border border-gold/30 bg-gold/5 py-2.5 text-center text-sm font-bold text-gold hover:bg-gold/10">
            {ADMIN_EMAIL}
          </a>
        </div>

        <div className="glass-card gradient-border rounded-2xl p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-up/10 text-up">
            <Headphones className="h-5 w-5" />
          </div>
          <div className="mt-3 text-base font-bold">Open a Ticket</div>
          <p className="mt-1 text-xs text-muted-foreground">Chat with our support team</p>
          <Button className="bg-gold-gradient mt-3 w-full font-semibold text-primary-foreground" onClick={() => openSupport()}>
            New Ticket
          </Button>
        </div>
      </div>

      {/* User's tickets */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="mb-3 text-lg font-bold">Your Tickets</h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
            <MessageCircle className="mb-2 h-8 w-8 opacity-30" />
            No tickets yet. Open one to start chatting with support.
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTicket(t)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-secondary/30 p-3 text-left transition-colors hover:bg-secondary/50"
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${t.status === 'open' ? 'bg-gold/15 text-gold' : 'bg-up/15 text-up'}`}>
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-semibold">{t.subject}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{t.message}</div>
                </div>
                <div className="text-right">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${t.status === 'open' ? 'bg-gold/15 text-gold' : 'bg-up/15 text-up'}`}>
                    {t.status}
                  </span>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{timeAgo(t.createdAt)}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Ticket chat modal */}
      <Dialog open={!!selectedTicket} onOpenChange={(v) => !v && setSelectedTicket(null)}>
        <DialogContent className="max-w-[500px] glass-strong border-border/40">
          {selectedTicket && (
            <>
              <DialogTitle className="text-lg font-bold">{selectedTicket.subject}</DialogTitle>
              <DialogDescription className="text-xs">
                Status: {selectedTicket.status} · {timeAgo(selectedTicket.createdAt)}
              </DialogDescription>

              {/* Chat messages */}
              <div className="mt-4 max-h-[300px] space-y-3 overflow-y-auto custom-scroll pr-1">
                {/* Original message (user) */}
                <ChatBubble role="user" message={selectedTicket.message} time={selectedTicket.createdAt} />
                {/* Replies */}
                {selectedTicket.replies.map((r) => (
                  <ChatBubble key={r.id} role={r.senderRole} message={r.message} time={r.createdAt} />
                ))}
              </div>

              {/* Reply input */}
              {selectedTicket.status === 'open' && (
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
              )}
              {selectedTicket.status === 'resolved' && (
                <div className="mt-4 rounded-lg border border-up/30 bg-up/5 p-3 text-center text-xs text-up">
                  ✓ This ticket has been resolved. If you need more help, open a new ticket.
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ChatBubble({ role, message, time }: { role: string; message: string; time: string }) {
  const isAdmin = role === 'admin'
  return (
    <div className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
        isAdmin ? 'bg-gold/10 border border-gold/20' : 'bg-secondary/60 border border-border'
      }`}>
        <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {isAdmin ? 'Support Team' : 'You'}
        </div>
        <div>{message}</div>
        <div className="mt-1 text-[9px] text-muted-foreground">{timeAgo(time)}</div>
      </div>
    </div>
  )
}
