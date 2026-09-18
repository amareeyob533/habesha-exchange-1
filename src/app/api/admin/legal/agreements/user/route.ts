import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'
import { getTosFullText, getTosVersion } from '@/lib/tos'

/**
 * GET /api/admin/legal/agreements/user?userId=...&format=txt|json
 *
 * Admin-only. Returns the full Terms-of-Service agreement record(s) for a
 * single user — the legal proof that THIS specific user accepted the ToS +
 * Disclaimer. Includes the exact ToS text they agreed to (by version) so
 * you can produce it in a legal setting.
 *
 * format=txt  → a plain-text legal certificate (printable / attachable)
 * format=json → structured JSON (default)
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
    const format = req.nextUrl.searchParams.get('format') || 'json'

    const agreements = await db.tosAgreement.findMany({
      where: { userId },
      orderBy: { agreedAt: 'desc' },
    })

    if (agreements.length === 0) {
      return NextResponse.json({ error: 'No ToS agreement found for this user', agreements: [] }, { status: 404 })
    }

    if (format === 'json') {
      // Include the full ToS text + metadata so the on-screen certificate
      // modal can render the complete document without an extra fetch.
      const a = agreements[0]
      const tosText = getTosFullText(a.tosVersion)
      const tosMeta = getTosVersion(a.tosVersion)
      // Also fetch the current User's KYC data — this ensures the certificate
      // shows the latest national ID info even if the TosAgreement snapshot
      // was null (e.g. user hadn't completed KYC at the time of agreement).
      const currentUser = await db.user.findUnique({
        where: { id: userId },
        select: { kycFullName: true, kycIdType: true, kycCity: true, kycStatus: true, kycApprovedAt: true },
      })
      return NextResponse.json({
        agreements,
        count: agreements.length,
        // The full canonical ToS text (as agreed by the user)
        tosFullText: tosText,
        tosMeta: tosMeta ? {
          version: tosMeta.version,
          effectiveDate: tosMeta.effectiveDate,
          title: tosMeta.title,
          sections: tosMeta.sections,
        } : null,
        // Current KYC / national ID data from the User table (latest).
        // The TosAgreement row also has a snapshot (a.kycFullName etc.)
        // but that may be null if the user hadn't done KYC yet.
        currentKyc: currentUser ? {
          kycFullName: currentUser.kycFullName,
          kycIdType: currentUser.kycIdType,
          kycCity: currentUser.kycCity,
          kycStatus: currentUser.kycStatus,
          kycApprovedAt: currentUser.kycApprovedAt,
        } : null,
      })
    }

    // format === 'txt' — produce a printable legal certificate
    const a = agreements[0] // most recent agreement
    const tosText = getTosFullText(a.tosVersion)
    const tosMeta = getTosVersion(a.tosVersion)

    const lines: string[] = []
    lines.push('═'.repeat(72))
    lines.push('   HABESHA EXCHANGE — TERMS OF SERVICE ACCEPTANCE CERTIFICATE')
    lines.push('═'.repeat(72))
    lines.push('')
    lines.push('This document certifies that the following user accepted the')
    lines.push('Terms of Service and Disclaimer of Habesha Exchange.')
    lines.push('')
    lines.push('─'.repeat(72))
    lines.push('ACCOUNT DETAILS (at time of agreement)')
    lines.push('─'.repeat(72))
    lines.push(`  User ID:         ${a.userId}`)
    lines.push(`  UID:             ${a.accountUid}`)
    lines.push(`  Email:           ${a.accountEmail}`)
    lines.push(`  Name:            ${a.accountName || '(not provided)'}`)
    lines.push('')
    // National ID / KYC section
    const ID_LABELS: Record<string, string> = {
      driver_license: "Driver's License",
      national_id: 'National ID',
      passport: 'Passport',
    }
    if (a.kycFullName || a.kycIdType || a.kycCity) {
      lines.push('─'.repeat(72))
      lines.push('NATIONAL ID / IDENTITY VERIFICATION')
      lines.push('─'.repeat(72))
      lines.push(`  Full Name (on ID): ${a.kycFullName || '(not provided)'}`)
      lines.push(`  ID Type:           ${ID_LABELS[a.kycIdType || ''] || a.kycIdType || '—'}`)
      lines.push(`  City:              ${a.kycCity || '—'}`)
      lines.push(`  Verification:      ${a.kycStatus || 'none'}`)
      lines.push('')
    } else {
      lines.push('─'.repeat(72))
      lines.push('NATIONAL ID / IDENTITY VERIFICATION')
      lines.push('─'.repeat(72))
      lines.push('  (User has not submitted KYC / national ID verification.)')
      lines.push('')
    }
    lines.push('─'.repeat(72))
    lines.push('AGREEMENT DETAILS')
    lines.push('─'.repeat(72))
    lines.push(`  ToS Version:     ${a.tosVersion}`)
    lines.push(`  Effective Date:  ${tosMeta?.effectiveDate || '(unknown)'}`)
    lines.push(`  Agreed At (UTC): ${a.agreedAt.toISOString()}`)
    lines.push(`  IP Address:      ${a.ipAddress || '(not captured)'}`)
    lines.push(`  User Agent:      ${a.userAgent || '(not captured)'}`)
    lines.push(`  Device Print:    ${a.visitorId || '(not captured)'}`)
    lines.push(`  ToS Text SHA-256:${a.tosTextHash || '(not captured)'}`)
    lines.push('')
    lines.push('─'.repeat(72))
    lines.push('EXACT TERMS OF SERVICE TEXT (as agreed by the user)')
    lines.push('─'.repeat(72))
    lines.push('')
    lines.push(tosText)
    lines.push('')
    lines.push('═'.repeat(72))
    lines.push('END OF CERTIFICATE')
    lines.push('═'.repeat(72))

    const text = lines.join('\n')
    const dateStr = new Date().toISOString().slice(0, 10)
    const filename = `tos-certificate-${a.accountUid}-${dateStr}.txt`

    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
