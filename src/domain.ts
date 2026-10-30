export type HabitWeekMetrics = { checkCount: number; target: number; progress: number }

export function isHabitScheduledOnWeekday(frequencyMode: 'weekly' | 'selectedDays' | undefined, scheduledDays: number[] | undefined, weekday: number): boolean {
  if (frequencyMode !== 'selectedDays' || !scheduledDays?.length) return true
  return scheduledDays.includes(weekday)
}

export type HabitCalendarState = 'completed' | 'missed' | 'today' | 'upcoming' | 'flexible' | 'off'

export function getHabitCalendarState(date: string, todayKey: string, isCompleted: boolean, frequencyMode: 'weekly' | 'selectedDays' | undefined, scheduledDays: number[] | undefined): HabitCalendarState {
  if (isCompleted) return 'completed'
  if (frequencyMode !== 'selectedDays' || !scheduledDays?.length) return 'flexible'
  const weekday = (new Date(`${date}T00:00:00`).getDay() + 6) % 7 + 1
  if (!scheduledDays.includes(weekday)) return 'off'
  if (date === todayKey) return 'today'
  return date < todayKey ? 'missed' : 'upcoming'
}

export function getHabitWeekMetrics(checkDates: string[], weeklyTarget: number, weekKeys: string[]): HabitWeekMetrics {
  const includedDays = new Set(weekKeys)
  const checkCount = new Set(checkDates.filter((date) => includedDays.has(date))).size
  const target = Number.isFinite(weeklyTarget) && weeklyTarget > 0 ? Math.floor(weeklyTarget) : 7
  return { checkCount, target, progress: Math.min(100, Math.round(checkCount / target * 100)) }
}

export function getSnoozeDate(now: Date, minutes = 10): Date {
  return new Date(now.getTime() + Math.max(0, minutes) * 60_000)
}

export function getElapsedSeconds(startedAtMs: number, nowMs: number, baseSeconds = 0): number {
  return Math.max(0, baseSeconds + Math.floor((nowMs - startedAtMs) / 1000))
}

export type AnalyticsTask = { date?: string; time: string; done: boolean }

export function isTaskCountableForAnalytics(task: AnalyticsTask, periodKeys: string[], todayKey: string, now: Date): boolean {
  const taskDate = task.date ?? todayKey
  if (!periodKeys.includes(taskDate)) return false
  if (task.done) return true
  const dueAt = new Date(`${taskDate}T${task.time}:00`).getTime()
  return Number.isFinite(dueAt) && dueAt <= now.getTime()
}

export function getReminderSyncFailure(results: PromiseSettledResult<{ ok: boolean; status: number }>[]): string | null {
  const failed = results.find((result) => result.status === 'rejected' || !result.value.ok)
  if (!failed) return null
  return failed.status === 'rejected' ? 'Bağlantı kurulamadı.' : `Worker isteği başarısız (HTTP ${failed.value.status}).`
}
