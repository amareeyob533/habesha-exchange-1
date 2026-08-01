'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useUI } from '@/hooks/use-ui'
import { useToast } from '@/hooks/use-toast'
import { apiFetch } from '@/lib/api-client'
import { LifeBuoy, Loader2, MessageCircle, Check, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function SupportModal() {
  const { supportOpen } = useUI()
  const { toast } = useToast()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  function close() {
    useUI.setState({ supportOpen: false })
    if (done) {
      setDone(null)
      setSubject('')
      setMessage('')
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return
    setLoading(true)
    try {
      // Create a support ticket via the new ticket API
      await apiFetch('/api/support/ticket', {
        method: 'POST',
        body: JSON.stringify({ subject, message }),
      })
      const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP || '+251900000000'
      setDone(whatsapp)
      toast({ title: 'Ticket created', description: 'Our team will get back to you.' })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={supportOpen} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-[440px] w-[calc(100%-2rem)] glass-strong border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold ring-1 ring-gold/20">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold">Support</DialogTitle>
            <DialogDescription className="text-xs">We're here to help, 24/7</DialogDescription>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-5 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-up/15 text-up ring-2 ring-up/30">
                <Check className="h-7 w-7" />
              </div>
              <h3 className="mt-3 text-lg font-bold">Message received</h3>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Thanks for reaching out! For a faster response, message us directly on WhatsApp.
              </p>
              <a
                href={`https://wa.me/${done.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                <MessageCircle className="h-4 w-4" /> Chat on WhatsApp <ExternalLink className="h-3 w-3" />
              </a>
              <div className="mt-2 text-xs text-muted-foreground">{done}</div>
              <Button variant="outline" className="mt-3 w-full" onClick={close}>Close</Button>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="How can we help?" className="bg-secondary/40" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Message</Label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your issue…" className="min-h-[120px] bg-secondary/40" required />
              </div>
              <Button type="submit" className="bg-gold-gradient h-11 w-full font-semibold text-primary-foreground" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Message'}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
