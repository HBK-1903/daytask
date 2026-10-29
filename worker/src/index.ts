import { buildPushPayload, type PushSubscription as WebPushSubscription, type VapidKeys } from '@block65/webcrypto-web-push'

interface Env {
  hbkd1: D1Database
  APP_ORIGIN: string
  APP_PASSWORD: string
  SESSION_SECRET: string
  VAPID_SUBJECT: string
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string
}

interface SessionClaims { sub: 'owner'; exp: number }
interface PushSubInput { endpoint: string; expirationTime?: number | null; keys: { p256dh: string; auth: string } }
interface TaskInput {
  id: string
  title: string
  category?: string
  dueAt: number
  durationMinutes?: number
  status?: 'pending' | 'completed' | 'dismissed'
}
interface SyncVaultInput { salt: string; iv: string; ciphertext: string }
interface ReminderSettingsInput { quietStart: string; quietEnd: string; wording: 'brief' | 'task'; privacyMode: boolean }

const encoder = new TextEncoder()
const jsonHeaders = { 'content-type': 'application/json; charset=utf-8' }

function encodeBase64Url(value: Uint8Array | string): string {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers({
    'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-max-age': '86400',
    'vary': 'Origin',
  })
  const origin = request.headers.get('Origin')
  const allowed = (env.APP_ORIGIN || '').split(',').map((item) => item.trim()).filter(Boolean)
  if (origin && allowed.includes(origin)) {
    headers.set('access-control-allow-origin', origin)
    headers.set('access-control-allow-credentials', 'true')
  }
  return headers
}

function response(request: Request, env: Env, body: unknown, status = 200): Response {
  const headers = corsHeaders(request, env)
  for (const [key, value] of Object.entries(jsonHeaders)) headers.set(key, value)
  return new Response(JSON.stringify(body), { status, headers })
}

function isOriginAllowed(request: Request, env: Env): boolean {
  const origin = request.headers.get('Origin')
  if (!origin) return true
  return (env.APP_ORIGIN || '').split(',').map((item) => item.trim()).includes(origin)
}

