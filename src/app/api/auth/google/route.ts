import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSessionCookie } from '@/lib/auth'
import { generateUid, ensureBalances } from '@/lib/uid'
import { TOKEN_SYMBOLS, HABESHA_PRICE, HABESHA_AIRDROP_USD } from '@/lib/tokens'

/**
 * Simulated Google sign-in.
 *
 * In production this would be handled by NextAuth's Google provider with real
 * OAuth credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET). In this sandbox
 * we accept the Google profile payload from the client and create/fetch the
 * account so the full flow works end-to-end.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, name, avatarUrl } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Google account email is required' }, { status: 400 })
    }
    const normalizedEmail = email.toLowerCase().trim()

    let user = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (!user) {
      const uid = await generateUid()
      user = await db.user.create({
        data: {
          uid,
          email: normalizedEmail,
          name: name?.trim() || normalizedEmail.split('@')[0],
          avatarUrl: avatarUrl || null,
          provider: 'google',
        },
      })
      await ensureBalances(user.id, TOKEN_SYMBOLS)
      const airdropAmount = HABESHA_AIRDROP_USD / HABESHA_PRICE
      await db.balance.update({
        where: { userId_token: { userId: user.id, token: 'HABESHA' } },
        data: { amount: airdropAmount },
      })
      await db.transaction.create({
        data: {
          userId: user.id,
          type: 'airdrop',
          token: 'HABESHA',
          amount: airdropAmount,
          status: 'completed',
          note: `Welcome bonus — $${HABESHA_AIRDROP_USD} worth of Habesha Token`,
        },
      })
      await db.notification.create({
        data: {
          userId: user.id,
          title: 'Welcome to Habesha Exchange! 🎉',
          message: `You received ${airdropAmount.toFixed(4)} HABESHA ($${HABESHA_AIRDROP_USD} welcome bonus). Complete KYC to enable deposits & withdrawals.`,
          type: 'success',
        },
      })
    } else if (user.provider === 'credentials' && !user.avatarUrl && avatarUrl) {
      await db.user.update({ where: { id: user.id }, data: { avatarUrl } })
    }

    await setSessionCookie({ userId: user.id, uid: user.uid, email: user.email })

    return NextResponse.json({
      id: user.id,
      uid: user.uid,
      email: user.email,
      name: user.name,
      provider: user.provider,
      kycStatus: user.kycStatus,
      kycLevel: user.kycLevel,
    })
  } catch (err: any) {
    console.error('Google auth error:', err)
    return NextResponse.json({ error: err?.message || 'Google sign-in failed' }, { status: 500 })
  }
}
