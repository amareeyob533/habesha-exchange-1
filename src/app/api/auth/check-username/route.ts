import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/** GET /api/auth/check-username?username=foo → { available: boolean, username } */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('username') || ''
  const username = raw.toLowerCase().trim().replace(/\s+/g, '')
  if (!username) return NextResponse.json({ available: false, reason: 'required' })
  if (username.length < 3) return NextResponse.json({ available: false, reason: 'too-short' })
  if (!/^[a-z0-9_.]+$/.test(username)) return NextResponse.json({ available: false, reason: 'invalid' })
  const existing = await db.user.findUnique({ where: { username }, select: { id: true } })
  return NextResponse.json({ available: !existing, username })
}
