'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiFetch, getStoredToken } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'
import { Scale, Download, FileText, Loader2, Search, ShieldCheck, Calendar, Globe, Fingerprint, Hash } from 'lucide-react'

interface TosAgreementRow {
  id: string
  userId: string
  accountEmail: string
  accountUid: string
  accountName: string | null
  tosVersion: string
  agreedAt: string
  ipAddress: string | null
  userAgent: string | null
  visitorId: string | null
  tosTextHash: string | null
}

interface SummaryRow {
  tosVersion: string
  count: number
}

/**
 * Admin → Legal Agreements page.
 *
 * Shows every Terms-of-Service acceptance record (the immutable TosAgreement
 * audit log). The admin can:
 *   - Search by email / UID / name
 *   - Download ALL agreements as a CSV file (legal-proof export)
 *   - Download a single user's certificate as a .txt (with the exact ToS text)
 *   - Download the current canonical ToS text
 *
 * This is the system that lets the admin defend themselves legally — every
 * user who signed up accepted the ToS + Disclaimer, and we have a
 * timestamped, IP-stamped, hash-verified record of each acceptance.
 */
export function LegalAdmin() {
  const { toast } = useToast()
  const [agreements, setAgreements] = useState<TosAgreementRow[]>([])
  const [summary, setSummary] = useState<SummaryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    if (!getStoredToken()) return
    setLoading(true)
    try {
      const q = search ? `&search=${encodeURIComponent(search.trim())}` : ''
      const data = await apiFetch<{ agreements: TosAgreementRow[]; count: number; summary: SummaryRow[] }>(
        `/api/admin/legal/agreements?limit=200${q}`,
      )
      setAgreements(data.agreements)
      setSummary(data.summary || [])
    } catch (err: any) {
      const msg = String(err?.message || '')
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) return
      toast({ variant: 'destructive', title: 'Failed to load', description: err.message })
    } finally {
      setLoading(false)
    }
  }, [search, toast])

  useEffect(() => {
    const id = setTimeout(() => load(), 300)
    return () => clearTimeout(id)
  }, [load])

  const total = summary.reduce((s, r) => s + r.count, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
            <Scale className="h-6 w-6 text-gold" /> Legal Agreements
          </h2>
          <p className="text-sm text-muted-foreground">
            Terms-of-Service acceptance records — legal proof that every user agreed to the ToS + Disclaimer.
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/admin/legal/tos-text${getStoredToken() ? `?token=${getStoredToken()}` : ''}`} className="flex-1 sm:flex-none">
            <Button variant="outline" size="sm" className="h-10 border-gold/30 text-gold hover:bg-gold/10">
              <FileText className="mr-1.5 h-4 w-4" /> ToS Text
            </Button>
          </a>
          <a href={`/api/admin/legal/agreements/csv${getStoredToken() ? `?token=${getStoredToken()}` : ''}`} className="flex-1 sm:flex-none">
            <Button size="sm" className="h-10 bg-gold-gradient font-semibold text-primary-foreground">
              <Download className="mr-1.5 h-4 w-4" /> Export All (CSV)
            </Button>
          </a>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-up" />
            <span className="text-[10px] uppercase tracking-wider">Total Agreements</span>
          </div>
          <div className="mt-1 text-2xl font-extrabold tabular-nums text-foreground">{total}</div>
        </div>
        {summary.map((s) => (
          <div key={s.tosVersion} className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4 text-gold" />
              <span className="text-[10px] uppercase tracking-wider truncate">{s.tosVersion}</span>
            </div>
            <div className="mt-1 text-2xl font-extrabold tabular-nums text-foreground">{s.count}</div>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email, UID, or name…"
          className="border-border bg-card pl-10"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      {/* Agreements list */}
      <div className="glass-card rounded-2xl shadow-gold overflow-hidden">
        {loading && agreements.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        ) : agreements.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <Scale className="mb-2 h-8 w-8 opacity-30" />
            No agreements found
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto custom-scroll">
            {/* Table header */}
            <div className="sticky top-0 z-10 grid grid-cols-[1fr_80px_1fr_120px_80px] gap-2 border-b border-border bg-secondary/80 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur-sm sm:grid-cols-[1.2fr_80px_1.5fr_140px_100px_100px]">
              <span>User</span>
              <span>UID</span>
              <span className="hidden sm:block">Email</span>
              <span>ToS Version</span>
              <span>Agreed (UTC)</span>
              <span>Certificate</span>
            </div>
            {agreements.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.01, 0.3) }}
                className="grid grid-cols-[1fr_80px_1fr_120px_80px_80px] items-center gap-2 border-b border-border/50 px-4 py-2.5 text-xs transition-colors hover:bg-secondary/30 sm:grid-cols-[1.2fr_80px_1.5fr_140px_100px_100px]"
              >
                {/* User */}
                <div className="min-w-0">
                  <div className="truncate font-semibold text-foreground">{a.accountName || '—'}</div>
                  <div className="truncate text-[10px] text-muted-foreground sm:hidden">{a.accountEmail}</div>
                </div>
                {/* UID */}
                <div className="font-mono text-[11px] text-gold">{a.accountUid}</div>
                {/* Email (desktop) */}
                <div className="hidden truncate text-muted-foreground sm:block">{a.accountEmail}</div>
                {/* ToS Version */}
                <div className="font-mono text-[10px] text-foreground">{a.tosVersion}</div>
                {/* Agreed At */}
                <div className="text-[10px] text-muted-foreground">
                  <div>{new Date(a.agreedAt).toLocaleDateString('en-US', { timeZone: 'UTC' })}</div>
                  <div>{new Date(a.agreedAt).toLocaleTimeString('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                {/* Certificate download */}
                <div className="flex gap-1">
                  <a
                    href={`/api/admin/legal/agreements/user?userId=${a.userId}&format=txt${getStoredToken() ? `&token=${getStoredToken()}` : ''}`}
                    title="Download certificate (.txt)"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-gold/30 text-gold transition-colors hover:bg-gold/10"
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href={`/api/admin/legal/agreements/user?userId=${a.userId}&format=json${getStoredToken() ? `&token=${getStoredToken()}` : ''}`}
                    title="Download JSON"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Legal notice */}
      <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4 text-xs text-muted-foreground">
        <div className="mb-1.5 flex items-center gap-2 font-bold text-foreground">
          <ShieldCheck className="h-4 w-4 text-gold" /> Legal Defense Information
        </div>
        <p className="leading-relaxed">
          Every user who created an account accepted the <b>Terms of Service and Disclaimer</b> at signup.
          Each acceptance is recorded with:
        </p>
        <ul className="mt-1.5 space-y-0.5 pl-4">
          <li><Calendar className="mr-1 inline h-3 w-3" /> UTC timestamp of agreement</li>
          <li><Globe className="mr-1 inline h-3 w-3" /> IP address (from <code className="bg-secondary/60 px-1 rounded text-[10px]">x-forwarded-for</code>)</li>
          <li><Fingerprint className="mr-1 inline h-3 w-3" /> Device fingerprint (ThumbmarkJS)</li>
          <li><Hash className="mr-1 inline h-3 w-3" /> SHA-256 hash of the exact ToS text (tamper-proof)</li>
        </ul>
        <p className="mt-2 leading-relaxed">
          The CSV export contains all agreement records. The per-user certificate (.txt) includes the
          exact ToS text the user agreed to — ready to attach to a legal filing.
        </p>
      </div>
    </div>
  )
}
