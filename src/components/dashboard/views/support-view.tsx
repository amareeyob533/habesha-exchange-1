'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiFetch, getStoredToken } from '@/lib/api-client'
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
import { LifeBuoy, MessageCircle, Send, Mail, Clock, Plus, Loader2, Headphones, ExternalLink, Mic, Square, X } from 'lucide-react'
import { useUI } from '@/hooks/use-ui'
import { useVoiceRecorder } from '@/hooks/use-voice-recorder'
import { VoiceMessage } from '@/components/support/voice-message'

const ADMIN_EMAIL = 'amareeyob533@gmail.com'
const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP || '+251900000000'

interface Reply {
  id: string
  senderRole: string
  message: string
  voiceData?: string | null
  voiceMime?: string | null
  voiceDuration?: number | null
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

function fmtDur(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function SupportView() {
  const { openSupport } = useUI()
  const { toast } = useToast()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const recorder = useVoiceRecorder()

  const load = useCallback(async () => {
    if (!getStoredToken()) return
    try {
      const data = await apiFetch<{ tickets: Ticket[] }>('/api/support/ticket')
      const next = data.tickets || []
      // Only update state if data actually changed (prevents flicker during polling)
      setTickets((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
    } catch (err: any) {
      // Silently skip auth errors (happens during logout)
      const msg = String(err?.message || '')
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) return
      // Don't show error toast — just set empty tickets (DB might not be ready on Vercel)
      setTickets([])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Real-time polling: when a ticket conversation is open, fetch new replies every 2s.
  // Stop polling when no ticket is selected or when the tab is hidden.
  useEffect(() => {
    if (!selectedTicket) return
    let id: ReturnType<typeof setInterval> | null = null
    const start = () => { if (!id) id = setInterval(() => load(), 2000) }
    const stop = () => { if (id) { clearInterval(id); id = null } }
    const onVis = () => { document.hidden ? stop() : start() }
    start()
    document.addEventListener('visibilitychange', onVis)
    return () => { stop(); document.removeEventListener('visibilitychange', onVis) }
  }, [selectedTicket, load])

  // When the user closes the conversation modal, drop any in-progress recording.
  useEffect(() => {
    if (!selectedTicket) {
      recorder.cancelRecording()
      setReplyText('')
    }
  }, [selectedTicket])

  async function sendReply() {
    if (!selectedTicket) return
    const text = replyText.trim()
    const voice = recorder.audioData
    if (!text && !voice) return
    setReplying(true)
    try {
      await apiFetch('/api/support/reply', {
        method: 'POST',
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          message: text,
          voiceData: voice,
          voiceMime: recorder.mime,
          voiceDuration: recorder.duration,
        }),
      })
      setReplyText('')
      recorder.reset()
      // Immediately reload replies (don't wait for next poll tick) so the user sees their message instantly
      await load()
      toast({ title: 'Reply sent' })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message })
    } finally { setReplying(false) }
  }

  async function startVoice() {
    try {
      await recorder.startRecording()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Microphone unavailable', description: err?.message || 'Please allow microphone access' })
    }
  }

  // Auto-update selected ticket when tickets list changes (after reply/reload)
  useEffect(() => {
    if (selectedTicket) {
      const updated = tickets.find((t) => t.id === selectedTicket.id)
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedTicket)) {
        setSelectedTicket(updated)
      }
    }
  }, [tickets])

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
                  <ChatBubble
                    key={r.id}
                    role={r.senderRole}
                    message={r.message}
                    voiceData={r.voiceData}
                    voiceMime={r.voiceMime}
                    voiceDuration={r.voiceDuration}
                    time={r.createdAt}
                  />
                ))}
              </div>

              {/* Reply input */}
              {selectedTicket.status === 'open' && (
                <div className="mt-4 space-y-2">
                  {/* Recording / preview strip — shown above the text input while
                      the user is recording or after they've captured a take. */}
                  {recorder.isRecording && (
                    <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2">
                      <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                      </span>
                      <span className="flex-1 text-xs font-semibold text-red-500">
                        Recording… {fmtDur(recorder.duration)}
                      </span>
                      <Button size="sm" variant="outline" className="h-7 border-red-500/40 text-red-500 hover:bg-red-500/10" onClick={() => recorder.cancelRecording()}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" className="h-7 bg-gold-gradient font-semibold text-primary-foreground" onClick={() => recorder.stopRecording()}>
                        <Square className="h-3.5 w-3.5" /> Stop
                      </Button>
                    </div>
                  )}
                  {!recorder.isRecording && recorder.audioData && (
                    <div className="flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/5 px-3 py-2">
                      <div className="flex-1">
                        <VoiceMessage
                          voiceData={recorder.audioData}
                          voiceMime={recorder.mime}
                          voiceDuration={recorder.duration}
                          compact
                        />
                      </div>
                      <Button size="sm" variant="outline" className="h-7 border-border text-muted-foreground hover:bg-secondary" onClick={() => recorder.reset()}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 bg-gold-gradient font-semibold text-primary-foreground"
                        disabled={replying}
                        onClick={sendReply}
                      >
                        {replying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  )}

                  {/* Default row: text input + mic + send */}
                  {!recorder.isRecording && !recorder.audioData && (
                    <div className="flex gap-2">
                      <Input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your reply..."
                        className="bg-secondary/40"
                        onKeyDown={(e) => { if (e.key === 'Enter' && !replying) sendReply() }}
                      />
                      <Button
                        variant="outline"
                        className="border-gold/30 text-gold hover:bg-gold/10"
                        onClick={startVoice}
                        aria-label="Record voice message"
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                      <Button className="bg-gold-gradient font-semibold text-primary-foreground" onClick={sendReply} disabled={replying || !replyText.trim()}>
                        {replying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
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

interface ChatBubbleProps {
  role: string
  message: string
  voiceData?: string | null
  voiceMime?: string | null
  voiceDuration?: number | null
  time: string
}

function ChatBubble({ role, message, voiceData, voiceMime, voiceDuration, time }: ChatBubbleProps) {
  const isAdmin = role === 'admin'
  const hasText = !!message?.trim()
  const hasVoice = !!voiceData
  return (
    <div className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
        isAdmin ? 'bg-gold/10 border border-gold/20' : 'bg-secondary/60 border border-border'
      }`}>
        <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {isAdmin ? 'Support Team' : 'You'}
        </div>
        {hasText && <div>{message}</div>}
        {hasVoice && (
          <div className={hasText ? 'mt-2' : ''}>
            <VoiceMessage voiceData={voiceData!} voiceMime={voiceMime} voiceDuration={voiceDuration} />
          </div>
        )}
        {!hasText && !hasVoice && <div className="italic text-muted-foreground">(empty)</div>}
        <div className="mt-1 text-[9px] text-muted-foreground">{timeAgo(time)}</div>
      </div>
    </div>
  )
}
