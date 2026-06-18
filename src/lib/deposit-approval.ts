import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'habesha-exchange-dev-secret-change-me'
const APPROVAL_TTL = '7d' // approval links valid for 7 days

export type ApprovalAction = 'approve' | 'reject'

interface ApprovalPayload {
  depositId: string
  action: ApprovalAction
}

/** Sign a single-use approval/reject token for a deposit. */
export function signApprovalToken(depositId: string, action: ApprovalAction): string {
  return jwt.sign({ depositId, action } as ApprovalPayload, SECRET, { expiresIn: APPROVAL_TTL })
}

/** Verify an approval token. Returns the payload or null if invalid/expired. */
export function verifyApprovalToken(token: string, expectedAction: ApprovalAction): string | null {
  try {
    const payload = jwt.verify(token, SECRET) as ApprovalPayload
    if (payload.action !== expectedAction) return null
    return payload.depositId
  } catch {
    return null
  }
}

/**
 * Build the public base URL for email links.
 * Priority: NEXT_PUBLIC_BASE_URL env → x-forwarded-proto + host headers → localhost:3000
 */
export function getBaseUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_BASE_URL
  if (env) return env.replace(/\/$/, '')
  const forwardedProto = req.headers.get('x-forwarded-proto')
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  if (host) {
    const proto = forwardedProto || (host.startsWith('localhost') ? 'http' : 'https')
    return `${proto}://${host}`
  }
  return 'http://localhost:3000'
}
