'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiFetch, getStoredToken } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'
import { Scale, Download, FileText, Loader2, Search, ShieldCheck, Calendar, Globe, Fingerprint, Hash, RefreshCw, Eye, Printer, X } from 'lucide-react'

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
  const [backfilling, setBackfilling] = useState(false)
  // Certificate viewer state
  const [viewing, setViewing] = useState<TosAgreementRow | null>(null)
  const [certificate, setCertificate] = useState<{
    agreements: TosAgreementRow[]
    tosFullText: string
    tosMeta: { version: string; effectiveDate: string; title: string; sections: { heading: string; body: string; severity: string }[] } | null
  } | null>(null)
  const [certLoading, setCertLoading] = useState(false)

  const load = useCallback(async () => {
    if (!getStoredToken()) return
    setLoading(true)
    try {
      const q = search ? `&search=${encodeURIComponent(search.trim())}` : ''
      const data = await apiFetch<{ agreements: TosAgreementRow[]; count: number; summary: SummaryRow[]; totalUsers?: number; autoBackfilled?: number }>(
        `/api/admin/legal/agreements?limit=200${q}`,
      )
      setAgreements(data.agreements)
      setSummary(data.summary || [])
      // If the API auto-backfilled any users on this load, show a toast so
      // the admin knows what happened.
      if (data.autoBackfilled && data.autoBackfilled > 0) {
        toast({
          title: `${data.autoBackfilled} user(s) auto-backfilled ✓`,
          description: `These users signed up before the ToS requirement. They've been automatically marked as agreed using their original signup dates.`,
        })
      }
    } catch (err: any) {
      const msg = String(err?.message || '')
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) return
      toast({ variant: 'destructive', title: 'Failed to load', description: err.message })
    } finally {
      setLoading(false)
    }
  }, [search, toast])

  async function viewCertificate(a: TosAgreementRow) {
    setViewing(a)
    setCertLoading(true)
    setCertificate(null)
    try {
      const data = await apiFetch<{
        agreements: TosAgreementRow[]
        tosFullText: string
        tosMeta: { version: string; effectiveDate: string; title: string; sections: { heading: string; body: string; severity: string }[] } | null
      }>(`/api/admin/legal/agreements/user?userId=${a.userId}&format=json`)
      setCertificate(data)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to load certificate', description: err.message })
      setViewing(null)
    } finally {
      setCertLoading(false)
    }
  }

  async function backfill() {
    if (!confirm('Backfill all existing users (who signed up before the ToS update) as having agreed to the Terms of Service?\n\nThis will:\n• Mark them as agreedToS=true\n• Use their original signup date as the agreement timestamp\n• Create a TosAgreement audit-log entry for each\n• IP will be marked as "(pre-ToS-update-backfill)"\n\nThis is safe to run multiple times (idempotent).')) return
    setBackfilling(true)
    try {
      const res = await apiFetch<{ ok: boolean; backfilled: number; auditEntriesCreated: number; totalAgreements: number; message: string }>(
        '/api/admin/legal/backfill',
        { method: 'POST' },
      )
      toast({ title: 'Backfill complete', description: res.message })
      await load()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Backfill failed', description: err.message })
    } finally {
      setBackfilling(false)
    }
  }

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
          <Button variant="outline" size="sm" className="h-10 border-border" disabled={backfilling} onClick={backfill}>
            {backfilling ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
            {backfilling ? 'Backfilling…' : 'Backfill Old Users'}
          </Button>
          <a href={`/api/admin/legal/tos-text${getStoredToken() ? `?token=${getStoredToken()}` : ''}`} className="flex-none">
            <Button variant="outline" size="sm" className="h-10 border-gold/30 text-gold hover:bg-gold/10">
              <FileText className="mr-1.5 h-4 w-4" /> ToS Text
            </Button>
          </a>
          <a href={`/api/admin/legal/agreements/csv${getStoredToken() ? `?token=${getStoredToken()}` : ''}`} className="flex-none">
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
                {/* Certificate view + download */}
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => viewCertificate(a)}
                    title="View certificate (printable)"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-gold/30 text-gold transition-colors hover:bg-gold/10"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <a
                    href={`/api/admin/legal/agreements/user?userId=${a.userId}&format=txt${getStoredToken() ? `&token=${getStoredToken()}` : ''}`}
                    title="Download (.txt)"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
                  >
                    <FileText className="h-3.5 w-3.5" />
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

      {/* On-screen certificate viewer — renders the agreement as a
          professional, printable legal document. The admin can read it
          on screen and click Print to save as PDF. */}
      <CertificateModal
        agreement={viewing}
        certificate={certificate}
        loading={certLoading}
        onClose={() => { setViewing(null); setCertificate(null) }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Certificate Modal — shows the agreement as a professional, printable
// legal document. Styled to look like real paper (white background, serif
// font, bordered sections). The Print button calls window.print() so the
// admin can save it as a PDF from the browser's print dialog.
// ─────────────────────────────────────────────────────────────────────────

function CertificateModal({
  agreement,
  certificate,
  loading,
  onClose,
}: {
  agreement: TosAgreementRow | null
  certificate: {
    agreements: TosAgreementRow[]
    tosFullText: string
    tosMeta: { version: string; effectiveDate: string; title: string; sections: { heading: string; body: string; severity: string }[] } | null
  } | null
  loading: boolean
  onClose: () => void
}) {
  // The agreement being displayed (first = most recent)
  const a = certificate?.agreements?.[0] || agreement
  const tosMeta = certificate?.tosMeta

  return (
    <>
      {agreement && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/80 p-4 print:static print:bg-white print:p-0">
          {/* Action bar (non-printable) */}
          <div className="sticky top-0 z-20 flex w-full max-w-[680px] items-center justify-between rounded-t-xl border border-border bg-card px-5 py-3 print:hidden">
            <div className="text-sm font-bold">ToS Acceptance Certificate</div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-8 bg-gold-gradient text-primary-foreground"
                onClick={() => window.print()}
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" /> Print / Save PDF
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex h-64 w-full max-w-[680px] items-center justify-center rounded-b-xl border border-t-0 border-border bg-card">
              <Loader2 className="h-8 w-8 animate-spin text-gold" />
            </div>
          )}

          {/* The certificate — styled as a professional paper document. */}
          {a && !loading && (
            <div
              className="certificate-paper mb-4 w-full max-w-[680px] rounded-b-xl bg-white p-8 text-black sm:p-10 print:rounded-none print:border-0"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              {/* Header */}
              <div className="text-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">Habesha Exchange</div>
                <h1 className="mt-2 text-xl font-bold text-black sm:text-2xl" style={{ letterSpacing: '-0.02em' }}>
                  Terms of Service Acceptance Certificate
                </h1>
                <div className="mx-auto mt-3 h-0.5 w-32 bg-gray-800" />
                <p className="mt-3 text-[11px] text-gray-600">
                  This document certifies that the following user accepted the Terms of Service
                  and Disclaimer of Habesha Exchange.
                </p>
              </div>

              {/* Account Details */}
              <div className="mt-6">
                <div className="mb-2 border-b border-gray-300 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Account Details (at time of agreement)
                </div>
                <table className="w-full text-[12px]">
                  <tbody>
                    <CertRow label="UID" value={a.accountUid} />
                    <CertRow label="Email" value={a.accountEmail} />
                    <CertRow label="Name" value={a.accountName || '(not provided)'} />
                  </tbody>
                </table>
              </div>

              {/* Agreement Details */}
              <div className="mt-5">
                <div className="mb-2 border-b border-gray-300 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Agreement Details
                </div>
                <table className="w-full text-[12px]">
                  <tbody>
                    <CertRow label="ToS Version" value={a.tosVersion} />
                    <CertRow label="Effective Date" value={tosMeta?.effectiveDate || '—'} />
                    <CertRow label="Agreed At (UTC)" value={new Date(a.agreedAt).toUTCString()} />
                    <CertRow label="IP Address" value={a.ipAddress || '(not captured)'} />
                    <CertRow label="User Agent" value={a.userAgent || '(not captured)'} />
                    <CertRow label="Device Fingerprint" value={a.visitorId || '(not captured)'} />
                    <CertRow label="ToS Text SHA-256" value={a.tosTextHash || '(not captured)'} mono />
                  </tbody>
                </table>
              </div>

              {/* ToS Text */}
              <div className="mt-6">
                <div className="mb-2 border-b border-gray-300 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Exact Terms of Service Text (as agreed by the user)
                </div>
                {tosMeta?.sections?.map((s, i) => (
                  <div key={i} className="mt-3">
                    <div className="text-[12px] font-bold text-black">{s.heading}</div>
                    <p className="mt-1 text-[12px] leading-relaxed text-gray-800">{s.body}</p>
                  </div>
                ))}
                <div className="mt-4 border-t border-gray-300 pt-3 text-[11px] italic text-gray-600">
                  By creating an account, you confirm that you have read, understood, and agree to all of the above terms.
                </div>
              </div>

              {/* Signature / verification line */}
              <div className="mt-8 border-t border-gray-400 pt-4">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="h-8 border-b border-gray-600 w-48" />
                    <div className="mt-1 text-[9px] text-gray-500">Authorized Signature / Habesha Exchange</div>
                  </div>
                  <div className="text-right text-[10px] text-gray-500">
                    <div>Document generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    <div className="mt-0.5">Reference: {a.id}</div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 border-t-2 border-gray-800 pt-2 text-center text-[9px] text-gray-500">
                Habesha Exchange — Educational Simulation Project · This certificate is a system-generated legal record of ToS acceptance.
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}

/** A single key→value row in the certificate table. */
function CertRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <tr className="align-top">
      <td className="w-40 py-0.5 pr-3 text-gray-500">{label}:</td>
      <td className={`py-0.5 text-black ${mono ? 'font-mono text-[10px] break-all' : 'break-words'}`}>{value}</td>
    </tr>
  )
}
