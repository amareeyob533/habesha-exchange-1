import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, setSessionCookie } from '@/lib/auth'
import { generateUid, ensureBalances } from '@/lib/uid'
import { TOKEN_SYMBOLS, HABESHA_PRICE, HABESHA_AIRDROP_USD } from '@/lib/tokens'

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }
    const normalizedEmail = email.toLowerCase().trim()
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const uid = await generateUid()
    const user = await db.user.create({
      data: {
        uid,
        email: normalizedEmail,
        name: name?.trim() || normalizedEmail.split('@')[0],
        passwordHash,
        provider: 'credentials',
      },
    })

    // Initialize balances for all tokens
    await ensureBalances(user.id, TOKEN_SYMBOLS)

    // Airdrop free Habesha tokens ($299.9 worth at fixed price)
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

    const token = await setSessionCookie({ userId: user.id, uid: user.uid, email: user.email })

    return NextResponse.json({
      id: user.id,
      uid: user.uid,
      email: user.email,
      name: user.name,
      provider: user.provider,
      kycStatus: user.kycStatus,
      kycLevel: user.kycLevel,
      token,
    })
  } catch (err: any) {
    console.error('Signup error:', err)
    return NextResponse.json({ error: err?.message || 'Signup failed' }, { status: 500 })
  }
}
