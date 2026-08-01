import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'
import { TOKENS } from '@/lib/tokens'

/**
 * GET /api/admin/users/detail?userId=...
 *
 * Admin-only. Returns the full user record (avatar, KYC info, balances, recent
 * transactions, KYC applications + their documents) so the admin panel can
 * render a detailed profile drawer.
 *
 * Returned shape:
 *   {
 *     user: {
 *       id, uid, username, email, name, avatarUrl, isBlocked, blockedReason,
 *       provider, country, phone, createdAt,
 *       // KYC summary
 *       kycStatus, kycSubmittedAt, kycApprovedAt, kycFullName, kycCity,
 *       kycIdType, kycRejectReason,
 *       // passwordHash present so the admin can see it's bcrypt-hashed
 *       // (we never expose plaintext — passwords are one-way hashed).
 *       hasPassword,
 *     },
 *     balances: [{ symbol, name, amount, usdValue, price, color, icon }],
 *     totalUsd,
 *     transactions: [...],
 *     kycApplications: [{
 *       id, fullName, city, idType, status, rejectReason, submittedAt, reviewedAt,
 *       documents: [{ id, side, fileName, mimeType, size, deleteAfter }]
 *     }]
 *   }
 */
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const u = await db.user.findUnique({
      where: { id: userId },
      include: {
        balances: true,
        transactions: { orderBy: { createdAt: 'desc' }, take: 20 },
        kycApplications: {
          orderBy: { submittedAt: 'desc' },
          include: {
            documents: {
              select: { id: true, side: true, fileName: true, mimeType: true, size: true, deleteAfter: true },
              orderBy: { side: 'asc' },
            },
          },
        },
      },
    })
    if (!u) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const balances = TOKENS.map((t) => {
      const bal = u.balances.find((b) => b.token === t.symbol)
      const amount = bal?.amount ?? 0
      return { symbol: t.symbol, name: t.name, amount, usdValue: amount * t.price, price: t.price, color: t.color, icon: t.icon }
    })
    const totalUsd = balances.reduce((s, b) => s + b.usdValue, 0)

    return NextResponse.json({
      user: {
        id: u.id,
        uid: u.uid,
        username: u.username,
        email: u.email,
        name: u.name,
        avatarUrl: u.avatarUrl,
        isBlocked: u.isBlocked,
        blockedReason: u.blockedReason,
        provider: u.provider,
        country: u.country,
        phone: u.phone,
        createdAt: u.createdAt,
        // KYC summary fields (denormalized onto the User row)
        kycStatus: u.kycStatus,
        kycSubmittedAt: u.kycSubmittedAt,
        kycApprovedAt: u.kycApprovedAt,
        kycFullName: u.kycFullName,
        kycCity: u.kycCity,
        kycIdType: u.kycIdType,
        kycRejectReason: u.kycRejectReason,
        // Password: we store bcrypt hashes (never plaintext). We surface a
        // boolean so the admin can see whether a password is set, but we do
        // NOT send the hash itself over the wire.
        hasPassword: !!u.passwordHash,
      },
      balances,
      totalUsd,
      transactions: u.transactions,
      kycApplications: u.kycApplications,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
