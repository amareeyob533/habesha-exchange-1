import { db } from '@/lib/db'
import { sendPushNotification } from '@/lib/push'

export interface WithdrawalWithUser {
  id: string
  userId: string
  token: string
  network: string
  amount: number
  address: string
  status: string
  bankName: string | null
  accountName: string | null
  birrAmount: number | null
  createdAt: Date
  user: { id: string; uid: string; email: string; name: string | null }
}

/** Fetch all withdrawals (optionally filtered by status) with their user. */
export async function fetchWithdrawals(status?: string): Promise<WithdrawalWithUser[]> {
  return db.withdrawal.findMany({
    where: status ? { status } : undefined,
    include: { user: { select: { id: true, uid: true, email: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  }) as Promise<WithdrawalWithUser[]>
}

/**
 * Approve a withdrawal: mark completed + create completed transaction + notify user.
 * (Balance was already deducted at request time, so no balance change here.)
 * Idempotent.
 */
export async function approveWithdrawal(id: string): Promise<'done' | 'already' | 'not_found' | 'conflict'> {
  const wd = await db.withdrawal.findUnique({ where: { id }, include: { user: true } })
  if (!wd) return 'not_found'
  if (wd.status === 'completed') return 'already'
  if (wd.status === 'rejected') return 'conflict'

  await db.$transaction(async (tx) => {
    await tx.withdrawal.update({ where: { id: wd.id }, data: { status: 'completed' } })
    const isBank = wd.network === 'bank'
    await tx.transaction.create({
      data: {
        userId: wd.userId,
        type: 'withdraw',
        token: wd.token,
        amount: wd.amount,
        status: 'completed',
        network: wd.network,
        address: wd.address,
        note: isBank
          ? `Bank withdrawal approved → ${wd.bankName} · ${wd.accountName} · ${wd.address} · ${wd.birrAmount} ETB`
          : `Withdrawal approved by admin → ${wd.address}`,
      },
    })
    await tx.notification.create({
      data: {
        userId: wd.userId,
        title: isBank ? 'Bank Withdrawal Approved ✓' : 'Withdrawal Completed ✓',
        message: isBank
          ? `Your bank withdrawal of ${wd.amount} USDT (≈ ${Number(wd.birrAmount).toLocaleString('en-US')} ETB) to ${wd.bankName} account ${wd.address} (${wd.accountName}) has been approved. The ETB will arrive in your bank account shortly.`
          : `Your withdrawal of ${wd.amount} ${wd.token} to ${wd.address.slice(0, 12)}... has been approved and sent.`,
        type: 'success',
      },
    })
    await sendPushNotification(wd.userId, {
      title: isBank ? 'Bank Withdrawal Approved ✓' : 'Withdrawal Completed ✓',
      body: isBank
        ? `Your bank withdrawal of ${wd.amount} USDT (≈ ${Number(wd.birrAmount).toLocaleString('en-US')} ETB) to ${wd.bankName} account ${wd.address} (${wd.accountName}) has been approved. The ETB will arrive in your bank account shortly.`
        : `Your withdrawal of ${wd.amount} ${wd.token} to ${wd.address.slice(0, 12)}... has been approved and sent.`,
    }).catch(() => {})
  })
  return 'done'
}

/**
 * Reject a withdrawal: refund the deducted balance + mark rejected + create refund
 * transaction + notify user. Idempotent.
 */
export async function rejectWithdrawal(id: string): Promise<'done' | 'already' | 'not_found' | 'conflict'> {
  const wd = await db.withdrawal.findUnique({ where: { id }, include: { user: true } })
  if (!wd) return 'not_found'
  if (wd.status === 'rejected') return 'already'
  if (wd.status === 'completed') return 'conflict'

  await db.$transaction(async (tx) => {
    await tx.withdrawal.update({ where: { id: wd.id }, data: { status: 'rejected' } })
    // Refund the balance that was deducted at request time.
    const bal = await tx.balance.findUnique({
      where: { userId_token: { userId: wd.userId, token: wd.token } },
    })
    if (bal) {
      await tx.balance.update({ where: { id: bal.id }, data: { amount: bal.amount + wd.amount } })
    } else {
      await tx.balance.create({ data: { userId: wd.userId, token: wd.token, amount: wd.amount } })
    }
    await tx.transaction.create({
      data: {
        userId: wd.userId,
        type: 'refund',
        token: wd.token,
        amount: wd.amount,
        status: 'completed',
        network: wd.network,
        address: wd.address,
        note: `Withdrawal rejected by admin — funds returned`,
      },
    })
    await tx.notification.create({
      data: {
        userId: wd.userId,
        title: 'Withdrawal Rejected',
        message:
          wd.network === 'bank'
            ? `Your bank withdrawal of ${wd.amount} USDT was rejected. ${wd.amount} USDT has been returned to your account. Please contact support if you believe this is an error.`
            : `Your withdrawal of ${wd.amount} ${wd.token} was rejected. ${wd.amount} ${wd.token} has been returned to your account.`,
        type: 'warning',
      },
    })
    await sendPushNotification(wd.userId, {
      title: 'Withdrawal Rejected',
      body:
        wd.network === 'bank'
          ? `Your bank withdrawal of ${wd.amount} USDT was rejected. ${wd.amount} USDT has been returned to your account. Please contact support if you believe this is an error.`
          : `Your withdrawal of ${wd.amount} ${wd.token} was rejected. ${wd.amount} ${wd.token} has been returned to your account.`,
    }).catch(() => {})
  })
  return 'done'
}
