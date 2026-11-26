export type RepeatRule = 'none' | 'daily' | 'weekly' | 'monthly'

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function getNextOccurrenceDate(taskDate: string, rule: Exclude<RepeatRule, 'none'>, completedAtMs: number, monthDayAnchor?: number): string {
  const [year, month, day] = taskDate.split('-').map(Number)
  const base = new Date(year, month - 1, day, 12)
  const anchor = monthDayAnchor && monthDayAnchor >= 1 && monthDayAnchor <= 31 ? monthDayAnchor : day
  const completion = new Date(completedAtMs)
  const completionDay = new Date(completion.getFullYear(), completion.getMonth(), completion.getDate(), 12)
  let next = new Date(base)
  const advance = () => {
    if (rule === 'daily') next.setDate(next.getDate() + 1)
    else if (rule === 'weekly') next.setDate(next.getDate() + 7)
    else {
      const targetMonth = next.getMonth() + 1
      const targetYear = next.getFullYear() + Math.floor(targetMonth / 12)
      const normalizedMonth = targetMonth % 12
      const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate()
      next = new Date(targetYear, normalizedMonth, Math.min(anchor, lastDay), 12)
    }
  }
  advance()
  let guard = 0
  while (next <= completionDay && guard < 1000) { advance(); guard += 1 }
  return localDateKey(next)
}

export function shiftDateByDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12)
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}
