import { db } from '@/lib/db'

// Users without approved KYC can deposit at most this much (USD value) total.
export const KYC_DEPOSIT_LIMIT_USD = 500

// Approved KYC documents are kept for this long before auto-deletion.
export const KYC_RETENTION_DAYS = 2

/**
 * Lazily delete KYC documents whose retention window has expired.
 * Called on every KYC-related API request so expired documents get cleaned up
 * without needing a separate cron job. Safe to call repeatedly.
 */
export async function cleanupExpiredKyc() {
  try {
    const now = new Date()
    // Delete documents past their deleteAfter timestamp.
    const expired = await db.kycDocument.findMany({
      where: { deleteAfter: { lt: now } },
      select: { id: true, applicationId: true },
    })
    if (expired.length === 0) return 0
    // Delete the documents (cascades nothing; the application record stays).
    await db.kycDocument.deleteMany({
      where: { id: { in: expired.map((e) => e.id) } },
    })
    return expired.length
  } catch {
    // best-effort; don't fail the request over cleanup
    return 0
  }
}

/**
 * Returns true if the user has approved KYC (unlimited deposits/withdrawals).
 */
export function hasApprovedKyc(user: { kycStatus?: string | null }): boolean {
  return user?.kycStatus === 'approved'
}

/**
 * Compute the user's total lifetime deposit value (USD) across all approved
 * deposits. Used to enforce the 500 USD cap for non-KYC users.
 *
 * NOTE: For simplicity we treat 1 USDT = 1 USDC = 1 USD, and BTC/TON are
 * converted using the static fallback prices in tokens.ts. This is a
 * conservative estimate for the limit check — actual crediting uses live
 * prices.
 */
export async function getTotalDepositedUsd(userId: string): Promise<number> {
  const deposits = await db.deposit.findMany({
    where: { userId, status: 'approved' },
    select: { token: true, amount: true },
  })
  // Simple USD conversion using token symbols. USDT/USDC = 1.
  // BTC and TON use approximate static prices.
  const PRICES: Record<string, number> = {
    USDT: 1,
    USDC: 1,
    BTC: 97500,
    TON: 5.42,
  }
  return deposits.reduce((sum, d) => {
    const price = PRICES[d.token] ?? 0
    return sum + d.amount * price
  }, 0)
}
