import { db } from '@/lib/db'

export interface KycSubmission {
  id: string
  uid: string
  email: string
  name: string | null
  avatarUrl: string | null
  kycStatus: string
  kycLevel: string
  kycRequestedLevel: string | null
  kycSubmittedAt: Date | null
  kycDocUrl: string | null
  kycSelfieUrl: string | null
  kycSelfieVideoUrl: string | null
}

/** Fetch users with KYC matching the given status (pending by default). */
export async function fetchKycSubmissions(status = 'pending'): Promise<KycSubmission[]> {
  const users = await db.user.findMany({
    where: status === 'all' ? { kycStatus: { not: 'none' } } : { kycStatus: status },
    orderBy: { kycSubmittedAt: 'desc' },
    select: {
      id: true,
      uid: true,
      email: true,
      name: true,
      avatarUrl: true,
      kycStatus: true,
      kycLevel: true,
      kycRequestedLevel: true,
      kycSubmittedAt: true,
      kycDocUrl: true,
      kycSelfieUrl: true,
      kycSelfieVideoUrl: true,
    },
  })
  return users as KycSubmission[]
}

/**
 * Approve a KYC submission: set kycLevel to the requested level, status approved.
 * Notifies the user. Idempotent.
 */
export async function approveKyc(userId: string): Promise<'done' | 'already' | 'not_found' | 'no_level'> {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return 'not_found'
  if (user.kycStatus === 'approved') return 'already'
  const level = user.kycRequestedLevel || 'normal'
  if (level !== 'normal' && level !== 'high') return 'no_level'

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { kycStatus: 'approved', kycLevel: level },
    })
    await tx.notification.create({
      data: {
        userId,
        title: 'KYC Approved ✓',
        message:
          level === 'high'
            ? 'Congratulations! Your High KYC is approved. Unlimited deposits & withdrawals are now enabled.'
            : 'Your KYC verification is approved. Deposits & withdrawals are now enabled (limit $100,000).',
        type: 'success',
      },
    })
  })
  return 'done'
}

/**
 * Reject a KYC submission: reset status to none, clear submitted media, notify user.
 * The user can re-apply. Idempotent.
 */
export async function rejectKyc(userId: string): Promise<'done' | 'already' | 'not_found'> {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return 'not_found'
  if (user.kycStatus === 'rejected') return 'already'

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        kycStatus: 'rejected',
        kycLevel: 'none',
        kycDocUrl: null,
        kycSelfieUrl: null,
        kycSelfieVideoUrl: null,
      },
    })
    await tx.notification.create({
      data: {
        userId,
        title: 'KYC Rejected',
        message:
          'Your KYC verification was rejected. This may be due to an unclear photo, ID issue, or face mismatch. Please re-apply with a clear, well-lit capture. Contact support if you need help.',
        type: 'warning',
      },
    })
  })
  return 'done'
}
