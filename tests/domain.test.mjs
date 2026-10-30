import test from 'node:test'
import assert from 'node:assert/strict'
import { getElapsedSeconds, getHabitWeekMetrics, getReminderSyncFailure, getSnoozeDate, isTaskCountableForAnalytics } from '../.test-dist/domain.js'

test('weekly habit progress is derived from unique check dates and its own target', () => {
  const result = getHabitWeekMetrics(['2026-10-26', '2026-10-26', '2026-10-28', '2026-10-20'], 4, ['2026-10-26', '2026-10-27', '2026-10-28'])
  assert.deepEqual(result, { checkCount: 2, target: 4, progress: 50 })
})

test('habit progress is capped and invalid targets use a safe default', () => {
  assert.deepEqual(getHabitWeekMetrics(['2026-10-26', '2026-10-27'], 1, ['2026-10-26', '2026-10-27']), { checkCount: 2, target: 1, progress: 100 })
  assert.deepEqual(getHabitWeekMetrics([], 0, []), { checkCount: 0, target: 7, progress: 0 })
})

test('snooze starts from the current time and crosses midnight correctly', () => {
  const now = new Date(2026, 9, 30, 23, 55, 0)
  const later = getSnoozeDate(now, 10)
  assert.equal(later.getDate(), 31)
  assert.equal(later.getHours(), 0)
  assert.equal(later.getMinutes(), 5)
})

test('elapsed timer time catches up after a delayed browser tick', () => {
  assert.equal(getElapsedSeconds(10_000, 702_000, 23), 715)
  assert.equal(getElapsedSeconds(20_000, 10_000, 0), 0)
})

test('reminder sync reports rejected and non-2xx requests but accepts a full success set', () => {
  assert.equal(getReminderSyncFailure([{ status: 'fulfilled', value: { ok: true, status: 200 } }]), null)
  assert.equal(getReminderSyncFailure([{ status: 'fulfilled', value: { ok: false, status: 503 } }]), 'Worker isteği başarısız (HTTP 503).')
  assert.equal(getReminderSyncFailure([{ status: 'rejected', reason: new Error('offline') }]), 'Bağlantı kurulamadı.')
})

test('analytics completion excludes future tasks but includes completed early tasks', () => {
  const now = new Date(2026, 9, 30, 14, 0, 0)
  const dates = ['2026-10-30', '2026-10-31']
  assert.equal(isTaskCountableForAnalytics({ date: '2026-10-30', time: '13:00', done: false }, dates, '2026-10-30', now), true)
  assert.equal(isTaskCountableForAnalytics({ date: '2026-10-30', time: '15:00', done: false }, dates, '2026-10-30', now), false)
  assert.equal(isTaskCountableForAnalytics({ date: '2026-10-31', time: '10:00', done: true }, dates, '2026-10-30', now), true)
  assert.equal(isTaskCountableForAnalytics({ date: '2026-11-01', time: '10:00', done: true }, dates, '2026-10-30', now), false)
})
