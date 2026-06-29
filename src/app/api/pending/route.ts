import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/** GET /api/pending — returns the user's pending + recently-approved items */
export async function GET() {
  try {
    const session = await getCurrentUser()
    if (!session) return NextResponse.json({ items: [], hasPending: false, hasNewApproved: false })

    // Fetch pending deposits, withdrawals, and buy orders
    const [pendingDeposits, pendingWithdrawals, pendingBuys] = await Promise.all([
      db.deposit.findMany({ where: { userId: session.id, status: 'pending' }, orderBy: { createdAt: 'desc' }, take: 10 }),
      db.withdrawal.findMany({ where: { userId: session.id, status: 'pending' }, orderBy: { createdAt: 'desc' }, take: 10 }),
      db.buyOrder.findMany({ where: { userId: session.id, status: 'pending' }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ])

    // Build pending items list
    const items: { id: string; type: string; description: string; amount: string; status: string; createdAt: string }[] = []

    for (const d of pendingDeposits) {
      items.push({
        id: d.id, type: 'deposit', status: 'pending',
        description: `Deposit of ${d.amount} ${d.token} via ${d.network}`,
        amount: `${d.amount} ${d.token}`, createdAt: d.createdAt.toISOString(),
      })
    }
    for (const w of pendingWithdrawals) {
      const isInternal = w.network === 'internal'
      const isBank = w.network === 'bank'
      items.push({
        id: w.id, type: 'withdrawal', status: 'pending',
        description: isBank
          ? `Bank withdrawal of ${w.amount} USDT (${w.birrAmount?.toLocaleString('en-US')} ETB via ${w.bankName})`
          : isInternal
          ? `Transfer of ${w.amount} ${w.token} to UID ${w.address}`
          : `Withdrawal of ${w.amount} ${w.token} to ${w.address.slice(0, 12)}...`,
        amount: `${w.amount} ${w.token}`, createdAt: w.createdAt.toISOString(),
      })
    }
    for (const b of pendingBuys) {
      items.push({
        id: b.id, type: 'buy', status: 'pending',
        description: `Buy order for ${b.usdtAmount} USDT (${b.birrAmount.toLocaleString('en-US')} ETB via ${b.bank})`,
        amount: `${b.usdtAmount} USDT`, createdAt: b.createdAt.toISOString(),
      })
    }

    // Sort by newest first
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      items,
      hasPending: items.length > 0,
    })
  } catch (err: any) {
    console.error('pending error:', err)
    return NextResponse.json({ items: [], hasPending: false })
  }
}
