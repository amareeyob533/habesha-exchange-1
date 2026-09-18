import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'

/**
 * GET /api/admin/legal/agreements/csv
 *
 * Admin-only. Exports ALL Terms-of-Service agreement records as a CSV file
 * (Content-Type: text/csv, Content-Disposition: attachment). This is the
 * legal-proof export — open it in Excel/Google Sheets or attach to a legal
 * filing to prove every user accepted the ToS + Disclaimer.
 *
 * Columns: Agreement ID, User ID, UID, Email, Name, ToS Version, Agreed At (UTC),
 * IP Address, User Agent, Device Fingerprint, ToS Text SHA-256.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const agreements = await db.tosAgreement.findMany({
      orderBy: { agreedAt: 'desc' },
      select: {
        id: true,
        userId: true,
        accountUid: true,
        accountEmail: true,
        accountName: true,
        tosVersion: true,
        agreedAt: true,
        ipAddress: true,
        userAgent: true,
        visitorId: true,
        tosTextHash: true,
      },
    })

    // Build CSV — RFC 4180 compliant (quote fields containing commas/quotes/newlines).
    const headers = [
      'Agreement ID',
      'User ID',
      'UID',
      'Email',
      'Name',
      'ToS Version',
      'Agreed At (UTC)',
      'IP Address',
      'User Agent',
      'Device Fingerprint',
      'ToS Text SHA-256',
    ]

    const escape = (val: string | null | undefined): string => {
      const s = val ?? ''
      // Quote if it contains comma, quote, newline, or leading/trailing space.
      if (/[",\n\r]/.test(s) || s !== s.trim()) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }

    const rows = agreements.map((a) =>
      [
        a.id,
        a.userId,
        a.accountUid,
        a.accountEmail,
        a.accountName,
        a.tosVersion,
        a.agreedAt.toISOString(),
        a.ipAddress,
        a.userAgent,
        a.visitorId,
        a.tosTextHash,
      ]
        .map(escape)
        .join(','),
    )

    const csv = [headers.join(','), ...rows].join('\n')

    const dateStr = new Date().toISOString().slice(0, 10)
    const filename = `habesha-tos-agreements-${dateStr}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
