import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { comparePassword, setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    const normalizedEmail = email.toLowerCase().trim()
    const user = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    const ok = await comparePassword(password, user.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
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
    console.error('Login error:', err)
    return NextResponse.json({ error: err?.message || 'Login failed' }, { status: 500 })
  }
}
