import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { getToken } from '@/lib/tokens'
import { notifyAdminDeposit } from '@/lib/email'
import { signApprovalToken, getBaseUrl } from '@/lib/deposit-approval'
import { hasApprovedKyc, getTotalDepositedUsd, KYC_DEPOSIT_LIMIT_USD } from '@/lib/kyc-helpers'

export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    const { token, network, amount } = await req.json()
    const tk = getToken(token)
    if (!tk) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    if (tk.internalOnly) {
      return NextResponse.json({ error: 'This token cannot be deposited externally' }, { status: 400 })
    }
    const net = tk.networks.find((n) => n.name === network)
    if (!net) return NextResponse.json({ error: 'Invalid network' }, { status: 400 })
    const amt = Number(amount)
    if (!amt || amt <= 0) {
      return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 })
    }

    // KYC deposit limit: users without approved KYC can deposit at most
    // $500 USD worth of tokens in total (lifetime approved deposits + this one).
    if (!hasApprovedKyc(user)) {
      const alreadyDeposited = await getTotalDepositedUsd(user.id)
      // Approximate USD value of this deposit using static fallback prices.
      const PRICES: Record<string, number> = {
        USDT: 1, USDC: 1, BTC: 97500, TON: 5.42, HABESHA: 6.4321674,
      }
      const thisDepositUsd = amt * (PRICES[token] ?? 0)
      const totalAfter = alreadyDeposited + thisDepositUsd
      if (totalAfter > KYC_DEPOSIT_LIMIT_USD) {
        const remaining = Math.max(0, KYC_DEPOSIT_LIMIT_USD - alreadyDeposited)
        return NextResponse.json(
          {
            error: `Deposit limit reached. Without KYC verification you can deposit up to $${KYC_DEPOSIT_LIMIT_USD} USD total. You've already deposited $${alreadyDeposited.toFixed(2)} USD. Remaining: $${remaining.toFixed(2)}. Please complete KYC verification in Settings to unlock unlimited deposits.`,
            kycRequired: true,
            limit: KYC_DEPOSIT_LIMIT_USD,
            alreadyDeposited: alreadyDeposited.toFixed(2),
            remaining: remaining.toFixed(2),
          },
          { status: 403 },
        )
      }
    }

    const deposit = await db.deposit.create({
      data: { userId: user.id, token, network, amount: amt, status: 'pending' },
    })
    await db.notification.create({
      data: {
        userId: user.id,
        title: 'Deposit Submitted',
        message: `Your deposit of ${amt} ${token} on ${network} is pending admin confirmation. You'll be notified once it's credited.`,
        type: 'info',
      },
    })

    // Build signed one-click approve / reject links and email them to the admin.
    const base = getBaseUrl(req)
    const approveUrl = `${base}/api/deposit/approve?token=${signApprovalToken(deposit.id, 'approve')}`
    const rejectUrl = `${base}/api/deposit/reject?token=${signApprovalToken(deposit.id, 'reject')}`
    await notifyAdminDeposit({ uid: user.uid, amount: amt, token, network, approveUrl, rejectUrl })

    return NextResponse.json({ ok: true, deposit })
  } catch (err: any) {
    console.error('deposit error:', err)
    return NextResponse.json({ error: err?.message || 'Deposit failed' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    const deposits = await db.deposit.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ deposits })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
