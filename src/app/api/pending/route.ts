import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/** GET /api/pending — returns the user's pending + recently-approved items */
export async function GET() {
  try {
    const session = await getCurrentUser()
    if (!session) return NextResponse.json({ items: [], hasPending: false })

    // Fetch pending items + recently approved (last 24h) items
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [pendingDeposits, pendingWithdrawals, pendingBuys, approvedDeposits, approvedWithdrawals, approvedBuys] = await Promise.all([
      db.deposit.findMany({ where: { userId: session.id, status: 'pending' }, orderBy: { createdAt: 'desc' }, take: 10 }),
      db.withdrawal.findMany({ where: { userId: session.id, status: 'pending' }, orderBy: { createdAt: 'desc' }, take: 10 }),
      db.buyOrder.findMany({ where: { userId: session.id, status: 'pending' }, orderBy: { createdAt: 'desc' }, take: 10 }),
      db.deposit.findMany({ where: { userId: session.id, status: 'approved', updatedAt: { gt: oneDayAgo } }, orderBy: { updatedAt: 'desc' }, take: 10 }),
      db.withdrawal.findMany({ where: { userId: session.id, status: 'completed', updatedAt: { gt: oneDayAgo } }, orderBy: { updatedAt: 'desc' }, take: 10 }),
      db.buyOrder.findMany({ where: { userId: session.id, status: 'approved', updatedAt: { gt: oneDayAgo } }, orderBy: { updatedAt: 'desc' }, take: 10 }),
    ])

    const items: { id: string; type: string; description: string; amount: string; status: string; createdAt: string; updatedAt: string }[] = []

    // Pending deposits
    for (const d of pendingDeposits) {
      items.push({
        id: d.id, type: 'deposit', status: 'pending',
        description: `Deposit of ${d.amount} ${d.token} via ${d.network}`,
        amount: `${d.amount} ${d.token}`, createdAt: d.createdAt.toISOString(), updatedAt: d.updatedAt.toISOString(),
      })
    }
    // Approved deposits (last 24h)
    for (const d of approvedDeposits) {
      items.push({
        id: d.id, type: 'deposit', status: 'approved',
        description: `Deposit of ${d.amount} ${d.token} via ${d.network}`,
        amount: `${d.amount} ${d.token}`, createdAt: d.createdAt.toISOString(), updatedAt: d.updatedAt.toISOString(),
      })
    }

    // Pending withdrawals
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
        amount: `${w.amount} ${w.token}`, createdAt: w.createdAt.toISOString(), updatedAt: w.updatedAt.toISOString(),
      })
    }
    // Approved withdrawals (last 24h)
    for (const w of approvedWithdrawals) {
      const isInternal = w.network === 'internal'
      const isBank = w.network === 'bank'
      items.push({
        id: w.id, type: 'withdrawal', status: 'approved',
        description: isBank
          ? `Bank withdrawal of ${w.amount} USDT (${w.birrAmount?.toLocaleString('en-US')} ETB via ${w.bankName})`
          : isInternal
          ? `Transfer of ${w.amount} ${w.token} to UID ${w.address}`
          : `Withdrawal of ${w.amount} ${w.token} to ${w.address.slice(0, 12)}...`,
        amount: `${w.amount} ${w.token}`, createdAt: w.createdAt.toISOString(), updatedAt: w.updatedAt.toISOString(),
      })
    }

    // Pending buy orders
    for (const b of pendingBuys) {
      items.push({
        id: b.id, type: 'buy', status: 'pending',
        description: `Buy order for ${b.usdtAmount} USDT (${b.birrAmount.toLocaleString('en-US')} ETB via ${b.bank})`,
        amount: `${b.usdtAmount} USDT`, createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString(),
      })
    }
    // Approved buy orders (last 24h)
    for (const b of approvedBuys) {
      items.push({
        id: b.id, type: 'buy', status: 'approved',
        description: `Buy order for ${b.usdtAmount} USDT (${b.birrAmount.toLocaleString('en-US')} ETB via ${b.bank})`,
        amount: `${b.usdtAmount} USDT`, createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString(),
      })
    }

    // Sort by newest first
    items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

    return NextResponse.json({
      items,
      hasPending: items.some((i) => i.status === 'pending'),
    })
  } catch (err: any) {
    console.error('pending error:', err)
    return NextResponse.json({ items: [], hasPending: false })
  }
}
