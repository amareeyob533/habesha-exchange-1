'use client'

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ShieldAlert, AlertTriangle, Ban, X } from 'lucide-react'

interface TermsModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** Which section to scroll to / highlight — 'tos' or 'disclaimer' */
  section?: 'tos' | 'disclaimer'
}

/**
 * Terms of Service & Disclaimer modal.
 *
 * Opens when the user taps "Terms of Service" or "Disclaimer" in the signup
 * checkbox label. Contains the full policy text (educational simulation,
 * no real funds, no refunds / zero liability).
 */
export function TermsModal({ open, onOpenChange, section }: TermsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-[520px] w-[calc(100%-2rem)] overflow-y-auto border-border/80 bg-card p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold ring-1 ring-gold/20">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base font-bold">
              Project Disclaimer & Terms of Service
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              Please read carefully before creating your account
            </DialogDescription>
          </div>
        </div>

        {/* Body — the policy text */}
        <div className="space-y-4 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
          {/* Educational Simulation */}
          <section className="rounded-xl border border-border bg-secondary/20 p-3">
            <div className="mb-1.5 flex items-center gap-2 text-foreground">
              <ShieldAlert className="h-4 w-4 text-gold" />
              <span className="text-xs font-bold uppercase tracking-wider text-gold">
                Educational Simulation
              </span>
            </div>
            <p className="text-[13px] text-foreground">
              <b>Habesha Exchange is strictly a simulator and educational project created by a Grade 12 student.</b> It is NOT a real financial platform, crypto exchange, or money transfer service.
            </p>
          </section>

          {/* No Real Funds */}
          <section className="rounded-xl border border-down/30 bg-down/5 p-3">
            <div className="mb-1.5 flex items-center gap-2 text-foreground">
              <Ban className="h-4 w-4 text-down" />
              <span className="text-xs font-bold uppercase tracking-wider text-down">
                No Real Funds
              </span>
            </div>
            <p className="text-[13px] text-foreground">
              <b>Do NOT deposit or send real fiat money (ETB/BIRR) or real cryptocurrency (USDT/Crypto)</b> to any account, phone number, or address displayed on this website.
            </p>
          </section>

          {/* No Refunds & Zero Liability */}
          <section className="rounded-xl border border-down/40 bg-down/5 p-3">
            <div className="mb-1.5 flex items-center gap-2 text-foreground">
              <AlertTriangle className="h-4 w-4 text-down" />
              <span className="text-xs font-bold uppercase tracking-wider text-down">
                No Refunds & Zero Liability
              </span>
            </div>
            <p className="text-[13px] text-foreground">
              Any funds sent to accounts listed on this platform are <b>non-refundable under any circumstances</b>. By accepting these terms, you acknowledge that you are using a simulation, assume full responsibility, and agree that the platform creators are <b>not liable for any financial losses or unintended transfers</b> made by the user.
            </p>
          </section>

          {/* Acknowledgement */}
          <p className="border-t border-border pt-3 text-center text-[11px] text-muted-foreground">
            By creating an account, you confirm that you have read, understood, and agree to all of the above terms.
          </p>
        </div>

        {/* Close button at bottom for easy dismissal */}
        <div className="sticky bottom-0 border-t border-border bg-card px-5 py-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-gradient py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-95"
          >
            <X className="h-4 w-4" /> Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
