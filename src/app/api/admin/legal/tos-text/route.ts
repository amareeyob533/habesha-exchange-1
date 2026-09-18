import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api'
import { isAdminEmail } from '@/lib/deposit-actions'
import { TOS_VERSIONS, getTosFullText, getCurrentTos } from '@/lib/tos'

/**
 * GET /api/admin/legal/tos-text?version=v1.0-2026-09-17
 *
 * Admin-only. Returns the canonical Terms-of-Service text for a given
 * version (defaults to the current version) as a downloadable .txt file.
 * This is the exact text users agreed to — useful for legal filings.
 *
 * Without ?version=, returns the current ToS as plain text.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const version = req.nextUrl.searchParams.get('version') || ''
    const tosVersion = version ? TOS_VERSIONS.find((v) => v.version === version) : getCurrentTos()
    if (!tosVersion) {
      return NextResponse.json({ error: 'Unknown ToS version', available: TOS_VERSIONS.map((v) => v.version) }, { status: 404 })
    }

    const text = getTosFullText(tosVersion.version)
    const filename = `habesha-tos-${tosVersion.version}.txt`

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
