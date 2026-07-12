import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'

/**
 * GET /api/user/settings — returns the user's settings (creates defaults if none exist).
 * POST /api/user/settings — saves the user's settings (upserts).
 */

export async function GET() {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    let settings = await db.userSettings.findUnique({ where: { userId: user.id } })
    if (!settings) {
      // Create defaults
      settings = await db.userSettings.create({ data: { userId: user.id } })
    }

    return NextResponse.json({ settings })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    const body = await req.json()

    // Whitelist allowed fields + validate types.
    const data: any = {}
    if (typeof body.defaultToken === 'string') data.defaultToken = body.defaultToken
    if (typeof body.slippage === 'number') data.slippage = Math.max(0, Math.min(50, body.slippage))
    if (typeof body.showBalanceUsd === 'boolean') data.showBalanceUsd = body.showBalanceUsd
    if (typeof body.compactView === 'boolean') data.compactView = body.compactView
    if (typeof body.defaultNetwork === 'string') data.defaultNetwork = body.defaultNetwork
    if (typeof body.autoConvertDust === 'boolean') data.autoConvertDust = body.autoConvertDust
    if (typeof body.hideSmallBalances === 'boolean') data.hideSmallBalances = body.hideSmallBalances
    if (typeof body.emailNotifs === 'boolean') data.emailNotifs = body.emailNotifs
    if (typeof body.pushNotifs === 'boolean') data.pushNotifs = body.pushNotifs
    if (typeof body.depositAlerts === 'boolean') data.depositAlerts = body.depositAlerts
    if (typeof body.withdrawAlerts === 'boolean') data.withdrawAlerts = body.withdrawAlerts

    const settings = await db.userSettings.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
    })

    return NextResponse.json({ ok: true, settings })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
