import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/deposit-actions'

/** GET /api/buy/proof?id=<id> — serve a payment screenshot (owner or admin only) */
export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const proof = await db.paymentProof.findUnique({ where: { id } })
    if (!proof) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isOwner = proof.userId === session.id
    const me = await db.user.findUnique({ where: { id: session.id }, select: { email: true } })
    const isAdmin = isAdminEmail(me?.email)
    if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (proof.data.startsWith('http://') || proof.data.startsWith('https://')) {
      return NextResponse.redirect(proof.data)
    }
    const match = proof.data.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return NextResponse.json({ error: 'Invalid data' }, { status: 500 })
    const buffer = Buffer.from(match[2], 'base64')
    return new NextResponse(buffer as any, {
      headers: { 'Content-Type': match[1], 'Cache-Control': 'private, max-age=3600' },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
