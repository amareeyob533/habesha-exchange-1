import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, setSessionCookie } from '@/lib/auth'
import { generateUid, ensureBalances } from '@/lib/uid'
import { TOKEN_SYMBOLS, HABESHA_PRICE, HABESHA_AIRDROP_USD } from '@/lib/tokens'

function normalizeUsername(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, '')
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, username } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }
    // Username required + validated + unique
    const uname = normalizeUsername(username || '')
    if (!uname) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }
    if (uname.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 })
    }
    if (!/^[a-z0-9_.]+$/.test(uname)) {
      return NextResponse.json({ error: 'Username can only contain letters, numbers, underscores and dots' }, { status: 400 })
    }
    const existingUsername = await db.user.findUnique({ where: { username: uname }, select: { id: true } })
    if (existingUsername) {
      return NextResponse.json({ error: `Username "@${uname}" is already taken. Please choose another.` }, { status: 409 })
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
        username: uname,
        name: name?.trim() || uname,
        passwordHash,
        provider: 'credentials',
      },
    })

    // Initialize balances for all tokens
    await ensureBalances(user.id, TOKEN_SYMBOLS)

    // Airdrop free Habesha tokens ($15 worth at fixed price)
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
        message: `You received ${airdropAmount.toFixed(4)} HABESHA ($${HABESHA_AIRDROP_USD} welcome bonus). Start trading now!`,
        type: 'success',
      },
    })

    // Notify admin that a new user joined
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'amareeyob533@gmail.com'
    const admin = await db.user.findUnique({ where: { email: adminEmail }, select: { id: true } })
    if (admin) {
      await db.notification.create({
        data: {
          userId: admin.id,
          title: 'New User Joined 🎉',
          message: `${user.name || user.username || user.email} has joined Habesha Exchange. UID: ${user.uid}`,
          type: 'info',
        },
      })
    }

    const token = await setSessionCookie({ userId: user.id, uid: user.uid, email: user.email })

    return NextResponse.json({
      id: user.id,
      uid: user.uid,
      email: user.email,
      username: user.username,
      name: user.name,
      provider: user.provider,
      token,
    })
  } catch (err: any) {
    console.error('Signup error:', err)
    return NextResponse.json({ error: err?.message || 'Signup failed' }, { status: 500 })
  }
}
