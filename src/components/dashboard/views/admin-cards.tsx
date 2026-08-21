'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiFetch, getStoredToken } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { CreditCard, Inbox, Loader2, RefreshCw } from 'lucide-react'
import { formatUsd } from '@/lib/format'

interface CardUser {
  id: string
  uid: string
  email: string
  username: string | null
  name: string | null
  kycFullName: string | null
  cardBalance: number
  createdAt: string
}

export function CardsAdmin() {
  const { toast } = useToast()
  const [users, setUsers] = useState<CardUser[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!getStoredToken()) return
    if (!opts?.silent) setLoading(true)
    try {
      const data = await apiFetch<{ users: CardUser[] }>('/api/admin/cards')
      setUsers(data.users || [])
    } catch (err: any) {
      const msg = String(err?.message || '')
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) return
      if (!opts?.silent) toast({ variant: 'destructive', title: 'Failed to load', description: err.message })
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const totalCardBalance = users.reduce((sum, u) => sum + u.cardBalance, 0)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-2xl p-4 text-center">
          <div className="text-2xl font-extrabold text-gold">{users.length}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Active Cards</div>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <div className="text-2xl font-extrabold text-gold">{formatUsd(totalCardBalance)}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Card Balance</div>
        </div>
      </div>

      {/* Refresh */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* List */}
      {loading && users.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <div className="glass-card rounded-2xl">
          <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
            <Inbox className="mb-2 h-8 w-8 opacity-30" />
            No active cards yet. Cards appear here when users transfer funds to their Habesha Card.
          </div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {users.map((u, i) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass-card rounded-2xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10 text-gold ring-1 ring-gold/20">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">{u.kycFullName || u.name || u.email}</div>
                    <div className="text-[11px] text-muted-foreground">UID {u.uid} · @{u.username || '—'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold text-gold">{formatUsd(u.cardBalance)}</div>
                  <div className="text-[10px] text-muted-foreground">Card Balance</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
