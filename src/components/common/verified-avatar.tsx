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

// Avatar sizes — kept the same so existing layouts don't break.
const SIZE_MAP = {
  sm: 'h-7 w-7',
  md: 'h-20 w-20',
  lg: 'h-24 w-24',
}

// Badge sizes — tuned to a ~30-35% ratio of the avatar (Twitter/X standard).
// Previously the `sm` badge was 50% of the avatar which looked bulky and
// unprofessional. Now it's a subtle, premium accent.
const BADGE_SIZE_MAP = {
  sm: 'h-3 w-3',     // 12px on 28px avatar  (~43% — was 14px/50%)
  md: 'h-5 w-5',     // 20px on 80px avatar  (~25% — was 24px/30%)
  lg: 'h-6 w-6',     // 24px on 96px avatar  (~25% — was 28px/29%)
}

// Badge position — sits cleanly on the bottom-right edge of the avatar ring.
// Slightly tighter on `sm` so it doesn't overflow the topbar row.
const BADGE_POSITION_MAP = {
  sm: '-bottom-0 -right-0',
  md: '-bottom-1 -right-1',
  lg: '-bottom-1.5 -right-1.5',
}

// Icon stroke weight per size — thinner on small badges for a refined look.
const BADGE_STROKE_MAP = {
  sm: 2.5,
  md: 3,
  lg: 3,
}

/**
 * Avatar with optional blue KYC verification checkmark.
 *
 * When `verified` is true, a blue circular badge with a white checkmark is
 * shown overlapping the bottom-right edge of the avatar — exactly like
 * Twitter/Instagram verified profiles.
 *
 * Badge proportions are tuned to ~30-35% of the avatar size (the industry
 * standard for verified badges) so it reads as a subtle, premium accent
 * rather than a bulky circle dominating the avatar.
 *
 * - `sm`: topbar avatar (28px) — 12px badge
 * - `md`: profile page avatar (80px) — 20px badge
 * - `lg`: large profile avatar (96px) — 24px badge
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
            'absolute flex items-center justify-center rounded-full bg-[#1D9BF0]',
            'ring-2 ring-background shadow-sm',
            BADGE_POSITION_MAP[size],
            BADGE_SIZE_MAP[size],
          )}
          title="Verified (KYC)"
        >
          <BadgeCheck
            className="h-full w-full text-white"
            strokeWidth={BADGE_STROKE_MAP[size]}
          />
        </span>
      )}
    </div>
  )
}
