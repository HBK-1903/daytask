const encoder = new TextEncoder()
const PASSWORD_ITERATIONS = 210_000
export const ACCOUNT_SESSION_LIFETIME_MS = 35 * 24 * 60 * 60_000
export const ACCOUNT_SESSION_RENEWAL_MS = 25 * 24 * 60 * 60_000

export function isSessionRenewalDue(issuedAtSeconds: number | undefined, nowMs = Date.now()): boolean {
  if (typeof issuedAtSeconds !== 'number' || !Number.isFinite(issuedAtSeconds)) return true
  return nowMs - issuedAtSeconds * 1000 >= ACCOUNT_SESSION_RENEWAL_MS
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return email
}

export function isValidNewPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 12 && value.length <= 128 && !/[\u0000-\u001f\u007f]/.test(value)
}

export function normalizeRecoveryCode(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.replace(/[\s-]/g, '').toUpperCase()
  return /^[0-9A-F]{64}$/.test(normalized) ? normalized : null
}

export function generateRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()
}

export async function hashCredential(value: string, saltValue?: string): Promise<{ salt: string; hash: string }> {
  const saltBytes = saltValue ? fromBase64Url(saltValue) : crypto.getRandomValues(new Uint8Array(16))
  const salt = saltValue ?? toBase64Url(saltBytes)
  const saltBuffer = new Uint8Array(saltBytes.length)
  saltBuffer.set(saltBytes)
  const material = await crypto.subtle.importKey('raw', encoder.encode(value), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBuffer.buffer, iterations: PASSWORD_ITERATIONS, hash: 'SHA-256' }, material, 256)
  return { salt, hash: toBase64Url(new Uint8Array(bits)) }
}

export function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length)
  let difference = left.length ^ right.length
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0)
  }
  return difference === 0
}

export async function signCapabilityToken(secret: string, purpose: string, subject: string, nonce: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${purpose}:${subject}:${nonce}`))
  return toBase64Url(new Uint8Array(signature))
}

export async function makeRateLimitBucket(secret: string, scope: string, address: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${scope}:${address}`))
  return toBase64Url(new Uint8Array(signature))
}

export async function incrementRateLimit(db: D1Database, bucket: string, now: number, windowMs: number): Promise<number> {
  const windowStart = Math.floor(now / windowMs) * windowMs
  await db.prepare(`INSERT INTO auth_attempts (bucket, window_start, attempts) VALUES (?, ?, 1)
    ON CONFLICT(bucket) DO UPDATE SET window_start = excluded.window_start,
    attempts = CASE WHEN auth_attempts.window_start = excluded.window_start THEN auth_attempts.attempts + 1 ELSE 1 END`)
    .bind(bucket, windowStart).run()
  const row = await db.prepare('SELECT attempts FROM auth_attempts WHERE bucket = ?').bind(bucket).first<{ attempts: number }>()
  return row?.attempts ?? 1
}
