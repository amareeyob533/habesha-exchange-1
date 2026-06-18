import { db } from '@/lib/db'

const KYC_AUTO_APPROVE_MS = 30 * 1000 // 30 seconds (per requirement)

// NOTE: Deposits and external withdrawals are NO LONGER auto-approved.
// Both require manual admin approval via the in-app Admin panel
// (visible to amareeyob533@gmail.com). See:
//   - src/lib/deposit-actions.ts (approveDeposit / rejectDeposit)
//   - src/lib/withdrawal-actions.ts (approveWithdrawal / rejectWithdrawal)
//   - src/app/api/admin/*
// Internal transfers remain instant (peer-to-peer by design).

/**
 * Process pending KYC items that have exceeded their auto-approval window.
 * Called on session/me fetch so the demo feels live without background jobs.
 */
export async function processAutoApprovals(userId: string) {
  await autoApproveKyc(userId)
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
