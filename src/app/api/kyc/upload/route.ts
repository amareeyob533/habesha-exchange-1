import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { requireAuth } from '@/lib/api'

const MAX_SIZE = 25 * 1024 * 1024 // 25MB (to accommodate short video clips)
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp']
const VIDEO_EXTS = ['webm', 'mp4', 'mov']

export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response!

    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 25MB)' }, { status: 400 })
    }
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!IMAGE_EXTS.includes(ext) && !VIDEO_EXTS.includes(ext)) {
      return NextResponse.json(
        { error: 'Only JPG, PNG, WEBP images or WEBM/MP4 videos allowed' },
        { status: 400 },
      )
    }
    const fileName = `${randomUUID()}.${ext}`
    const dir = path.join(process.cwd(), 'public', 'uploads', 'kyc')
    await mkdir(dir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(dir, fileName), buffer)
    const url = `/uploads/kyc/${fileName}`
    const kind = VIDEO_EXTS.includes(ext) ? 'video' : 'image'
    return NextResponse.json({ url, kind })
  } catch (err: any) {
    console.error('upload error:', err)
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 })
  }
}
