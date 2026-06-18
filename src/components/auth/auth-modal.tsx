'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowRight, ShieldCheck } from 'lucide-react'
import { LogoMark } from '@/components/common/logo'

interface AuthModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  defaultTab?: 'login' | 'signup'
}

export function AuthModal({ open, onOpenChange, defaultTab = 'login' }: AuthModalProps) {
  const { login, signup, loginWithGoogle, loading } = useAuth()
  const { toast } = useToast()
  const [tab, setTab] = useState<'login' | 'signup'>(defaultTab)
  const [showGoogle, setShowGoogle] = useState(false)

  // login form
  const [lemail, setLemail] = useState('')
  const [lpass, setLpass] = useState('')
  // signup form
  const [sname, setSname] = useState('')
  const [semail, setSemail] = useState('')
  const [spass, setSpass] = useState('')
  const [showPass, setShowPass] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    try {
      await login(lemail, lpass)
      toast({ title: 'Welcome back!', description: 'You are now signed in.' })
      onOpenChange(false)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Sign in failed', description: err.message })
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (spass.length < 6) {
      toast({ variant: 'destructive', title: 'Weak password', description: 'Use at least 6 characters.' })
      return
    }
    try {
      await signup(semail, spass, sname)
      toast({
        title: 'Account created! 🎉',
        description: 'You received $299.9 in Habesha Token as a welcome bonus.',
      })
      onOpenChange(false)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Sign up failed', description: err.message })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] gap-0 overflow-hidden border-border/80 bg-card p-0">
        <div className="relative">
          <div className="bg-gold-glow pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full" />
          <div className="relative flex flex-col items-center px-7 pb-2 pt-8 text-center">
            <LogoMark className="h-14 w-14 rounded-2xl ring-2 ring-gold/30" />
            <DialogTitle className="mt-4 text-xl font-extrabold tracking-tight">
              <span className="text-gold-gradient">HABESHA</span> EXCHANGE
            </DialogTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {tab === 'login' ? 'Sign in to your account' : 'Create your account in seconds'}
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {showGoogle ? (
            <GoogleChooser
              key="google"
              onBack={() => setShowGoogle(false)}
              onPick={async (profile) => {
                try {
                  await loginWithGoogle(profile)
                  toast({ title: 'Signed in with Google', description: 'Welcome to Habesha Exchange.' })
                  onOpenChange(false)
                } catch (err: any) {
                  toast({ variant: 'destructive', title: 'Google sign-in failed', description: err.message })
                }
              }}
              loading={loading}
            />
          ) : (
            <motion.div
              key="tabs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-7 pb-7 pt-3"
            >
              <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-5">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <Field icon={Mail} label="Email">
                      <Input
                        type="email"
                        required
                        value={lemail}
                        onChange={(e) => setLemail(e.target.value)}
                        placeholder="you@example.com"
                        className="border-border bg-secondary/40 pl-10"
                      />
                    </Field>
                    <Field icon={Lock} label="Password">
                      <Input
                        type={showPass ? 'text' : 'password'}
                        required
                        value={lpass}
                        onChange={(e) => setLpass(e.target.value)}
                        placeholder="••••••••"
                        className="border-border bg-secondary/40 pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </Field>
                    <Button type="submit" disabled={loading} className="bg-gold-gradient h-11 w-full text-primary-foreground font-semibold hover:opacity-95">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign In <ArrowRight className="ml-1 h-4 w-4" /></>}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-5">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <Field icon={User} label="Full Name">
                      <Input
                        required
                        value={sname}
                        onChange={(e) => setSname(e.target.value)}
                        placeholder="Your name"
                        className="border-border bg-secondary/40 pl-10"
                      />
                    </Field>
                    <Field icon={Mail} label="Email">
                      <Input
                        type="email"
                        required
                        value={semail}
                        onChange={(e) => setSemail(e.target.value)}
                        placeholder="you@example.com"
                        className="border-border bg-secondary/40 pl-10"
                      />
                    </Field>
                    <Field icon={Lock} label="Password">
                      <Input
                        type={showPass ? 'text' : 'password'}
                        required
                        value={spass}
                        onChange={(e) => setSpass(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="border-border bg-secondary/40 pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </Field>
                    <div className="flex items-start gap-2 rounded-lg border border-gold/20 bg-gold/5 p-2.5 text-[11px] text-muted-foreground">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                      <span>New accounts receive <b className="text-gold">$299.9</b> worth of Habesha Token as a welcome bonus.</span>
                    </div>
                    <Button type="submit" disabled={loading} className="bg-gold-gradient h-11 w-full font-semibold text-primary-foreground hover:opacity-95">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create Account <ArrowRight className="ml-1 h-4 w-4" /></>}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-3 text-[11px] uppercase tracking-wider text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setShowGoogle(true)}
                className="h-11 w-full border-border bg-secondary/40 font-medium hover:border-gold/50"
              >
                <GoogleIcon className="mr-2 h-4 w-4" />
                Continue with Google
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

function Field({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {children}
      </div>
    </div>
  )
}

function GoogleChooser({
  onBack,
  onPick,
  loading,
}: {
  onBack: () => void
  onPick: (p: { email: string; name?: string; avatarUrl?: string }) => void
  loading: boolean
}) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="px-7 pb-7 pt-3"
    >
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-secondary/40 p-3">
        <GoogleIcon className="h-5 w-5" />
        <div className="text-xs">
          <div className="font-semibold">Sign in with Google</div>
          <div className="text-muted-foreground">to continue to Habesha Exchange</div>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!email) return
          onPick({ email, name: name || undefined })
        }}
        className="space-y-3"
      >
        <Input
          type="email"
          required
          placeholder="Email or phone"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 border-border bg-background"
        />
        <Input
          placeholder="Full name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11 border-border bg-background"
        />
        <p className="text-[11px] text-muted-foreground">
          Not your computer? Use Guest mode. <span className="text-gold">Learn more</span>
        </p>
        <div className="flex items-center justify-between pt-2">
          <button type="button" onClick={onBack} className="text-sm font-medium text-gold hover:underline">
            Back
          </button>
          <Button type="submit" disabled={loading || !email} className="bg-gold-gradient font-medium text-primary-foreground hover:opacity-95">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Next'}
          </Button>
        </div>
      </form>
    </motion.div>
  )
}

function GoogleIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  )
}
