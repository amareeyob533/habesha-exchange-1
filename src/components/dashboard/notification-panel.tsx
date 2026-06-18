'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useUI } from '@/hooks/use-ui'
import { useAuth } from '@/hooks/use-auth'
import { apiFetch } from '@/lib/api-client'
import { timeAgo } from '@/lib/format'
import { Bell, CheckCircle2, Info, AlertTriangle } from 'lucide-react'
import { useEffect } from 'react'

const ICON: Record<string, any> = { success: CheckCircle2, info: Info, warning: AlertTriangle }
const COLOR: Record<string, string> = { success: 'text-up', info: 'text-gold', warning: 'text-down' }

export function NotificationPanel() {
  const { notifOpen, openNotif } = useUI()
  const { notifications, fetchMe } = useAuth()

  useEffect(() => {
    if (notifOpen && notifications.some((n) => !n.read)) {
      apiFetch('/api/notifications', { method: 'POST' }).then(() => fetchMe()).catch(() => {})
    }
    // notifications intentionally excluded to avoid re-firing
  }, [notifOpen])

  function close() {
    useUI.setState({ notifOpen: false })
  }

  return (
    <Sheet open={notifOpen} onOpenChange={(v) => !v && close()}>
      <SheetContent className="w-full border-border bg-card sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-gold" /> Notifications
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 max-h-[calc(100vh-8rem)] space-y-2 overflow-y-auto custom-scroll pr-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
              <Bell className="mb-2 h-8 w-8 opacity-40" />
              No notifications yet
            </div>
          ) : (
            notifications.map((n) => {
              const Icon = ICON[n.type] || Info
              return (
                <div key={n.id} className={`rounded-xl border p-3 ${n.read ? 'border-border bg-secondary/20' : 'border-gold/30 bg-gold/5'}`}>
                  <div className="flex items-start gap-2.5">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${COLOR[n.type] || 'text-gold'}`} />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{n.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{n.message}</div>
                      <div className="mt-1.5 text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