async function signSession(env: Env): Promise<string> {
  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = encodeBase64Url(JSON.stringify({ sub: 'owner', exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 } satisfies SessionClaims))
  const content = `${header}.${payload}`
  const key = await crypto.subtle.importKey('raw', encoder.encode(env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(content))
  return `${content}.${encodeBase64Url(new Uint8Array(signature))}`
}

async function hasValidSession(request: Request, env: Env): Promise<boolean> {
  try {
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
    if (!token || !env.SESSION_SECRET) return false
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const content = `${parts[0]}.${parts[1]}`
    const key = await crypto.subtle.importKey('raw', encoder.encode(env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const decodedSignature = decodeBase64Url(parts[2])
    const signature = new Uint8Array(decodedSignature.length)
    signature.set(decodedSignature)
    const valid = await crypto.subtle.verify('HMAC', key, signature.buffer, encoder.encode(content))
    if (!valid) return false
    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1]))) as SessionClaims
    return claims.sub === 'owner' && claims.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

function isValidSubscription(value: unknown): value is PushSubInput {
  if (!value || typeof value !== 'object') return false
  const subscription = value as Partial<PushSubInput>
  return typeof subscription.endpoint === 'string'
    && subscription.endpoint.startsWith('https://')
    && typeof subscription.keys?.p256dh === 'string'
    && typeof subscription.keys?.auth === 'string'
}

function isSyncVaultInput(value: unknown): value is SyncVaultInput {
  if (!value || typeof value !== 'object') return false
  const vault = value as Partial<SyncVaultInput>
  return typeof vault.salt === 'string' && /^[A-Za-z0-9_-]{20,32}$/.test(vault.salt)
    && typeof vault.iv === 'string' && /^[A-Za-z0-9_-]{16,24}$/.test(vault.iv)
    && typeof vault.ciphertext === 'string' && /^[A-Za-z0-9_-]{16,1900000}$/.test(vault.ciphertext)
}

function isReminderSettingsInput(value: unknown): value is ReminderSettingsInput {
  if (!value || typeof value !== 'object') return false
  const settings = value as Partial<ReminderSettingsInput>
  return typeof settings.quietStart === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(settings.quietStart)
    && typeof settings.quietEnd === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(settings.quietEnd)
    && (settings.wording === 'brief' || settings.wording === 'task') && typeof settings.privacyMode === 'boolean'
}

function isTaskInput(value: unknown): value is TaskInput {
  if (!value || typeof value !== 'object') return false
  const task = value as Partial<TaskInput>
  return typeof task.id === 'string' && task.id.length > 0 && task.id.length <= 128
    && typeof task.title === 'string' && task.title.trim().length > 0 && task.title.length <= 240
    && typeof task.dueAt === 'number' && Number.isFinite(task.dueAt)
    && (task.status === undefined || task.status === 'pending' || task.status === 'completed' || task.status === 'dismissed')
}

async function requireSession(request: Request, env: Env): Promise<Response | null> {
  if (await hasValidSession(request, env)) return null
  return response(request, env, { error: 'Oturum gerekli.' }, 401)
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname.replace(/\/+$/, '') || '/'

  if (request.method === 'OPTIONS') {
    if (!isOriginAllowed(request, env)) return response(request, env, { error: 'Origin not allowed.' }, 403)
    return new Response(null, { status: 204, headers: corsHeaders(request, env) })
  }
  if (!isOriginAllowed(request, env)) return response(request, env, { error: 'Origin not allowed.' }, 403)

  if (path === '/api/health' && request.method === 'GET') {
    return response(request, env, { ok: true, service: 'violet-focus-api' })
  }

  if (path === '/api/auth/session' && request.method === 'POST') {
    if (!env.APP_PASSWORD || !env.SESSION_SECRET) return response(request, env, { error: 'Worker sırları henüz yapılandırılmamış.' }, 503)
    const payload = await request.json().catch(() => null) as { password?: unknown } | null
    if (typeof payload?.password !== 'string' || payload.password !== env.APP_PASSWORD) {
      return response(request, env, { error: 'Parola yanlış.' }, 401)
    }
    return response(request, env, { token: await signSession(env), expiresIn: 604800 })
  }

  if (path === '/api/push/public-key' && request.method === 'GET') {
    if (!env.VAPID_PUBLIC_KEY) return response(request, env, { error: 'Push anahtarları henüz yapılandırılmamış.' }, 503)
    return response(request, env, { publicKey: env.VAPID_PUBLIC_KEY })
  }

  const authError = await requireSession(request, env)
  if (authError) return authError

  if (path === '/api/sync' && request.method === 'GET') {
    const vault = await env.hbkd1.prepare('SELECT salt, iv, ciphertext, updated_at AS updatedAt FROM sync_vault WHERE owner = ?').bind('owner').first<{ salt: string; iv: string; ciphertext: string; updatedAt: number }>()
    return response(request, env, { vault })
  }

  if (path === '/api/sync' && request.method === 'PUT') {
    const payload: unknown = await request.json().catch(() => null)
    if (!isSyncVaultInput(payload)) return response(request, env, { error: 'Şifreli yedek biçimi geçersiz.' }, 400)
    await env.hbkd1.prepare(`INSERT INTO sync_vault (owner, salt, iv, ciphertext, updated_at) VALUES ('owner', ?, ?, ?, ?)
      ON CONFLICT(owner) DO UPDATE SET salt = excluded.salt, iv = excluded.iv, ciphertext = excluded.ciphertext, updated_at = excluded.updated_at`)
      .bind(payload.salt, payload.iv, payload.ciphertext, Date.now()).run()
    return response(request, env, { ok: true, updatedAt: Date.now() })
  }

  if (path === '/api/reminders/settings' && request.method === 'GET') {
    const settings = await env.hbkd1.prepare('SELECT quiet_start AS quietStart, quiet_end AS quietEnd, wording, privacy_mode AS privacyMode FROM reminder_settings WHERE owner = ?').bind('owner').first<{ quietStart: string; quietEnd: string; wording: 'brief' | 'task'; privacyMode: number }>()
    return response(request, env, { settings: settings ? { ...settings, privacyMode: Boolean(settings.privacyMode) } : { quietStart: '22:00', quietEnd: '08:00', wording: 'brief', privacyMode: true } })
  }

  if (path === '/api/reminders/settings' && request.method === 'PUT') {
    const payload: unknown = await request.json().catch(() => null)
    if (!isReminderSettingsInput(payload)) return response(request, env, { error: 'Hatırlatma tercihleri geçersiz.' }, 400)
    await env.hbkd1.prepare(`INSERT INTO reminder_settings (owner, quiet_start, quiet_end, wording, privacy_mode, updated_at)
      VALUES ('owner', ?, ?, ?, ?, ?) ON CONFLICT(owner) DO UPDATE SET quiet_start = excluded.quiet_start, quiet_end = excluded.quiet_end,
      wording = excluded.wording, privacy_mode = excluded.privacy_mode, updated_at = excluded.updated_at`)
      .bind(payload.quietStart, payload.quietEnd, payload.wording, payload.privacyMode ? 1 : 0, Date.now()).run()
    if (payload.privacyMode) await env.hbkd1.prepare("UPDATE tasks SET title = 'Görev zamanı.', category = 'Kişisel'").run()
    return response(request, env, { ok: true })
  }

  if (path === '/api/push/subscribe' && request.method === 'POST') {
    const payload: unknown = await request.json().catch(() => null)
    if (!isValidSubscription(payload)) return response(request, env, { error: 'Push aboneliği geçersiz.' }, 400)
    await env.hbkd1.prepare(`INSERT INTO push_subscriptions (endpoint, p256dh, auth, created_at)
      VALUES (?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`)
      .bind(payload.endpoint, payload.keys.p256dh, payload.keys.auth, Date.now()).run()
    return response(request, env, { ok: true })
  }

  if (path === '/api/push/subscribe' && request.method === 'DELETE') {
    const payload = await request.json().catch(() => null) as { endpoint?: unknown } | null
    if (typeof payload?.endpoint !== 'string') return response(request, env, { error: 'Abonelik adresi gerekli.' }, 400)
    await env.hbkd1.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(payload.endpoint).run()
    return response(request, env, { ok: true })
  }

  if (path === '/api/tasks' && request.method === 'GET') {
    const result = await env.hbkd1.prepare('SELECT id, title, category, due_at AS dueAt, duration_minutes AS durationMinutes, status FROM tasks ORDER BY due_at').all()
    return response(request, env, { tasks: result.results })
  }

  if (path === '/api/tasks' && request.method === 'POST') {
    const payload: unknown = await request.json().catch(() => null)
    if (!isTaskInput(payload)) return response(request, env, { error: 'Görev bilgileri geçersiz.' }, 400)
    const now = Date.now()
    const status = payload.status ?? 'pending'
    const nextReminderAt = status === 'pending' ? payload.dueAt : 0
    const privacy = await env.hbkd1.prepare('SELECT privacy_mode AS privacyMode FROM reminder_settings WHERE owner = ?').bind('owner').first<{ privacyMode: number }>()
    const storedTitle = privacy?.privacyMode !== 0 ? 'Görev zamanı.' : payload.title.trim()
    const storedCategory = privacy?.privacyMode !== 0 ? 'Kişisel' : payload.category ?? 'Kişisel'
    await env.hbkd1.prepare(`INSERT INTO tasks (id, title, category, due_at, duration_minutes, status, reminder_interval_minutes, next_reminder_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 5, ?, ?)
      ON CONFLICT(id) DO UPDATE SET title = excluded.title, category = excluded.category, due_at = excluded.due_at,
        duration_minutes = excluded.duration_minutes, status = excluded.status, next_reminder_at = excluded.next_reminder_at, updated_at = excluded.updated_at`)
      .bind(payload.id, storedTitle, storedCategory, payload.dueAt, payload.durationMinutes ?? 30, status, nextReminderAt, now).run()
    return response(request, env, { ok: true, id: payload.id })
  }

  const taskMatch = path.match(/^\/api\/tasks\/([^/]+)$/)
  if (taskMatch && request.method === 'DELETE') {
    const id = decodeURIComponent(taskMatch[1])
    await env.hbkd1.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run()
    return response(request, env, { ok: true })
  }

  if (taskMatch && request.method === 'PATCH') {
    const id = decodeURIComponent(taskMatch[1])
    const payload = await request.json().catch(() => null) as { status?: unknown; dueAt?: unknown } | null
    const status = payload?.status
    const now = Date.now()
    if (status === 'completed' || status === 'dismissed') {
      await env.hbkd1.prepare('UPDATE tasks SET status = ?, next_reminder_at = ?, updated_at = ? WHERE id = ?')
        .bind(status, 0, now, id).run()
    } else if ((status === 'pending' || status === 'snoozed') && typeof payload?.dueAt === 'number' && Number.isFinite(payload.dueAt)) {
      await env.hbkd1.prepare('UPDATE tasks SET status = ?, due_at = ?, next_reminder_at = ?, reminder_count = 0, updated_at = ? WHERE id = ?')
        .bind('pending', payload.dueAt, payload.dueAt, now, id).run()
    } else {
      return response(request, env, { error: 'Durum veya yeni zaman geçersiz.' }, 400)
    }
    return response(request, env, { ok: true })
  }

  return response(request, env, { error: 'Bulunamadı.' }, 404)
}

async function sendReminder(env: Env, task: { id: string; title: string; category: string }, subscription: { endpoint: string; p256dh: string; auth: string }, settings: { wording: 'brief' | 'task'; privacyMode: boolean }): Promise<number> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) throw new Error('VAPID settings are missing')
  const pushSubscription: WebPushSubscription = {
    endpoint: subscription.endpoint,
    expirationTime: null,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  }
  const vapid: VapidKeys = { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY }
  const payload = await buildPushPayload({
    data: JSON.stringify({ title: 'Violet Focus', body: settings.privacyMode || settings.wording === 'brief' ? 'Görev zamanı.' : task.title, taskId: task.id, url: `/?reminderTask=${encodeURIComponent(task.id)}` }),
    options: { ttl: 300 },
  }, pushSubscription, vapid)
  const pushResponse = await fetch(pushSubscription.endpoint, payload)
  return pushResponse.status
}

