self.addEventListener('push', (event) => {
  let payload = {}
  try { payload = event.data ? event.data.json() : {} } catch { payload = { body: 'Görev zamanı.' } }
  const title = payload.title || 'Violet Focus'
  const hasTaskActions = Boolean(payload.taskId && payload.actionUrl && payload.actionToken)
  const options = {
    body: payload.body || 'Görev zamanı.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.taskId ? `vf-task-${payload.taskId}` : 'vf-reminder',
    renotify: true,
    actions: hasTaskActions ? [
      { action: 'complete', title: 'Tamamlandı' },
      { action: 'snooze', title: '10 dk ertele' },
      { action: 'dismiss', title: 'Kapat' },
    ] : [],
    data: {
      url: payload.url || '/',
      taskId: payload.taskId,
      actionUrl: payload.actionUrl,
      actionToken: payload.actionToken,
    },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil((async () => {
    const data = event.notification.data || {}
    const target = new URL(data.url || '/', self.location.origin)
    const action = ['complete', 'snooze', 'dismiss'].includes(event.action) ? event.action : ''
    if (action && data.taskId && data.actionUrl && data.actionToken) {
      target.searchParams.set('reminderAction', action)
      try {
        const response = await fetch(data.actionUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ taskId: String(data.taskId), actionToken: data.actionToken, action }),
        })
        if (response.ok) {
          const result = await response.json().catch(() => ({}))
          if (action === 'snooze' && Number.isFinite(result.dueAt)) target.searchParams.set('reminderDueAt', String(result.dueAt))
        } else {
          target.searchParams.set('reminderActionFailed', '1')
        }
      } catch {
        target.searchParams.set('reminderActionFailed', '1')
      }
    }

    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      if ('focus' in client) {
        await client.navigate(target.href)
        return client.focus()
      }
    }
    return self.clients.openWindow(target.href)
  })())
})
