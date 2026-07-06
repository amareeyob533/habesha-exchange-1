// Client-safe formatting helpers.

export function formatUsd(amount: number, opts?: { max?: number; min?: number }): string {
  const max = opts?.max ?? 2
  // For currency style, minimumFractionDigits must be <= maximumFractionDigits.
  const min = opts?.min ?? Math.min(2, max)
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  })
}

export function formatTokenAmount(amount: number, symbol: string): string {
  const decimals = symbol === 'BTC' ? 6 : 2
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatCompact(amount: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(amount)
}

export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days}d ago`
  return d.toLocaleDateString()
}

export function shortAddr(addr: string, len = 6): string {
  if (!addr) return ''
  if (addr.length <= len * 2 + 2) return addr
  return `${addr.slice(0, len)}…${addr.slice(-len)}`
}
