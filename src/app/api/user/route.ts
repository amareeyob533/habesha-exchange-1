import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'

export async function PUT(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!
    const { name, country, phone } = await req.json()
    await db.user.update({
      where: { id: user.id },
      data: {
        name: name?.trim() || user.name,
        country: country?.trim() || user.country,
        phone: phone?.trim() || user.phone,
      },
    })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
