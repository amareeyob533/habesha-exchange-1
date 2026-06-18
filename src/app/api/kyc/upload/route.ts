import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { requireAuth } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 400 })
    }
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const allowed = ['jpg', 'jpeg', 'png', 'webp']
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: 'Only JPG, PNG, WEBP allowed' }, { status: 400 })
    }
    const fileName = `${randomUUID()}.${ext}`
    const dir = path.join(process.cwd(), 'public', 'uploads', 'kyc')
    await mkdir(dir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(dir, fileName), buffer)
    const url = `/uploads/kyc/${fileName}`
    return NextResponse.json({ url })
  } catch (err: any) {
    console.error('upload error:', err)
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 })
  }
}
