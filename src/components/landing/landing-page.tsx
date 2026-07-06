'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LogoWord, LogoMark } from '@/components/common/logo'
import { TokenIcon } from '@/components/common/token-icon'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { useUI } from '@/hooks/use-ui'
import { apiFetch } from '@/lib/api-client'
import { formatUsd } from '@/lib/format'
import { ArrowRight, ShieldCheck, Zap, Globe2, Wallet, Lock, TrendingUp, Gift, Users, ChevronRight, Menu, Search } from 'lucide-react'

interface TokenRow {
  symbol: string
  name: string
  price: number
  change24h: number
  color: string
  icon: string
  listed: boolean
  isLive?: boolean
}

export function LandingPage() {
  const { openAuth, openTokenDetail } = useUI()
  const [tokens, setTokens] = useState<TokenRow[]>([])
  const [mobileNav, setMobileNav] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    apiFetch<{ tokens: TokenRow[] }>('/api/market-data').then((d) => setTokens(d.tokens)).catch(() => {})
  }, [])

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Logo background watermark */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage: 'url(/habesha-mark.jpg)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center 40%',
          backgroundSize: 'min(80vw, 760px)',
        }}
      />
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-gold-glow blur-3xl" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 glass-strong">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <LogoWord />
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#markets" className="transition-colors hover:text-gold">Markets</a>
            <a href="#features" className="transition-colors hover:text-gold">Features</a>
            <a href="#tokens" className="transition-colors hover:text-gold">Tokens</a>
            <a href="#security" className="transition-colors hover:text-gold">Security</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => openAuth('login')}>
              Sign In
            </Button>
            <Button className="shimmer-btn bg-gold-gradient font-bold text-primary-foreground shadow-gold hover:opacity-95" onClick={() => openAuth('signup')}>
              Get Started
            </Button>
            <button className="md:hidden" onClick={() => setMobileNav((s) => !s)} aria-label="Menu">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
        {mobileNav && (
          <div className="border-t border-border/60 px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-3 text-sm text-muted-foreground">
              <a href="#markets" onClick={() => setMobileNav(false)}>Markets</a>
              <a href="#features" onClick={() => setMobileNav(false)}>Features</a>
              <a href="#tokens" onClick={() => setMobileNav(false)}>Tokens</a>
              <a href="#security" onClick={() => setMobileNav(false)}>Security</a>
            </nav>
          </div>
        )}
      </header>

      {/* Ticker */}
      {tokens.length > 0 && (
        <div className="overflow-hidden border-b border-border/40 glass-card">
          <div className="flex w-max animate-ticker gap-8 py-2.5">
            {[...tokens, ...tokens, ...tokens].map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-xs whitespace-nowrap">
                <span className="font-bold" style={{ color: t.color }}>{t.icon}</span>
                <span className="font-semibold">{t.symbol}</span>
                <span className="text-muted-foreground">{formatUsd(t.price)}</span>
                <span className={t.change24h >= 0 ? 'text-up' : 'text-down'}>
                  {t.change24h >= 0 ? '+' : ''}{t.change24h.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="relative mx-auto w-full max-w-7xl px-4 pb-10 pt-20 sm:px-6 sm:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          {/* Floating logo with glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto mb-8 flex justify-center"
          >
            <div className="relative">
              <div className="bg-gold-glow absolute inset-0 -z-10 scale-150 rounded-full blur-2xl" />
              <LogoMark className="h-20 w-20 rounded-3xl shadow-gold-lg ring-2 ring-gold/20 animate-float" />
            </div>
          </motion.div>

          {/* Premium badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs font-semibold text-gold backdrop-blur-sm"
          >
            <Gift className="h-3.5 w-3.5" /> Bank-grade security · Instant internal transfers
          </motion.div>

          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Trade crypto with{' '}
            <span className="text-gold-gradient">confidence</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            A premium, secure and lightning-fast exchange built for everyone. Trade BTC, USDT, USDC and TON — all in one place.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="shimmer-btn bg-gold-gradient h-12 px-6 sm:h-14 sm:px-10 text-base font-bold text-primary-foreground shadow-gold-lg hover:opacity-95" onClick={() => openAuth('signup')}>
              Create Free Account <ArrowRight className="ml-1 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-6 sm:h-14 sm:px-10 text-base font-semibold glass-card" onClick={() => openAuth('login')}>
              Sign In
            </Button>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-gold" /> Bank-grade security</span>
            <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-gold" /> Instant transfers</span>
            <span className="flex items-center gap-1.5"><Globe2 className="h-4 w-4 text-gold" /> Bank withdrawals in ETB</span>
          </div>
        </motion.div>

        {/* Floating stats card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            { label: '24h Volume', value: '$1.2B' },
            { label: 'Active Users', value: '320K+' },
            { label: 'Tokens Listed', value: '4' },
            { label: 'Uptime', value: '99.99%' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="glass-card gradient-border rounded-2xl p-5 text-center"
            >
              <div className="text-2xl font-extrabold text-gold-gradient sm:text-3xl">{s.value}</div>
              <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Why Habesha Exchange</h2>
          <p className="mt-2 text-muted-foreground">A trading experience engineered for speed, security and simplicity.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Zap, title: 'Lightning Fast', desc: 'Ultra-smooth execution and instant internal transfers between users — no waiting.' },
            { icon: Lock, title: 'Secure by Design', desc: 'Encrypted credentials, protected API routes, and secure session management for every account.' },
            { icon: Wallet, title: 'Multi-Network Wallets', desc: 'Deposit via TRON, Ethereum, Bitcoin and TON networks with verified addresses.' },
            { icon: Users, title: 'Internal Transfers', desc: 'Send funds instantly to any user by their 6-digit UID — zero fees, zero delay.' },
            { icon: TrendingUp, title: 'Live Markets', desc: 'Track BTC, USDT, USDC and TON with real-time CoinGecko pricing.' },
            { icon: Globe2, title: 'Bank Withdrawals', desc: 'Cash out to Ethiopian banks (CBE, Telebirr, Abay, M-PESA) in ETB at fixed rates.' },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="group glass-card gradient-border rounded-2xl p-6 transition-all hover:shadow-gold"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/10 text-gold ring-1 ring-gold/20 transition-all group-hover:scale-110 group-hover:bg-gold/20">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Tokens / Markets */}
      <section id="tokens" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Markets</h2>
            <p className="mt-2 text-muted-foreground">Click any token to view its price chart.</p>
          </div>
          <div className="relative w-full max-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search token…"
              className="border-border bg-card/60 pl-9"
            />
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl glass-card shadow-premium">
          <div className="grid grid-cols-12 gap-2 border-b border-border px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            <div className="col-span-5 sm:col-span-4">Token</div>
            <div className="col-span-3 sm:col-span-3 text-right">Price</div>
            <div className="col-span-2 sm:col-span-3 text-right">24h</div>
            <div className="col-span-2 sm:col-span-2 text-right">Trade</div>
          </div>
          {tokens
            .filter((t) => {
              const q = search.trim().toLowerCase()
              if (!q) return true
              return t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
            })
            .map((t, i) => (
            <motion.div
              key={t.symbol}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => openTokenDetail(t.symbol)}
              className="grid cursor-pointer grid-cols-12 items-center gap-2 border-b border-border/50 px-5 py-4 last:border-0 transition-colors hover:bg-secondary/40"
            >
              <div className="col-span-5 flex items-center gap-3 sm:col-span-4">
                <TokenIcon symbol={t.symbol} iconUrl={(t as any).iconUrl} icon={t.icon} color={t.color} size={36} />
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 font-semibold">
                    {t.symbol}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{t.name}</div>
                </div>
              </div>
              <div className="col-span-3 text-right font-mono text-sm font-semibold sm:col-span-3">
                {formatUsd(t.price)}
              </div>
              <div className={`col-span-2 text-right font-mono text-sm sm:col-span-3 ${t.change24h >= 0 ? 'text-up' : 'text-down'}`}>
                {t.change24h >= 0 ? '+' : ''}{t.change24h.toFixed(2)}%
              </div>
              <div className="col-span-2 text-right sm:col-span-2" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="outline" className="h-8 border-gold/30 text-gold hover:bg-gold/10" onClick={() => openAuth('signup')}>
                  Trade <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section id="security" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Security & <span className="text-gold-gradient">Compliance</span></h2>
            <p className="mt-4 text-muted-foreground">
              Your safety is our priority. We implement industry-standard protections to keep your assets secure.
            </p>
            <ul className="mt-8 space-y-4">
              {['Encrypted password storage (bcrypt)', 'Protected, authenticated API routes', 'Manual deposit approval workflow', 'Secure session management'].map((s) => (
                <li key={s} className="flex items-center gap-3 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10 ring-1 ring-gold/20"><ShieldCheck className="h-4 w-4 text-gold" /></div>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card gradient-border rounded-2xl p-6 transition-all hover:shadow-gold">
              <div className="text-sm font-bold">Instant Transfers</div>
              <div className="mt-1 text-xs text-muted-foreground">UID to UID</div>
              <div className="mt-4 text-2xl font-extrabold text-gold-gradient">0 Fees</div>
              <div className="text-[11px] text-muted-foreground">between users</div>
            </div>
            <div className="glass-card gradient-border rounded-2xl p-6 transition-all hover:shadow-gold">
              <div className="text-sm font-bold">Bank Withdrawals</div>
              <div className="mt-1 text-xs text-muted-foreground">CBE · Telebirr · Abay · M-PESA</div>
              <div className="mt-4 text-2xl font-extrabold text-gold-gradient">~186 ETB</div>
              <div className="text-[11px] text-muted-foreground">per 1 USDT</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl gradient-border glass-card p-12 text-center shadow-gold-lg">
          <div className="bg-gold-glow pointer-events-none absolute inset-0 opacity-30" />
          <div className="relative">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Start trading in under a minute</h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">Join thousands of traders on Habesha Exchange and claim your welcome bonus today.</p>
            <Button size="lg" className="shimmer-btn bg-gold-gradient mt-8 h-12 px-6 sm:h-14 sm:px-10 text-base font-bold text-primary-foreground shadow-gold hover:opacity-95" onClick={() => openAuth('signup')}>
              Create Free Account <ArrowRight className="ml-1 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/40 glass-strong">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 sm:px-6 md:flex-row md:justify-between">
          <div className="flex items-center gap-3">
            <LogoMark className="h-9 w-9 rounded-xl shadow-gold" />
            <div>
              <div className="text-sm font-bold"><span className="text-gold-gradient">HABESHA</span> EXCHANGE</div>
              <div className="text-[11px] text-muted-foreground">© {new Date().getFullYear()} Habesha Exchange. All rights reserved.</div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <a href="#" className="transition-colors hover:text-gold">Terms</a>
            <a href="#" className="transition-colors hover:text-gold">Privacy</a>
            <a href="#" className="transition-colors hover:text-gold">Support</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
