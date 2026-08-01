'use client'

import { cn } from '@/lib/utils'

interface TokenIconProps {
  symbol: string
  iconUrl?: string | null
  icon: string // fallback glyph
  color: string
  size?: number
  className?: string
}

/**
 * Renders a real token icon image if available, otherwise falls back to
 * a colored circle with the glyph.
 */
export function TokenIcon({ symbol, iconUrl, icon, color, size = 36, className = '' }: TokenIconProps) {
  if (iconUrl) {
    return (
      <div
        className={cn('relative shrink-0 overflow-hidden rounded-full', className)}
        style={{ width: size, height: size }}
      >
        <img
          src={iconUrl}
          alt={`${symbol} token icon`}
          className="h-full w-full object-cover"
          style={{ borderRadius: '50%' }}
        />
      </div>
    )
  }
  // Fallback: colored circle with glyph
  return (
    <div
      className={cn('flex shrink-0 items-center justify-center rounded-full font-bold', className)}
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}22`,
        color,
        fontSize: size * 0.4,
      }}
    >
      {icon}
    </div>
  )
}
