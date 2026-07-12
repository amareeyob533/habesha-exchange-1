'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Copy, Check, LogOut, ShieldCheck, Mail, Calendar, KeyRound, Camera, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { VerifiedAvatar } from '@/components/common/verified-avatar'
import { compressImage, formatBytes } from '@/lib/compress-image'
import { apiFetch, uploadFile } from '@/lib/api-client'

export function ProfileView() {
  const { user, updateProfile, fetchMe, logout } = useAuth()
  const { toast } = useToast()
  const [name, setName] = useState(user?.name || '')
  const [country, setCountry] = useState(user?.country || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Please select an image file' })
      e.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Max 5 MB' })
      e.target.value = ''
      return
    }
    setUploadingAvatar(true)
    try {
      // Compress in the browser first — dramatically reduces upload time.
      const originalSize = file.size
      const compressed = await compressImage(file, 400, 0.8)
      const savedPct = originalSize > 0 ? Math.round((1 - compressed.size / originalSize) * 100) : 0
      if (savedPct > 10) {
        toast({ title: 'Image compressed', description: `${formatBytes(originalSize)} → ${formatBytes(compressed.size)} (${savedPct}% smaller)` })
      }
      await uploadFile('/api/user/avatar', compressed)
      await fetchMe()
      toast({ title: 'Profile picture updated' })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload failed', description: err.message || 'Could not upload image' })
    } finally {
      setUploadingAvatar(false)
      e.target.value = ''
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateProfile({ name, country, phone })
      toast({ title: 'Profile updated' })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message })
    } finally {
      setSaving(false)
    }
  }

  function copyUid() {
    navigator.clipboard.writeText(user?.uid || '')
    setCopied(true)
    toast({ title: 'UID copied', description: 'Your UID can be used for internal transfers.' })
    setTimeout(() => setCopied(false), 1500)
  }

  const initials = (user?.name || user?.email || 'U').slice(0, 2).toUpperCase()
  const isVerified = user?.kycStatus === 'approved'

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Profile</h2>
        <p className="text-sm text-muted-foreground">Manage your account details</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Identity card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl glass-card gradient-border p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            {/* Avatar with upload + verification badge */}
            <div className="relative">
              <VerifiedAvatar
                src={user?.avatarUrl}
                fallback={initials}
                size="lg"
                verified={isVerified}
              />
              {/* Upload button overlapping the avatar */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -top-1 -left-1 flex h-7 w-7 items-center justify-center rounded-full bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                aria-label="Change profile picture"
              >
                {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*,.heic,.heif,.avif" className="hidden" onChange={handleAvatar} />
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <span className="text-lg font-bold">{user?.name || 'User'}</span>
              {isVerified && (
                <span title="Verified (KYC)" className="inline-flex">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#1D9BF0]" aria-hidden>
                    <path d="M12 1l2.5 2.5L18 2l1 3.5L22.5 6 21 9.5l2 3-2.5 2.5L22 18.5 18.5 18l-1 3.5L14 20l-2 3-2-3-3.5 1.5L6 18l-3.5.5L4 15 2 12.5l2.5-2.5L3 6.5 6.5 6 8 2.5 11.5 4z" />
                    <path d="M10.5 14.5l-2.5-2.5 1.4-1.4 1.1 1.1 3.6-3.6L15.5 9.5z" fill="white" />
                  </svg>
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{user?.email}</div>
            <button onClick={copyUid} className="mt-3 flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-3 py-1.5 text-sm font-bold text-gold transition-colors hover:bg-gold/10">
              UID {user?.uid}
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {user?.username && (
              <div className="mt-2 text-xs text-muted-foreground">@{user.username}</div>
            )}
            {isVerified && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#1D9BF0]/15 px-2 py-0.5 text-[10px] font-bold text-[#1D9BF0]">
                <svg viewBox="0 0 24 24" className="h-3 w-3 fill-[#1D9BF0]" aria-hidden>
                  <path d="M10.5 14.5l-2.5-2.5 1.4-1.4 1.1 1.1 3.6-3.6L15.5 9.5z" />
                </svg>
                Verified
              </div>
            )}
          </div>

          <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <Row icon={Mail} label="Email" value={user?.email || '—'} />
            <Row icon={Calendar} label="Joined" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'} />
            <Row icon={KeyRound} label="Sign-in" value={user?.provider === 'google' ? 'Google' : 'Email & Password'} />
          </div>

          <Button variant="outline" className="mt-4 w-full border-down/30 text-down hover:bg-down/10" onClick={logout}>
            <LogOut className="mr-1 h-4 w-4" /> Sign out
          </Button>
        </motion.div>

        {/* Edit form */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl glass-card gradient-border p-6 lg:col-span-2">
          <h3 className="text-lg font-bold">Edit Profile</h3>
          <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary/40" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email (read-only)</Label>
              <Input value={user?.email || ''} disabled className="bg-secondary/20 text-muted-foreground" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Country</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Ethiopia" className="bg-secondary/40" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+251…" className="bg-secondary/40" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="bg-gold-gradient font-semibold text-primary-foreground" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>

          <div className="mt-6 rounded-xl glass-card gradient-border p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-gold"><ShieldCheck className="h-4 w-4" /> Account Security</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Your password is stored with bcrypt hashing. Your UID <b className="text-gold">{user?.uid}</b> is used for instant internal transfers — share it only with people you trust.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="ml-auto truncate text-xs font-medium">{value}</span>
    </div>
  )
}
