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
    const side = (formData.get('side') as string) || 'front'
    if (!file || !(file instanceof File)) return NextResponse.json({ error: 'No file' }, { status: 400 })
    if (side !== 'front' && side !== 'back') return NextResponse.json({ error: 'Invalid side' }, { status: 400 })
    const mimeType = file.type || 'application/octet-stream'
    if (!mimeType.startsWith('image/')) return NextResponse.json({ error: 'Only image files' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Max 8 MB' }, { status: 400 })
    const buffer = Buffer.from(await file.arrayBuffer())
    const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`
    let draftApp = await db.kycApplication.findFirst({ where: { userId: user.id, status: 'draft' }, orderBy: { submittedAt: 'desc' } })
    if (!draftApp) { try { draftApp = await db.kycApplication.create({ data: { userId: user.id, fullName: '(draft)', city: '(draft)', idType: 'national_id', status: 'draft' } }) } catch { await new Promise(r => setTimeout(r, 500)); draftApp = await db.kycApplication.create({ data: { userId: user.id, fullName: '(draft)', city: '(draft)', idType: 'national_id', status: 'draft' } }) } }
    try { await db.kycDocument.deleteMany({ where: { applicationId: draftApp.id, userId: user.id, side } }) } catch {}
    let doc = null
    try { doc = await db.kycDocument.create({ data: { applicationId: draftApp.id, userId: user.id, side, mimeType, fileName: file.name || 'id-document', data: dataUrl, size: file.size } }) }
    catch { await new Promise(r => setTimeout(r, 500)); doc = await db.kycDocument.create({ data: { applicationId: draftApp.id, userId: user.id, side, mimeType, fileName: file.name || 'id-document', data: dataUrl, size: file.size } }) }
    return NextResponse.json({ id: doc!.id, url: dataUrl, side, fileName: doc!.fileName, size: doc!.size })
  } catch (err: any) { return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 }) }
}
