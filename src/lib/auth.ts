import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies, headers } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'habesha-exchange-dev-secret-change-me'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
export const COOKIE_NAME = 'habesha_session'

export interface SessionPayload {
  userId: string
  uid: string
  email: string
}

export function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any })
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Read the current session.
 *
 * Checks the `Authorization: Bearer <token>` header FIRST (this works inside
 * cross-origin iframes / preview panels where sameSite cookies are blocked),
 * then falls back to the httpOnly session cookie for same-origin top-level use.
 */
export async function getSession(): Promise<SessionPayload | null> {
  // 1. Bearer token from Authorization header
  try {
    const headerStore = await headers()
    const authHeader = headerStore.get('authorization') || headerStore.get('Authorization')
    if (authHeader?.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7).trim()
      const payload = verifyToken(token)
      if (payload) return payload
    }
  } catch {
    // headers() may throw in some contexts; fall through to cookie
  }

  // 2. httpOnly cookie fallback
  try {
    const store = await cookies()
    const token = store.get(COOKIE_NAME)?.value
    if (!token) return null
    return verifyToken(token)
  } catch {
    return null
  }
}

/**
 * Establish a session: sets the httpOnly cookie (for same-origin) AND returns
 * the raw token so the client can also persist it in localStorage and send it
 * as a Bearer header (for iframe / cross-origin contexts).
 */
export async function setSessionCookie(payload: SessionPayload): Promise<string> {
  const token = signToken(payload)
  try {
    const store = await cookies()
    store.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
  } catch {
    // setting cookie may fail in some contexts; token is still returned
  }
  return token
}

export async function clearSessionCookie() {
  try {
    const store = await cookies()
    store.delete(COOKIE_NAME)
  } catch {
    // ignore
  }
}

/** Get the full user record for the current session, or null. */
export async function getCurrentUser() {
  const session = await getSession()
  if (!session) return null
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true, uid: true, email: true, username: true, name: true,
      passwordHash: true, provider: true, avatarUrl: true,
      isBlocked: true, blockedReason: true,
      kycStatus: true, kycSubmittedAt: true, kycApprovedAt: true,
      kycFullName: true, kycCity: true, kycIdType: true, kycRejectReason: true,
      country: true, phone: true, createdAt: true, updatedAt: true,
    },
  })
  return user
}
