import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/** GET /api/auth/check-username?username=foo → { available: boolean, username } */
export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get('username') || ''
    const username = raw.toLowerCase().trim().replace(/\s+/g, '')
    if (!username) return NextResponse.json({ available: false, reason: 'required' })
    if (username.length < 3) return NextResponse.json({ available: false, reason: 'too-short' })
    if (!/^[a-z0-9_.]+$/.test(username)) return NextResponse.json({ available: false, reason: 'invalid' })

    // Check if username is taken — resilient to DB errors (return available on failure)
    let existing = null
    try {
      existing = await db.user.findUnique({ where: { username }, select: { id: true } })
    } catch {
      // DB error (Vercel cold start, connection issue) — assume available
      // The signup route will do a final check anyway.
      return NextResponse.json({ available: true, username })
    }
    return NextResponse.json({ available: !existing, username })
  } catch {
    // Any unexpected error — return available so signup isn't blocked
    return NextResponse.json({ available: true })
  }
}
