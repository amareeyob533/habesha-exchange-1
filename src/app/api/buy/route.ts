import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { BUY_BANKS } from '@/lib/buy-config'

// The rate fluctuates client-side between 185 and 187.
// The server accepts any rate in that range (the client sends the current live rate).
const RATE_MIN = 185
const RATE_MAX = 187

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

    const { usdtAmount, birrAmount, bank, screenshotUrl, screenshotId, transactionCode, rate: clientRate } = await req.json()
    const usdt = Number(usdtAmount)
    const birr = Number(birrAmount)
    if (!usdt || usdt <= 0) {
      return NextResponse.json({ error: 'Enter a valid USDT amount' }, { status: 400 })
    }
    if (!birr || birr <= 0) {
      return NextResponse.json({ error: 'Enter a valid ETB amount' }, { status: 400 })
    }
    // Use the client-provided live rate (validated to be within the allowed range).
    const rate = clientRate && clientRate >= RATE_MIN && clientRate <= RATE_MAX ? clientRate : (RATE_MIN + RATE_MAX) / 2
    // Validate the ETB/USDT ratio matches the rate (allow tiny rounding).
    const expectedBirr = usdt * rate
    if (Math.abs(birr - expectedBirr) > 2) {
      return NextResponse.json({ error: `ETB amount must be ~${expectedBirr.toFixed(2)} for ${usdt} USDT at rate ${rate.toFixed(5)}` }, { status: 400 })
    }
    if (!bank || !BUY_BANKS.some((b) => b.code === bank)) {
      return NextResponse.json({ error: 'Select a valid bank' }, { status: 400 })
    }

    // screenshotUrl is a data URL (from /api/buy/upload). We also store the
    // PaymentProof id so the admin can view the image and so it can be deleted
    // automatically after the order is reviewed.
    const order = await db.buyOrder.create({
      data: {
        userId: user.id,
        usdtAmount: usdt,
        birrAmount: birr,
        rate,
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
