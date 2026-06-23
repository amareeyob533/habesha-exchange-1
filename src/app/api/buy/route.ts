import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { BUY_ETB_RATE, BUY_BANKS } from '@/lib/buy-config'

/** GET /api/buy — list the current user's buy orders */
export async function GET() {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    const orders = await db.buyOrder.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ orders })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}

/** POST /api/buy — create a new buy order { usdtAmount, birrAmount, bank, screenshotUrl, transactionCode? } */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    const { usdtAmount, birrAmount, bank, screenshotUrl, transactionCode } = await req.json()
    const usdt = Number(usdtAmount)
    const birr = Number(birrAmount)
    if (!usdt || usdt <= 0) {
      return NextResponse.json({ error: 'Enter a valid USDT amount' }, { status: 400 })
    }
    if (!birr || birr <= 0) {
      return NextResponse.json({ error: 'Enter a valid ETB amount' }, { status: 400 })
    }
    // Validate the ETB/USDT ratio matches the rate (allow tiny rounding).
    const expectedBirr = usdt * BUY_ETB_RATE
    if (Math.abs(birr - expectedBirr) > 1) {
      return NextResponse.json({ error: `ETB amount must be ${expectedBirr} for ${usdt} USDT` }, { status: 400 })
    }
    if (!bank || !BUY_BANKS.some((b) => b.code === bank)) {
      return NextResponse.json({ error: 'Select a valid bank' }, { status: 400 })
    }
    if (!screenshotUrl) {
      return NextResponse.json({ error: 'Payment screenshot is required' }, { status: 400 })
    }

    const order = await db.buyOrder.create({
      data: {
        userId: user.id,
        usdtAmount: usdt,
        birrAmount: birr,
        rate: BUY_ETB_RATE,
        bank,
        screenshotUrl,
        transactionCode: transactionCode?.trim() || null,
        status: 'pending',
      },
    })
    await db.notification.create({
      data: {
        userId: user.id,
        title: 'Buy Order Submitted',
        message: `Your buy order for ${usdt} USDT (${birr.toLocaleString('en-US')} ETB via ${bank}) is pending admin approval. You'll be notified once the USDT is credited.`,
        type: 'info',
      },
    })

    return NextResponse.json({ ok: true, order })
  } catch (err: any) {
    console.error('buy error:', err)
    return NextResponse.json({ error: err?.message || 'Buy failed' }, { status: 500 })
  }
}
