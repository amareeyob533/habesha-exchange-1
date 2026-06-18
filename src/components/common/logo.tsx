'use client'

import { cn } from '@/lib/utils'

export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <img
      src="/habesha-mark.jpg"
      alt="Habesha Exchange logo mark"
      className={cn('rounded-xl object-cover', className)}
    />
  )
}

export function LogoFull({ className = '' }: { className?: string }) {
  return (
    <img
      src="/habesha-logo.jpg"
      alt="Habesha Exchange"
      className={cn('object-contain', className)}
    />
  )
}

export function LogoWord({ className = '' }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark className="h-9 w-9 rounded-lg ring-1 ring-gold/30" />
      <div className="leading-none">
        <div className="text-[15px] font-extrabold tracking-tight">
          <span className="text-gold-gradient">HABESHA</span>
        </div>
        <div className="text-[9px] font-semibold tracking-[0.3em] text-muted-foreground">
          EXCHANGE
        </div>
      </div>
    </div>
  )
}
