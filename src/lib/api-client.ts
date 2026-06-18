// Lightweight API client helpers for the frontend.

export async function apiFetch<T = any>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as any)?.error || `Request failed (${res.status})`)
  }
  return data as T
}

export async function uploadFile(url: string, file: File): Promise<{ url: string }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(url, { method: 'POST', body: form })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as any)?.error || 'Upload failed')
  return data as { url: string }
}
