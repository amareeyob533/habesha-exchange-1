'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { Copy, Check, LogOut, ShieldCheck, Mail, Calendar, KeyRound } from 'lucide-react'
import { motion } from 'framer-motion'

export function ProfileView() {
  const { user, updateProfile, logout } = useAuth()
  const { toast } = useToast()
  const [name, setName] = useState(user?.name || '')
  const [country, setCountry] = useState(user?.country || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

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

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Profile</h2>
        <p className="text-sm text-muted-foreground">Manage your account details</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Identity card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-20 w-20 ring-2 ring-gold/30">
              <AvatarFallback className="bg-gold/15 text-xl font-bold text-gold">{initials}</AvatarFallback>
            </Avatar>
            <div className="mt-3 text-lg font-bold">{user?.name || 'User'}</div>
            <div className="text-xs text-muted-foreground">{user?.email}</div>
            <button onClick={copyUid} className="mt-3 flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-3 py-1.5 text-sm font-bold text-gold transition-colors hover:bg-gold/10">
              UID {user?.uid}
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {user?.username && (
              <div className="mt-2 text-xs text-muted-foreground">@{user.username}</div>
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
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

          <div className="mt-6 rounded-xl border border-gold/20 bg-gold/5 p-4">
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
