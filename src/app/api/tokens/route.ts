import { NextResponse } from 'next/server'
import { TOKENS } from '@/lib/tokens'

export async function GET() {
  return NextResponse.json({
    tokens: TOKENS.map((t) => ({
      symbol: t.symbol,
      name: t.name,
      price: t.price,
      change24h: t.change24h,
      color: t.color,
      icon: t.icon,
      iconUrl: t.iconUrl || null,
      fixed: !!t.fixed,
      internalOnly: !!t.internalOnly,
      listed: t.listed,
      networks: t.networks.map((n) => ({ name: n.name, address: n.address })),
    })),
  })
}
