import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSessionCookie } from '@/lib/auth'
import { generateUid, ensureBalances } from '@/lib/uid'
import { TOKEN_SYMBOLS } from '@/lib/tokens'

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
    } else if (user.provider === 'credentials' && !user.avatarUrl && avatarUrl) {
      await db.user.update({ where: { id: user.id }, data: { avatarUrl } })
    }

    const token = await setSessionCookie({ userId: user.id, uid: user.uid, email: user.email })

    return NextResponse.json({
      id: user.id,
      uid: user.uid,
      email: user.email,
      name: user.name,
      provider: user.provider,
      token,
    })
  } catch (err: any) {
    console.error('Google auth error:', err)
    return NextResponse.json({ error: err?.message || 'Google sign-in failed' }, { status: 500 })
  }
}
