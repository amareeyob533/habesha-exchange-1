// Lightweight API client helpers for the frontend.
// Uses a Bearer token (stored in localStorage) so auth works inside
// cross-origin iframes / preview panels where sameSite cookies are blocked.

const TOKEN_KEY = 'habesha_token'

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setStoredToken(token: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // ignore
  }
}

export function clearStoredToken() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}

export async function apiFetch<T = any>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const token = getStoredToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  let res: Response
  try {
    res = await fetch(url, { ...options, headers })
  } catch (networkErr) {
    // Server unreachable (dev server down, network issue, etc.)
    // Throw a tagged error so callers can distinguish it from auth failures.
    throw new Error('NETWORK_ERROR: server unreachable')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // If unauthorized, clear any stale token.
    if (res.status === 401) clearStoredToken()
    throw new Error((data as any)?.error || `Request failed (${res.status})`)
  }
  return data as T
}

export async function uploadFile(url: string, file: File): Promise<{ url: string }> {
  const form = new FormData()
  form.append('file', file)
  const token = getStoredToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(url, { method: 'POST', body: form, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as any)?.error || 'Upload failed')
  return data as { url: string }
}
