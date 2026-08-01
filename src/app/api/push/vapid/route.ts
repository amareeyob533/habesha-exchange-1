import { NextResponse } from 'next/server'
import { getVapidPublicKey } from '@/lib/push'

/** GET /api/push/vapid — returns the VAPID public key for the browser to subscribe. */
export async function GET() {
  return NextResponse.json({ publicKey: getVapidPublicKey() })
}
