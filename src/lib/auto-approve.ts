import { db } from '@/lib/db'

const KYC_AUTO_APPROVE_MS = 30 * 1000 // 30 seconds (per requirement)
const DEPOSIT_AUTO_APPROVE_MS = 60 * 1000 // 60 seconds (demo admin approval)
const WITHDRAW_AUTO_APPROVE_MS = 60 * 1000 // 60 seconds (demo processing)

/**
 * Process pending items that have exceeded their auto-approval window.
 * Called on session/me fetch so the demo feels live without background jobs.
 */
export async function processAutoApprovals(userId: string) {
  await autoApproveKyc(userId)
  await autoApproveDeposits(userId)
  await autoCompleteWithdrawals(userId)
}

async function autoApproveKyc(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { kycStatus: true, kycSubmittedAt: true } })
  if (!user || user.kycStatus !== 'pending' || !user.kycSubmittedAt) return
  if (Date.now() - user.kycSubmittedAt.getTime() < KYC_AUTO_APPROVE_MS) return

  // Determine the requested level from the most recent pending note.
  // We store the requested level inside kycDocUrl metadata? Simpler: set level based on submitted doc.
  const hasHighDoc = !!user.kycDocUrl
  const level = hasHighDoc ? 'high' : 'normal'

  await db.user.update({
    where: { id: userId },
    data: { kycStatus: 'approved', kycLevel: level },
  })
  await db.notification.create({
    data: {
      userId,
      title: 'KYC Approved',
      message:
        level === 'high'
          ? 'Congratulations! Your High KYC is approved. Unlimited deposits & withdrawals enabled.'
          : 'Your KYC verification is approved. Deposit & withdrawal enabled (limit $100,000).',
      type: 'success',
    },
  })
}

async function autoApproveDeposits(userId: string) {
  const pending = await db.deposit.findMany({
    where: { userId, status: 'pending' },
  })
  for (const dep of pending) {
    if (Date.now() - dep.createdAt.getTime() < DEPOSIT_AUTO_APPROVE_MS) continue
    // Credit balance + mark approved + completed transaction + notify.
    await db.$transaction(async (tx) => {
      await tx.deposit.update({ where: { id: dep.id }, data: { status: 'approved' } })
      const bal = await tx.balance.findUnique({
        where: { userId_token: { userId, token: dep.token } },
      })
      if (bal) {
        await tx.balance.update({
          where: { id: bal.id },
          data: { amount: bal.amount + dep.amount },
        })
      } else {
        await tx.balance.create({ data: { userId, token: dep.token, amount: dep.amount } })
      }
      await tx.transaction.create({
        data: {
          userId,
          type: 'deposit',
          token: dep.token,
          amount: dep.amount,
          status: 'completed',
          network: dep.network,
          note: 'Deposit approved',
        },
      })
      await tx.notification.create({
        data: {
          userId,
          title: 'Deposit Credited',
          message: `${dep.amount} ${dep.token} has been credited to your account.`,
          type: 'success',
        },
      })
    })
  }
}

async function autoCompleteWithdrawals(userId: string) {
  const pending = await db.withdrawal.findMany({
    where: { userId, status: 'pending' },
  })
  for (const wd of pending) {
    if (Date.now() - wd.createdAt.getTime() < WITHDRAW_AUTO_APPROVE_MS) continue
    await db.$transaction(async (tx) => {
      await tx.withdrawal.update({ where: { id: wd.id }, data: { status: 'completed' } })
      // Create the completed transaction record (none was created at request time).
      await tx.transaction.create({
        data: {
          userId,
          type: 'withdraw',
          token: wd.token,
          amount: wd.amount,
          status: 'completed',
          network: wd.network,
          address: wd.address,
          note: `Withdrawal to ${wd.address}`,
        },
      })
      const isInternal = wd.network === 'internal'
      await tx.notification.create({
        data: {
          userId,
          title: isInternal ? 'Transfer Completed' : 'Withdrawal Completed',
          message: isInternal
            ? `Your transfer of ${wd.amount} ${wd.token} to UID ${wd.address} is complete.`
            : `Your withdrawal of ${wd.amount} ${wd.token} to ${wd.address.slice(0, 10)}... is complete.`,
          type: 'success',
        },
      })
    })
  }
}
