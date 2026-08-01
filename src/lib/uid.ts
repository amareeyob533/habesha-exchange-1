import { db } from '@/lib/db'

/** Generate a unique 6-digit UID, retrying on collision. */
export async function generateUid(): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const uid = String(Math.floor(100000 + Math.random() * 900000))
    const exists = await db.user.findUnique({ where: { uid }, select: { id: true } })
    if (!exists) return uid
  }
  // Extremely unlikely fallback
  return String(Date.now()).slice(-6)
}

/** Ensure a user has balance rows for every supported token. */
export async function ensureBalances(userId: string, tokens: string[]) {
  for (const token of tokens) {
    const existing = await db.balance.findUnique({
      where: { userId_token: { userId, token } },
    })
    if (!existing) {
      await db.balance.create({ data: { userId, token, amount: 0 } })
    }
  }
}
