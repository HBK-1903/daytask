export type QuickTaskDraft = { title: string; date: string; time: string; hasDate: boolean; hasTime: boolean }

const weekdayIndexes: Record<string, number> = {
  pazartesi: 1, pzt: 1, salı: 2, sal: 2, çarşamba: 3, çar: 3, perşembe: 4, per: 4,
  cuma: 5, cum: 5, cumartesi: 6, cmt: 6, pazar: 0, paz: 0,
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function parseQuickTaskInput(input: string, baseDate = new Date()): QuickTaskDraft {
  let title = input.trim()
  let target = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())
  let hasDate = false
  const relative = /\b(öbür\s+gün|yarın|bugün)\b/i.exec(title)
  if (relative) {
    const token = relative[1].toLocaleLowerCase('tr-TR')
    target.setDate(target.getDate() + (token === 'bugün' ? 0 : token.startsWith('öbür') ? 2 : 1))
    title = title.replace(relative[0], ' ')
    hasDate = true
  } else {
    const explicitDate = /\b(\d{1,2})[./-](\d{1,2})(?:[./-](\d{4}))?\b/.exec(title)
    if (explicitDate) {
      const year = explicitDate[3] ? Number(explicitDate[3]) : baseDate.getFullYear()
      const month = Number(explicitDate[2])
      const day = Number(explicitDate[1])
      const candidate = new Date(year, month - 1, day)
      if (candidate.getFullYear() === year && candidate.getMonth() === month - 1 && candidate.getDate() === day) {
        target = candidate
        title = title.replace(explicitDate[0], ' ')
        hasDate = true
      }
    }
  }
  if (!hasDate) {
    const weekday = /\b(pazartesi|pzt|salı|sal|çarşamba|çar|perşembe|per|cuma|cum|cumartesi|cmt|pazar|paz)\b/i.exec(title)
    if (weekday) {
      const wanted = weekdayIndexes[weekday[1].toLocaleLowerCase('tr-TR')]
      const delta = (wanted - target.getDay() + 7) % 7 || 7
      target.setDate(target.getDate() + delta)
      title = title.replace(weekday[0], ' ')
      hasDate = true
    }
  }
  const timeMatch = /\b(?:saat\s*)?(\d{1,2})(?:[:.](\d{2}))\b|\bsaat\s*(\d{1,2})\b/i.exec(title)
  let time = '18:00'
  let hasTime = false
  if (timeMatch) {
    const hours = Number(timeMatch[1] ?? timeMatch[3])
    const minutes = Number(timeMatch[2] ?? 0)
    if (hours < 24 && minutes < 60) {
      time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      title = title.replace(timeMatch[0], ' ')
      hasTime = true
    }
  }
  title = title.replace(/\bsaat\b/gi, ' ').replace(/\s+/g, ' ').trim()
  return { title, date: dateKey(target), time, hasDate, hasTime }
}
