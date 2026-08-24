import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, setSessionCookie } from '@/lib/auth'
import { generateUid, ensureBalances } from '@/lib/uid'
import { TOKEN_SYMBOLS } from '@/lib/tokens'
import { sendPushNotification } from '@/lib/push'

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
    // Check username — retry once on transient DB errors (Vercel serverless)
    let existingUsername = null
    try {
      existingUsername = await db.user.findUnique({ where: { username: uname }, select: { id: true } })
    } catch (firstErr) {
      // Connection pool error — retry once after a short delay
      try {
        await new Promise((r) => setTimeout(r, 500))
        existingUsername = await db.user.findUnique({ where: { username: uname }, select: { id: true } })
      } catch {
        // If retry also fails, proceed anyway — the unique constraint will catch duplicates
      }
    }
    if (existingUsername) {
      return NextResponse.json({ error: `Username "@${uname}" is already taken. Please choose another.` }, { status: 409 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    // Check email — same retry pattern
    let existing = null
    try {
      existing = await db.user.findUnique({ where: { email: normalizedEmail } })
    } catch {
      try {
        await new Promise((r) => setTimeout(r, 500))
        existing = await db.user.findUnique({ where: { email: normalizedEmail } })
      } catch {
        // proceed anyway
      }
    }
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

    // Send all existing broadcasts to the new user as notifications + push.
    // This ensures new users immediately see any pending announcements.
    // ONLY non-expired broadcasts are sent (null expiresAt = never expires).
    const broadcasts = await db.broadcast.findMany({
      where: {
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10, // most recent 10 non-expired broadcasts
    })
    for (const bc of broadcasts) {
      await db.notification.create({
        data: {
          userId: user.id,
          title: bc.title,
          message: bc.message,
          type: 'info',
        },
      })
    }
    // Send a push notification for the most recent broadcast (if any).
    if (broadcasts.length > 0) {
      const latest = broadcasts[0]
      await sendPushNotification(user.id, {
        title: latest.title,
        body: latest.message,
        url: '/?open_broadcasts=1',
      }).catch(() => {})
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
