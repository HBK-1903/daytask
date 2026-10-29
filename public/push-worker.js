self.addEventListener('push', (event) => {
  let payload = {}
  try { payload = event.data ? event.data.json() : {} } catch { payload = { body: 'Görev zamanı.' } }
  const title = payload.title || 'Violet Focus'
  const options = {
    body: payload.body || 'Görev zamanı.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.taskId ? `vf-task-${payload.taskId}` : 'vf-reminder',
    renotify: true,
    data: { url: payload.url || '/', taskId: payload.taskId },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      if ('focus' in client) {
        await client.navigate(target)
        return client.focus()
      }
    }
    return self.clients.openWindow(target)
  })())
})
