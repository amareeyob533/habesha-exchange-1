import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api'

const MAX_BYTES = 8 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    const formData = await req.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    const mimeType = file.type || 'application/octet-stream'
    if (!mimeType.startsWith('image/')) return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large. Max 8 MB' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`

    let proof = null
    try {
      proof = await db.paymentProof.create({ data: { userId: user.id, mimeType, fileName: file.name || 'screenshot', data: dataUrl, size: file.size } })
    } catch {
      await new Promise((r) => setTimeout(r, 500))
      proof = await db.paymentProof.create({ data: { userId: user.id, mimeType, fileName: file.name || 'screenshot', data: dataUrl, size: file.size } })
    }
    return NextResponse.json({ url: dataUrl, id: proof!.id, fileName: proof!.fileName, size: proof!.size })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 })
  }
}
