'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { BadgeCheck } from 'lucide-react'

interface VerifiedAvatarProps {
  src?: string | null
  fallback: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** Show the blue verification checkmark (only when KYC is approved) */
  verified?: boolean
}

const SIZE_MAP = {
  sm: 'h-7 w-7',
  md: 'h-20 w-20',
  lg: 'h-24 w-24',
}

const BADGE_SIZE_MAP = {
  sm: 'h-3.5 w-3.5',
  md: 'h-6 w-6',
  lg: 'h-7 w-7',
}

/**
 * Avatar with optional blue KYC verification checkmark.
 *
 * When `verified` is true, a blue circular badge with a white checkmark is
 * shown overlapping the bottom-right edge of the avatar — exactly like
 * Twitter/Instagram verified profiles.
 *
 * - `sm`: topbar avatar (28px)
 * - `md`: profile page avatar (80px)
 * - `lg`: large profile avatar (96px)
 */
export function VerifiedAvatar({ src, fallback, size = 'md', className, verified }: VerifiedAvatarProps) {
  return (
    <div className={cn('relative inline-block', className)}>
      <Avatar className={cn(SIZE_MAP[size], 'ring-2 ring-gold/30')}>
        {src ? <AvatarImage src={src} alt={fallback} /> : null}
        <AvatarFallback className="bg-gold/15 text-sm font-bold text-gold">
          {fallback}
        </AvatarFallback>
      </Avatar>
      {verified && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-[#1D9BF0] ring-2 ring-background',
            BADGE_SIZE_MAP[size],
          )}
          title="Verified (KYC)"
        >
          <BadgeCheck className="h-full w-full text-white" strokeWidth={3} />
        </span>
      )}
    </div>
  )
}
