import test from 'node:test'
import assert from 'node:assert/strict'
import { constantTimeEqual, generateRecoveryCode, hashCredential, incrementRateLimit, isValidNewPassword, signCapabilityToken, normalizeEmail, normalizeRecoveryCode } from '../src/auth.ts'

test('email normalization trims spaces and uses a stable case-insensitive identifier', () => {
  assert.equal(normalizeEmail('  Sample.User@Example.com '), 'sample.user@example.com')
  assert.equal(normalizeEmail('invalid-email'), null)
  assert.equal(normalizeEmail('a@b'), null)
})

test('new passwords enforce the minimum length and reject control characters', () => {
  assert.equal(isValidNewPassword('a-safe-long-password'), true)
  assert.equal(isValidNewPassword('too-short'), false)
  assert.equal(isValidNewPassword(`long-enough\npassword`), false)
})

test('recovery codes are high-entropy 64-character hex strings and normalize pasted separators', () => {
  const code = generateRecoveryCode()
  assert.match(code, /^[A-F0-9]{64}$/)
  assert.equal(normalizeRecoveryCode(`${code.slice(0, 32)}-${code.slice(32)}`), code)
  assert.equal(normalizeRecoveryCode('not-a-recovery-code'), null)
})

test('password and recovery credential hashes use per-credential salts', async () => {
  const first = await hashCredential('a-long-private-password')
  const second = await hashCredential('a-long-private-password')
  assert.notEqual(first.salt, second.salt)
  assert.notEqual(first.hash, second.hash)
  const retry = await hashCredential('a-long-private-password', first.salt)
  const wrong = await hashCredential('a-different-password', first.salt)
  assert.equal(constantTimeEqual(first.hash, retry.hash), true)
  assert.equal(constantTimeEqual(first.hash, wrong.hash), false)
  assert.equal(constantTimeEqual(first.hash, `${first.hash}x`), false)
})

test('reminder action tokens are keyed capabilities bound to a specific task and nonce', async () => {
  const a = await signCapabilityToken('local-session-secret', 'reminder', 'task-1', 'nonce-a')
  const same = await signCapabilityToken('local-session-secret', 'reminder', 'task-1', 'nonce-a')
  const otherNonce = await signCapabilityToken('local-session-secret', 'reminder', 'task-1', 'nonce-b')
  const otherTask = await signCapabilityToken('local-session-secret', 'reminder', 'task-2', 'nonce-a')
  assert.equal(a, same)
  assert.notEqual(a, otherNonce)
  assert.notEqual(a, otherTask)
})

test('rate limiting increments a fixed window and resets at the next window', async () => {
  const db = new FakeD1()
  assert.equal(await incrementRateLimit(db, 'hashed-bucket', 1_000, 60_000), 1)
  assert.equal(await incrementRateLimit(db, 'hashed-bucket', 20_000, 60_000), 2)
  assert.equal(await incrementRateLimit(db, 'hashed-bucket', 61_000, 60_000), 1)
})

class FakeD1 {
  rows = new Map()
  prepare(sql) {
    let values = []
    return {
      bind: (...args) => { values = args; return this.prepareBound(sql, () => values) },
    }
  }
  prepareBound(sql, getValues) {
    return {
      run: async () => {
        const [bucket, windowStart] = getValues()
        const previous = this.rows.get(bucket)
        this.rows.set(bucket, { windowStart, attempts: previous?.windowStart === windowStart ? previous.attempts + 1 : 1 })
        return { success: true }
      },
      first: async () => this.rows.get(getValues()[0]) ?? null,
    }
  }
}
