// Service worker for Habesha Exchange — receives web push notifications.
// Registered from src/lib/push-client.ts. When a push arrives, we show a
// system notification. Clicking it focuses/opens the app.

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Receive a push event → show a notification.
self.addEventListener('push', (event) => {
  let data = { title: 'Habesha Exchange', body: 'You have a new notification', url: '/', tag: 'habesha-notification', icon: '/habesha-mark.jpg', badge: '/habesha-mark.jpg' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    // payload wasn't JSON — use defaults
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      data: { url: data.url },
      requireInteraction: false,
    }),
  )
})

// Click the notification → focus/open the app at the notification's URL.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of allClients) {
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })(),
  )
})
