'use client'

import { useUI } from '@/hooks/use-ui'
import { Button } from '@/components/ui/button'
import { LifeBuoy, MessageCircle, Mail, Clock, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP || '+251900000000'

const FAQ = [
  { q: 'How long do deposits take?', a: 'Deposits are confirmed by our team and usually credited within minutes after you click "I Deposited".' },
  { q: 'Can I withdraw Habesha Token?', a: 'No. Habesha Token can only be transferred internally between Habesha Exchange users via their 6-digit UID.' },
  { q: 'How do internal transfers work?', a: 'Enter the recipient\'s 6-digit UID and the amount — funds move instantly with zero fees.' },
  { q: 'How do bank withdrawals work?', a: 'Exchange your tokens to USDT, then choose Withdraw → Bank, pick your bank (CBE, Telebirr, Abay, M-PESA), and enter your account details. Funds arrive in ETB at 1 USDT = ~186 ETB.' },
]

export function SupportView() {
  const { openSupport } = useUI()
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Support</h2>
        <p className="text-sm text-muted-foreground">We're here to help, 24/7</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl glass-card gradient-border p-5 shadow-gold">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#25D366]">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="mt-3 text-base font-bold">WhatsApp</div>
          <p className="mt-1 text-xs text-muted-foreground">Fastest way to reach us</p>
          <a href={`https://wa.me/${WHATSAPP.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90">
            <MessageCircle className="h-4 w-4" /> Chat now <ExternalLink className="h-3 w-3" />
          </a>
          <div className="mt-2 text-center text-xs text-muted-foreground">{WHATSAPP}</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl glass-card p-5 shadow-premium">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/15 text-gold">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div className="mt-3 text-base font-bold">Send a message</div>
          <p className="mt-1 text-xs text-muted-foreground">Open a support ticket</p>
          <Button className="bg-gold-gradient mt-3 w-full font-semibold text-primary-foreground" onClick={openSupport}>
            Open Ticket
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl glass-card p-5 shadow-premium">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-foreground">
            <Clock className="h-5 w-5" />
          </div>
          <div className="mt-3 text-base font-bold">Response time</div>
          <p className="mt-1 text-xs text-muted-foreground">Usually within a few hours</p>
          <div className="mt-3 rounded-lg bg-secondary/40 p-2.5 text-xs text-muted-foreground">
            <Mail className="mr-1 inline h-3 w-3" /> Support available 24/7
          </div>
        </motion.div>
      </div>

      <div className="rounded-2xl glass-card p-5 shadow-premium">
        <h3 className="text-lg font-bold">Frequently Asked Questions</h3>
        <div className="mt-3 space-y-2">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-xl border border-border bg-secondary/20 p-3">
              <summary className="cursor-pointer list-none text-sm font-medium marker:hidden">{f.q}</summary>
              <p className="mt-2 text-xs text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
