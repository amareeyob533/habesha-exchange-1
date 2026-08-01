'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { useTheme } from 'next-themes'
import { useUserSettings } from '@/hooks/use-user-settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { motion } from 'framer-motion'
import { Settings, Moon, Sun, Wallet, Bell, Shield, Sliders, Loader2, ShieldCheck } from 'lucide-react'

export function SettingsView() {
  const { user, updateProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const { settings, loading, save } = useUserSettings()

  // Profile settings (local state — saved on submit)
  const [name, setName] = useState(user?.name || '')
  const [country, setCountry] = useState(user?.country || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Auto-save a single setting when it changes.
  async function autoSave(field: string, value: any, label: string) {
    const ok = await save({ [field]: value } as any)
    if (ok) {
      toast({ title: `${label} updated` })
    } else {
      toast({ variant: 'destructive', title: 'Failed to save', description: 'Please try again.' })
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    try {
      await updateProfile({ name, country, phone })
      toast({ title: 'Profile saved' })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message })
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <Settings className="h-6 w-6 text-gold" /> Settings
        </h2>
        <p className="text-sm text-muted-foreground">Manage your exchange, wallet, and account preferences</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Exchange Settings */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card gradient-border rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/10 text-gold ring-1 ring-gold/20">
              <Sliders className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold">Exchange Settings</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Default trading pair</Label>
              <Select
                value={settings.defaultToken}
                onValueChange={(v) => autoSave('defaultToken', v, 'Default trading pair')}
              >
                <SelectTrigger className="bg-secondary/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDT">USDT</SelectItem>
                  <SelectItem value="BTC">BTC</SelectItem>
                  <SelectItem value="TON">TON</SelectItem>
                  <SelectItem value="ETH">ETH</SelectItem>
                  <SelectItem value="SOL">SOL</SelectItem>
                  <SelectItem value="TRX">TRX</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Slippage tolerance (%)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={settings.slippage}
                onChange={(e) => autoSave('slippage', parseFloat(e.target.value) || 0, 'Slippage tolerance')}
                className="bg-secondary/40"
              />
            </div>
            <ToggleRow
              label="Show balance in USD"
              desc="Display all token values in USD"
              checked={settings.showBalanceUsd}
              onChecked={(v) => autoSave('showBalanceUsd', v, 'Balance display')}
            />
            <ToggleRow
              label="Compact view"
              desc="Show more tokens per screen"
              checked={settings.compactView}
              onChecked={(v) => autoSave('compactView', v, 'Compact view')}
            />
          </div>
        </motion.div>

        {/* Wallet Settings */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card gradient-border rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-up/10 text-up ring-1 ring-up/20">
              <Wallet className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold">Wallet Settings</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Default deposit network</Label>
              <Select
                value={settings.defaultNetwork}
                onValueChange={(v) => autoSave('defaultNetwork', v, 'Default network')}
              >
                <SelectTrigger className="bg-secondary/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRON (TRC20)">TRON (TRC20)</SelectItem>
                  <SelectItem value="Ethereum (ERC20)">Ethereum (ERC20)</SelectItem>
                  <SelectItem value="Bitcoin Network">Bitcoin Network</SelectItem>
                  <SelectItem value="TON Network">TON Network</SelectItem>
                  <SelectItem value="Solana Network">Solana Network</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ToggleRow
              label="Auto-convert small amounts"
              desc="Automatically convert dust to USDT"
              checked={settings.autoConvertDust}
              onChecked={(v) => autoSave('autoConvertDust', v, 'Auto-convert')}
            />
            <ToggleRow
              label="Hide small balances"
              desc="Hide tokens worth less than $1"
              checked={settings.hideSmallBalances}
              onChecked={(v) => autoSave('hideSmallBalances', v, 'Hide small balances')}
            />
          </div>
        </motion.div>

        {/* Appearance */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card gradient-border rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-chart-4/10 text-chart-4 ring-1 ring-chart-4/20">
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </div>
            <h3 className="text-base font-bold">Appearance</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                  {theme === 'dark' ? <Moon className="h-4 w-4 text-gold" /> : <Sun className="h-4 w-4 text-gold" />}
                </div>
                <div>
                  <div className="text-sm font-semibold">Theme</div>
                  <div className="text-[11px] text-muted-foreground">Currently: {theme === 'dark' ? 'Dark mode' : 'Light mode'}</div>
                </div>
              </div>
              <Switch checked={theme === 'dark'} onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')} />
            </div>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card gradient-border rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-chart-5/10 text-chart-5 ring-1 ring-chart-5/20">
              <Bell className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold">Notifications</h3>
          </div>
          <div className="space-y-4">
            <ToggleRow
              label="Email notifications"
              desc="Receive emails for important events"
              checked={settings.emailNotifs}
              onChecked={(v) => autoSave('emailNotifs', v, 'Email notifications')}
            />
            <ToggleRow
              label="Push notifications"
              desc="In-app notification banners"
              checked={settings.pushNotifs}
              onChecked={(v) => autoSave('pushNotifs', v, 'Push notifications')}
            />
            <ToggleRow
              label="Deposit alerts"
              desc="Notify when a deposit is confirmed"
              checked={settings.depositAlerts}
              onChecked={(v) => autoSave('depositAlerts', v, 'Deposit alerts')}
            />
            <ToggleRow
              label="Withdrawal alerts"
              desc="Notify when a withdrawal completes"
              checked={settings.withdrawAlerts}
              onChecked={(v) => autoSave('withdrawAlerts', v, 'Withdrawal alerts')}
            />
          </div>
        </motion.div>
      </div>
      )}

      {/* Account / Profile settings */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card gradient-border rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/10 text-gold ring-1 ring-gold/20">
            <Shield className="h-4 w-4" />
          </div>
          <h3 className="text-base font-bold">Account Information</h3>
        </div>
        <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Full Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary/40" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Country</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Ethiopia" className="bg-secondary/40" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+251…" className="bg-secondary/40" />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" className="bg-gold-gradient font-semibold text-primary-foreground" disabled={savingProfile}>
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function ToggleRow({ label, desc, checked, onChecked }: { label: string; desc: string; checked: boolean; onChecked: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 p-3">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChecked} />
    </div>
  )
}
