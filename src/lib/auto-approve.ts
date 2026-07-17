import { db } from '@/lib/db'

// NOTE: KYC is NO LONGER auto-approved. Both Normal and High KYC require
// manual admin approval via the in-app Admin panel (Admin · Approvals → KYC).
// The admin reviews the user's live camera video (and ID card photo for High KYC)
// before approving or rejecting. See src/lib/kyc-actions.ts and src/app/api/admin/kyc/*.

/**
 * Process any pending items that still need auto-handling.
 * (Currently nothing — deposits, withdrawals, and KYC all require manual admin approval.)
 * Kept as a no-op hook called on session/me fetch for future extensibility.
 */
export async function processAutoApprovals(_userId: string) {
  // Intentionally empty. All approvals are manual via the admin panel.
  await Promise.resolve()
}
