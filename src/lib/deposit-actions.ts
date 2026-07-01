import { db } from '@/lib/db'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'amareeyob533@gmail.com'

/** True if the given user email is the configured admin. */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  return email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim()
}

export type DepositAction = 'approved' | 'rejected'

export interface DepositWithUser {
  id: string
  userId: string
  token: string
  network: string
  amount: number
  status: string
  createdAt: Date
  user: { id: string; uid: string; email: string; name: string | null }
}

/** Fetch all deposits (optionally filtered by status) with their user. */
export async function fetchDeposits(status?: string): Promise<DepositWithUser[]> {
  return db.deposit.findMany({
    where: status ? { status } : undefined,
    include: { user: { select: { id: true, uid: true, email: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  }) as Promise<DepositWithUser[]>
}

/**
 * Approve a deposit: credit balance + create transaction + notify user (atomic).
 * Idempotent — returns 'already' if already processed.
 * Returns 'not_found' if deposit doesn't exist, 'done' on success.
 */
export async function approveDeposit(depositId: string): Promise<'done' | 'already' | 'not_found' | 'conflict'> {
  const deposit = await db.deposit.findUnique({ where: { id: depositId }, include: { user: true } })
  if (!deposit) return 'not_found'
  if (deposit.status === 'approved') return 'already'
  if (deposit.status === 'rejected') return 'conflict'

  await db.$transaction(async (tx) => {
    await tx.deposit.update({ where: { id: deposit.id }, data: { status: 'approved' } })
    const bal = await tx.balance.findUnique({
      where: { userId_token: { userId: deposit.userId, token: deposit.token } },
    })
    if (bal) {
      await tx.balance.update({ where: { id: bal.id }, data: { amount: bal.amount + deposit.amount } })
    } else {
      await tx.balance.create({ data: { userId: deposit.userId, token: deposit.token, amount: deposit.amount } })
    }
    await tx.transaction.create({
      data: {
        userId: deposit.userId,
        type: 'deposit',
        token: deposit.token,
        amount: deposit.amount,
        status: 'completed',
        network: deposit.network,
        note: 'Deposit approved by admin',
      },
    })
    await tx.notification.create({
      data: {
        userId: deposit.userId,
        title: 'Deposit Credited ✓',
        message: `Your deposit of ${deposit.amount} ${deposit.token} on ${deposit.network} has been approved and credited to your account.`,
        type: 'success',
      },
    })
  })
  return 'done'
}

/**
 * Reject a deposit: mark rejected (no balance change) + notify user.
 * Idempotent.
 */
export async function rejectDeposit(depositId: string): Promise<'done' | 'already' | 'not_found' | 'conflict'> {
  const deposit = await db.deposit.findUnique({ where: { id: depositId }, include: { user: true } })
  if (!deposit) return 'not_found'
  if (deposit.status === 'rejected') return 'already'
  if (deposit.status === 'approved') return 'conflict'

  await db.$transaction(async (tx) => {
    await tx.deposit.update({ where: { id: deposit.id }, data: { status: 'rejected' } })
    await tx.notification.create({
      data: {
        userId: deposit.userId,
        title: 'Deposit Rejected',
        message: `Your deposit of ${deposit.amount} ${deposit.token} on ${deposit.network} could not be confirmed and has been rejected. Please contact support if you believe this is an error.`,
        type: 'warning',
      },
    })
  })
  return 'done'
}
