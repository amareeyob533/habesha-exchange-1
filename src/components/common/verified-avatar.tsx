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

// Avatar sizes — unchanged so existing layouts don't break.
const SIZE_MAP = {
  sm: 'h-7 w-7',   // 28px
  md: 'h-20 w-20', // 80px
  lg: 'h-24 w-24', // 96px
}

// Badge sizes — tuned to ~28-36% of the avatar diameter.
// Smaller than before so the badge reads as a subtle status accent, not a
// second circle competing with the avatar.
const BADGE_SIZE_MAP = {
  sm: 'h-2.5 w-2.5',  // 10px on 28px avatar (~36%)
  md: 'h-4 w-4',      // 16px on 80px avatar (~20%)
  lg: 'h-5 w-5',      // 20px on 96px avatar (~21%)
}

// Position — pulled INWARD so ~30% of the badge overlaps the avatar edge
// (the "layered" look used by Twitter/X, Instagram, TikTok). Previously
// the badge sat on the outside edge with a visible gap, which made it
// look "tacked on" rather than integrated.
const BADGE_POSITION_MAP = {
  sm: '-bottom-0.5 -right-0.5',
  md: '-bottom-0.5 -right-0.5',
  lg: '-bottom-1 -right-1',
}

// Icon stroke weight — slightly thinner for a refined, premium feel.
const BADGE_STROKE_MAP = {
  sm: 3,
  md: 3,
  lg: 2.75,
}

/**
 * Avatar with optional blue KYC verification checkmark.
 *
 * When `verified` is true, a blue circular badge with a white checkmark is
 * shown overlapping the bottom-right edge of the avatar.
 *
 * Design notes (tuned to match Twitter/X, Instagram, TikTok verified badges):
 *  - Badge diameter is ~25-36% of the avatar (industry standard).
 *  - Badge is pulled inward so ~30% overlaps the avatar edge (layered look,
 *    not "tacked on").
 *  - Thin 1px ring (ring-1) in the background color — just enough to
 *    separate the badge from the avatar, not a thick white frame.
 *  - Subtle drop shadow (shadow-md) for depth, so the badge "lifts" off
 *    the avatar without needing a heavy border.
 *
 * - `sm`: topbar avatar (28px) — 10px badge
 * - `md`: profile page avatar (80px) — 16px badge
 * - `lg`: large profile avatar (96px) — 20px badge
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
            // Verified blue — kept as Twitter/X blue (#1D9BF0) because blue
            // is the universal color users recognize for "verified". The
            // shadow + thin ring integrate it with the dark/gold UI.
            'absolute flex items-center justify-center rounded-full bg-[#1D9BF0]',
            // Thin 1px ring in the background color — clean separation
            // without a bulky white frame.
            'ring-1 ring-background',
            // Subtle drop shadow gives the badge depth so it "lifts" off
            // the avatar without needing a thick border.
            'shadow-md shadow-black/40',
            BADGE_POSITION_MAP[size],
            BADGE_SIZE_MAP[size],
          )}
          title="Verified (KYC)"
        >
          <BadgeCheck
            className="h-[85%] w-[85%] text-white"
            strokeWidth={BADGE_STROKE_MAP[size]}
          />
        </span>
      )}
    </div>
  )
}
