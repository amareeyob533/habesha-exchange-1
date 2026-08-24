import { NextResponse } from 'next/server'
import { getVapidPublicKey } from '@/lib/push'

/** GET /api/push/vapid — returns the VAPID public key for the browser to subscribe. */
export async function GET() {
  const key = getVapidPublicKey()
  if (!key) {
    return NextResponse.json({ publicKey: '', error: 'VAPID keys not configured' })
  }
  return NextResponse.json({ publicKey: key })
}