function isInQuietHours(now: Date, start: string, end: string): boolean {
  if (start === end) return false
  const local = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)
  const current = Number(local.slice(0, 2)) * 60 + Number(local.slice(3, 5))
  const from = Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5))
  const to = Number(end.slice(0, 2)) * 60 + Number(end.slice(3, 5))
  return from < to ? current >= from && current < to : current >= from || current < to
}

async function processDueReminders(env: Env): Promise<void> {
  const now = Date.now()
  const configured = await env.hbkd1.prepare('SELECT quiet_start AS quietStart, quiet_end AS quietEnd, wording, privacy_mode AS privacyMode FROM reminder_settings WHERE owner = ?').bind('owner').first<{ quietStart: string; quietEnd: string; wording: 'brief' | 'task'; privacyMode: number }>()
  const settings = configured ? { ...configured, privacyMode: Boolean(configured.privacyMode) } : { quietStart: '22:00', quietEnd: '08:00', wording: 'brief' as const, privacyMode: true }
  if (isInQuietHours(new Date(now), settings.quietStart, settings.quietEnd)) return
  const dueTasks = await env.hbkd1.prepare(`SELECT id, title, category, reminder_interval_minutes AS intervalMinutes
    FROM tasks WHERE status = 'pending' AND next_reminder_at <= ? ORDER BY next_reminder_at LIMIT 50`).bind(now).all<{
      id: string; title: string; category: string; intervalMinutes: number
    }>()
  if (!dueTasks.results.length) return

  const subscriptions = await env.hbkd1.prepare('SELECT endpoint, p256dh, auth FROM push_subscriptions').all<{
    endpoint: string; p256dh: string; auth: string
  }>()
  if (!subscriptions.results.length) return

  for (const task of dueTasks.results) {
    // Claim each due task before sending so overlapping cron runs cannot duplicate a reminder.
    const claim = await env.hbkd1.prepare(`UPDATE tasks SET next_reminder_at = ?, reminder_count = reminder_count + 1, updated_at = ?
      WHERE id = ? AND status = 'pending' AND next_reminder_at <= ?`)
      .bind(now + task.intervalMinutes * 60_000, now, task.id, now).run()
    if (!claim.meta.changes) continue

    for (const subscription of subscriptions.results) {
      try {
        const status = await sendReminder(env, task, subscription, settings)
        if (status === 404 || status === 410) {
          await env.hbkd1.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(subscription.endpoint).run()
        } else if (status < 200 || status >= 300) {
          console.warn('Push service returned a non-success status', status)
        }
      } catch (error) {
        console.error('Push delivery failed', error)
      }
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env)
    } catch (error) {
      console.error('Request failed', error)
      return response(request, env, { error: 'Sunucu isteği işleyemedi.' }, 500)
    }
  },
  scheduled(_event: ScheduledController, env: Env, context: ExecutionContext): void {
    context.waitUntil(processDueReminders(env))
  },
}
