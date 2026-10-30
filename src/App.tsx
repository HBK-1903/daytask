import { useEffect, useMemo, useRef, useState } from 'react'
import { getElapsedSeconds, getHabitCalendarState, getHabitWeekMetrics, getReminderSyncFailure, getSnoozeDate, isHabitScheduledOnWeekday, isTaskCountableForAnalytics } from './domain'
import {
  AlarmClock, ArrowRight, ArrowDownToLine, Upload, Bell, BookOpen, CalendarDays,
  Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3,
  Flame, Flower2, Focus, LayoutGrid, Menu, MoreHorizontal, Pause,
  Play, Plus, Search, Pencil, Trash2, Undo2, ShieldCheck, Settings2, Sparkles, Target, TrendingUp, X, Zap,
} from 'lucide-react'

type Tab = 'Şimdi' | 'Takvim' | 'Alışkanlıklar' | 'Öğrenme' | 'Analiz'
type Task = { id: number; title: string; category: string; time: string; duration: number; done: boolean; archived?: boolean; color: string; icon: string; date?: string; createdAt?: number; completedAt?: number; isExample?: boolean; priority?: 'low' | 'normal' | 'high'; energy?: 'light' | 'steady' | 'deep'; notes?: string }
type Habit = { id: number; name: string; detail: string; icon: string; progress: number; checked: boolean; checkDates?: string[]; weeklyTarget?: number; frequencyMode?: 'weekly' | 'selectedDays'; scheduledDays?: number[]; isExample?: boolean }
type FocusSession = { id: number; date: string; seconds: number; category: string; taskTitle: string; endedAt: number }
type ManualStudyLog = { id: number; title: string; date: string; minutes: number; note: string; goalId?: number; loggedAt: number }
type LearningMilestone = { id: number; title: string; done: boolean; completedAt?: number }
type LearningGoal = { id: number; title: string; description: string; milestones: LearningMilestone[]; createdAt: number }
type UndoAction = { kind: 'delete' | 'snooze'; task: Task }
type PendingMove = { taskId: number; targetDate: string; originalDate: string; originalTime: string; targetTime?: string }
type CalendarView = 'week' | 'month'
type TaskSuggestion = { taskId: number; time: string; reason: string }
type PomodoroKey = '25-5' | '45-10' | '50-10'
type BackupData = { format: 'violet-focus-backup-v1'; tasks: Task[]; habits: Habit[]; focusSessions: FocusSession[]; manualStudyLogs: ManualStudyLog[]; learningGoals: LearningGoal[]; customCategories?: string[]; profile?: { name: string; gamificationEnabled: boolean; avatarDataUrl?: string; avatarTheme?: 'lavender' | 'violet' | 'rose' | 'sky' }; settings?: { pomodoroKey?: PomodoroKey; availableMinutes?: number; recommendationEnergy?: 'light' | 'steady' | 'deep' } }
type EncryptedVault = { salt: string; iv: string; ciphertext: string; updatedAt?: number }
const pomodoroPresets: { key: PomodoroKey; label: string; focus: number; rest: number }[] = [
  { key: '25-5', label: 'Kısa', focus: 25, rest: 5 },
  { key: '45-10', label: 'Standart', focus: 45, rest: 10 },
  { key: '50-10', label: 'Uzun', focus: 50, rest: 10 },
]
const initialTasks: Task[] = [
  { id: 1, title: 'İngilizce listening pratiği', category: 'Öğrenme', time: '10:00', duration: 45, done: false, color: 'violet', icon: 'book', date: dateKey(new Date()), isExample: true },
  { id: 2, title: 'Kısa yürüyüş ve temiz hava', category: 'Sağlık', time: '11:15', duration: 30, done: false, color: 'mint', icon: 'flower', date: dateKey(new Date()), isExample: true },
  { id: 3, title: 'Proje için fikirleri toparla', category: 'Kişisel', time: '13:00', duration: 60, done: false, color: 'peach', icon: 'target', date: dateKey(new Date()), isExample: true },
  { id: 4, title: 'Bir bölüm kitap oku', category: 'Hobiler', time: '16:30', duration: 25, done: true, color: 'blue', icon: 'book', date: dateKey(new Date()), completedAt: Date.now(), isExample: true },
]
const initialHabits: Habit[] = [
  { id: 1, name: 'Su iç', detail: 'Günlük · 6 / 8 bardak', icon: 'drop', progress: 75, checked: false, weeklyTarget: 7, checkDates: [], isExample: true },
  { id: 2, name: 'Kitap oku', detail: 'Günlük · 20 dakika', icon: 'book', progress: 100, checked: true, weeklyTarget: 7, checkDates: [dateKey(new Date())], isExample: true },
  { id: 3, name: 'Esneme', detail: 'Haftada 4 kez · 2 / 4', icon: 'spark', progress: 50, checked: false, weeklyTarget: 4, checkDates: [], isExample: true },
]
const navItems: { label: Tab; icon: typeof Focus }[] = [
  { label: 'Şimdi', icon: Focus }, { label: 'Takvim', icon: CalendarDays },
  { label: 'Alışkanlıklar', icon: Flower2 }, { label: 'Öğrenme', icon: BookOpen }, { label: 'Analiz', icon: LayoutGrid },
]
const week = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const taskCategories: { label: string; icon: typeof Focus; tone: string; description: string }[] = [
  { label: 'Öğrenme', icon: BookOpen, tone: 'violet', description: 'Ders, okuma veya yeni bir beceri' },
  { label: 'Sağlık', icon: Flower2, tone: 'mint', description: 'Hareket, dinlenme ve öz bakım' },
  { label: 'İş/Okul', icon: Target, tone: 'blue', description: 'İş teslimi, ders veya toplantı' },
  { label: 'Hobiler', icon: Sparkles, tone: 'peach', description: 'Yaratıcılık ve keyif zamanı' },
  { label: 'Kişisel', icon: Focus, tone: 'lilac', description: 'Kişisel işler ve hedefler' },
  { label: 'Ev', icon: CalendarDays, tone: 'gold', description: 'Ev işleri ve günlük düzen' },
]
const durationChoices = [15, 25, 30, 45, 60, 90]
const priorityChoices = [
  { value: 'low', label: 'Esnek', note: 'Uygun olduğunda', icon: Sparkles },
  { value: 'normal', label: 'Normal', note: 'Günlük akışta', icon: CalendarDays },
  { value: 'high', label: 'Öncelikli', note: 'Önce bunu ele al', icon: Zap },
] as const
const energyChoices = [
  { value: 'light', label: 'Hafif', note: 'Düşük efor', icon: Flower2 },
  { value: 'steady', label: 'Dengeli', note: 'Orta efor', icon: Focus },
  { value: 'deep', label: 'Derin odak', note: 'Kesintisiz çalışma', icon: Zap },
] as const
function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function readStored<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) as T : fallback
  } catch {
    return fallback
  }
}
function parseBackup(value: unknown): BackupData {
  if (!value || typeof value !== 'object') throw new Error('Yedek yapısı tanınmadı.')
  const backup = value as Partial<BackupData>
  if (backup.format !== 'violet-focus-backup-v1' || !Array.isArray(backup.tasks) || !Array.isArray(backup.habits) || !Array.isArray(backup.focusSessions) || !Array.isArray(backup.manualStudyLogs) || !Array.isArray(backup.learningGoals)) throw new Error('Yedek yapısı tanınmadı.')
  if (backup.customCategories !== undefined && (!Array.isArray(backup.customCategories) || backup.customCategories.some((category) => typeof category !== 'string' || category.length > 24))) throw new Error('Özel kategoriler geçersiz.')
  if (backup.profile !== undefined && (!backup.profile || typeof backup.profile.name !== 'string' || typeof backup.profile.gamificationEnabled !== 'boolean' || (backup.profile.avatarDataUrl !== undefined && (typeof backup.profile.avatarDataUrl !== 'string' || backup.profile.avatarDataUrl.length > 400_000 || !backup.profile.avatarDataUrl.startsWith('data:image/jpeg;base64,'))) || (backup.profile.avatarTheme !== undefined && !['lavender', 'violet', 'rose', 'sky'].includes(backup.profile.avatarTheme)))) throw new Error('Profil bilgileri geçersiz.')
  if (backup.tasks.some((task) => !task || typeof task.id !== 'number' || typeof task.title !== 'string' || typeof task.category !== 'string' || typeof task.time !== 'string' || typeof task.duration !== 'number' || typeof task.done !== 'boolean') || backup.habits.some((habit) => !habit || typeof habit.id !== 'number' || typeof habit.name !== 'string' || !Array.isArray(habit.checkDates ?? [])) || backup.focusSessions.some((session) => !session || typeof session.id !== 'number' || typeof session.seconds !== 'number' || typeof session.date !== 'string') || backup.manualStudyLogs.some((log) => !log || typeof log.id !== 'number' || typeof log.title !== 'string' || typeof log.minutes !== 'number' || typeof log.date !== 'string') || backup.learningGoals.some((goal) => !goal || typeof goal.id !== 'number' || typeof goal.title !== 'string' || !Array.isArray(goal.milestones))) throw new Error('Yedekteki bazı kayıtlar geçersiz.')
  return backup as BackupData
}
function toBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}
function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}
async function deriveSyncKey(passphrase: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}
function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}
function formatDuration(seconds: number) {
  if (seconds === 0) return '0 dk'
  if (seconds < 60) return `${seconds} sn`
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  return hours ? `${hours} sa ${minutes % 60} dk` : `${minutes} dk`
}
function longestStreak(dateKeys: string[]) {
  const days = [...new Set(dateKeys)].sort()
  let longest = 0
  let current = 0
  let previous: Date | undefined
  days.forEach((key) => {
    const day = new Date(`${key}T00:00:00`)
    if (previous) {
      const expected = new Date(previous)
      expected.setDate(expected.getDate() + 1)
      current = dateKey(expected) === key ? current + 1 : 1
    } else current = 1
    longest = Math.max(longest, current)
    previous = day
  })
  return longest
}

function App() {
  const importInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<Tab>('Şimdi')
  const [tasks, setTasks] = useState<Task[]>(() => readStored<Task[]>('vf-tasks', initialTasks).map((task) => ({ ...task, date: task.date ?? dateKey(new Date()) })))
  const [habits, setHabits] = useState<Habit[]>(() => {
    const today = dateKey(new Date())
    return readStored<Habit[]>('vf-habits', initialHabits).map((habit) => {
      const checkDates = habit.checkDates ?? (habit.checked ? [today] : [])
      return { ...habit, checkDates, checked: checkDates.includes(today) }
    })
  })
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>(() => readStored<FocusSession[]>('vf-focus-sessions', []))
  const [manualStudyLogs, setManualStudyLogs] = useState<ManualStudyLog[]>(() => readStored<ManualStudyLog[]>('vf-study-logs', []))
  const [learningGoals, setLearningGoals] = useState<LearningGoal[]>(() => readStored<LearningGoal[]>('vf-learning-goals', []))
  const [focusTaskId, setFocusTaskId] = useState<number | null>(null)
  const [profileName, setProfileName] = useState<string>(() => { const saved = readStored<unknown>('vf-profile-name', 'Benim alanım'); return typeof saved === 'string' && saved.trim() ? saved.slice(0, 32) : 'Benim alanım' })
  const [profileAvatar, setProfileAvatar] = useState<string | null>(() => { const saved = readStored<unknown>('vf-profile-avatar', null); return typeof saved === 'string' && saved.startsWith('data:image/jpeg;base64,') && saved.length <= 400_000 ? saved : null })
  const [profileAvatarTheme, setProfileAvatarTheme] = useState<'lavender' | 'violet' | 'rose' | 'sky'>(() => { const saved = readStored<unknown>('vf-profile-avatar-theme', 'lavender'); return ['lavender', 'violet', 'rose', 'sky'].includes(String(saved)) ? saved as 'lavender' | 'violet' | 'rose' | 'sky' : 'lavender' })
  const [gamificationEnabled, setGamificationEnabled] = useState<boolean>(() => readStored<unknown>('vf-gamification-enabled', false) === true)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileNameDraft, setProfileNameDraft] = useState('')
  const [profileAvatarDraft, setProfileAvatarDraft] = useState<string | null>(null)
  const [profileAvatarThemeDraft, setProfileAvatarThemeDraft] = useState<'lavender' | 'violet' | 'rose' | 'sky'>('lavender')
  const profileImageInputRef = useRef<HTMLInputElement>(null)
  const [profileGamificationDraft, setProfileGamificationDraft] = useState(false)
  const [availableMinutes, setAvailableMinutes] = useState(() => readStored('vf-available-minutes', 30))
  const [recommendationEnergy, setRecommendationEnergy] = useState<'light' | 'steady' | 'deep'>(() => readStored('vf-recommendation-energy', 'steady'))
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerPhase, setTimerPhase] = useState<'focus' | 'breakReady' | 'break'>('focus')
  const [pomodoroElapsed, setPomodoroElapsed] = useState(0)
  const [pomodoroKey, setPomodoroKey] = useState<PomodoroKey>(() => readStored<PomodoroKey>('vf-pomodoro-key', '25-5'))
  const [seconds, setSeconds] = useState(0)
  const timerSegmentStartedAtRef = useRef<number | null>(null)
  const timerSegmentBaseSecondsRef = useRef(0)
  const pomodoroSegmentBaseSecondsRef = useRef(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null)
  const [habitModalOpen, setHabitModalOpen] = useState(false)
  const [editingHabitId, setEditingHabitId] = useState<number | null>(null)
  const [habitScheduleMode, setHabitScheduleMode] = useState<'weekly' | 'selectedDays'>('weekly')
  const [habitSelectedDays, setHabitSelectedDays] = useState<number[]>([])
  const [habitCalendarId, setHabitCalendarId] = useState<number | 'all'>('all')
  const [overdueReviewExpanded, setOverdueReviewExpanded] = useState(false)
  const [clockNow, setClockNow] = useState(() => Date.now())
  const [studyLogModalOpen, setStudyLogModalOpen] = useState(false)
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [studyLogTitle, setStudyLogTitle] = useState('')
  const [studyLogMinutes, setStudyLogMinutes] = useState(30)
  const [studyLogDate, setStudyLogDate] = useState(() => dateKey(new Date()))
  const [studyLogNote, setStudyLogNote] = useState('')
  const [studyLogGoalId, setStudyLogGoalId] = useState('')
  const [goalTitle, setGoalTitle] = useState('')
  const [goalDescription, setGoalDescription] = useState('')
  const [goalFirstMilestone, setGoalFirstMilestone] = useState('')
  const [milestoneDrafts, setMilestoneDrafts] = useState<Record<number, string>>({})
  const [taskName, setTaskName] = useState('')
  const [taskDate, setTaskDate] = useState(() => dateKey(new Date()))
  const [taskTime, setTaskTime] = useState('18:00')
  const [taskCategory, setTaskCategory] = useState('Kişisel')
  const [taskDuration, setTaskDuration] = useState(30)
  const [taskPriority, setTaskPriority] = useState<'low' | 'normal' | 'high'>('normal')
  const [taskEnergy, setTaskEnergy] = useState<'light' | 'steady' | 'deep'>('steady')
  const [taskNotes, setTaskNotes] = useState('')
  const [plannerStep, setPlannerStep] = useState<1 | 2>(1)
  const [habitName, setHabitName] = useState('')
  const [habitWeeklyTarget, setHabitWeeklyTarget] = useState(7)
  const [toast, setToast] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()))
  const [calendarAnchor, setCalendarAnchor] = useState(() => dateKey(new Date()))
  const [calendarView, setCalendarView] = useState<CalendarView>('week')
  const [suggestionOpen, setSuggestionOpen] = useState(false)
  const [taskSuggestions, setTaskSuggestions] = useState<TaskSuggestion[]>([])
  const [analysisPeriod, setAnalysisPeriod] = useState<'week' | '4weeks'>('week')
  const [analysisDetailOpen, setAnalysisDetailOpen] = useState(false)
  const [moveSelectionTaskId, setMoveSelectionTaskId] = useState<number | null>(null)
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null)
  const [remindersOn, setRemindersOn] = useState(() => readStored('vf-reminders-enabled', false))
  const [reminderSyncState, setReminderSyncState] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle')
  const [reminderSyncError, setReminderSyncError] = useState('')
  const [reminderSyncAttempt, setReminderSyncAttempt] = useState(0)
  const syncedReminderIdsRef = useRef<number[]>(readStored('vf-reminder-task-ids', []))
  const [customCategories, setCustomCategories] = useState<string[]>(() => readStored('vf-custom-categories', []))
  const [customCategoryDraft, setCustomCategoryDraft] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [syncApiUrl, setSyncApiUrl] = useState(() => readStored('vf-sync-api', 'https://daytask.hasanbekirk02.workers.dev'))
  const [syncToken, setSyncToken] = useState(() => readStored('vf-sync-token', ''))
  const [syncPassword, setSyncPassword] = useState('')
  const [syncPassphrase, setSyncPassphrase] = useState('')
  const [syncStatus, setSyncStatus] = useState('')
  const [quietStart, setQuietStart] = useState('22:00')
  const [quietEnd, setQuietEnd] = useState('08:00')
  const [reminderWording, setReminderWording] = useState<'brief' | 'task'>('brief')
  const [privacyMode, setPrivacyMode] = useState(true)

  const availableCategories = useMemo(() => [...taskCategories, ...customCategories.map((label) => ({ label, icon: Focus, tone: 'lilac', description: 'Özel kategori' }))], [customCategories])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const action = params.get('action')
    const reminderTaskId = params.get('reminderTask')
    if (action === 'add-task') openNewTaskModal()
    else if (action === 'calendar') setActiveTab('Takvim')
    else if (action === 'start-focus') { setActiveTab('Şimdi'); setTimerPhase('focus'); setSeconds(0); setPomodoroElapsed(0); timerSegmentBaseSecondsRef.current = 0; pomodoroSegmentBaseSecondsRef.current = 0; timerSegmentStartedAtRef.current = Date.now(); setTimerRunning(true) }
    else if (reminderTaskId) {
      const task = tasks.find((item) => String(item.id) === reminderTaskId)
      setActiveTab('Takvim')
      if (task) { setSelectedDay(task.date ?? todayKey); setCalendarAnchor(task.date ?? todayKey) }
      else setToast('Hatırlatmanın görevi bu cihazda bulunamadı; eşitleme durumunu kontrol et.')
    }
    if (action || reminderTaskId) window.history.replaceState({}, '', window.location.pathname)
  }, [])
  useEffect(() => { localStorage.setItem('vf-tasks', JSON.stringify(tasks)) }, [tasks])
  useEffect(() => { localStorage.setItem('vf-profile-name', JSON.stringify(profileName)) }, [profileName])
  useEffect(() => { if (profileAvatar) localStorage.setItem('vf-profile-avatar', JSON.stringify(profileAvatar)); else localStorage.removeItem('vf-profile-avatar') }, [profileAvatar])
  useEffect(() => { localStorage.setItem('vf-profile-avatar-theme', JSON.stringify(profileAvatarTheme)) }, [profileAvatarTheme])
  useEffect(() => { localStorage.setItem('vf-gamification-enabled', JSON.stringify(gamificationEnabled)) }, [gamificationEnabled])
  useEffect(() => { localStorage.setItem('vf-custom-categories', JSON.stringify(customCategories)) }, [customCategories])
  useEffect(() => { localStorage.setItem('vf-sync-api', JSON.stringify(syncApiUrl)) }, [syncApiUrl])
  useEffect(() => { localStorage.setItem('vf-sync-token', JSON.stringify(syncToken)) }, [syncToken])
  useEffect(() => { localStorage.setItem('vf-reminders-enabled', JSON.stringify(remindersOn)) }, [remindersOn])
  useEffect(() => {
    if (!('serviceWorker' in navigator)) { setRemindersOn(false); return }
    navigator.serviceWorker.ready.then((registration) => registration.pushManager.getSubscription()).then((subscription) => setRemindersOn(Boolean(subscription))).catch(() => setRemindersOn(false))
  }, [])
  useEffect(() => {
    if (!settingsOpen || !syncToken) return
    fetch(`${syncApiUrl}/api/sync`, { headers: { authorization: `Bearer ${syncToken}` } }).then((response) => {
      if (response.status === 401) { setSyncToken(''); setSyncStatus('Worker oturumu sona ermiş. Yeniden giriş yapman gerekiyor.') }
      else if (response.status >= 500) setSyncStatus('Worker yanıt verdi ancak veritabanı hazır değil; migration ve secrets ayarını kontrol et.')
    }).catch(() => setSyncStatus('Worker bağlantısı kurulamadı; adresi veya internet bağlantısını kontrol et.'))
    fetch(`${syncApiUrl}/api/reminders/settings`, { headers: { authorization: `Bearer ${syncToken}` } }).then((response) => response.ok ? response.json() : null).then((result) => {
      const settings = result?.settings
      if (settings) { setQuietStart(settings.quietStart); setQuietEnd(settings.quietEnd); setReminderWording(settings.wording); setPrivacyMode(settings.privacyMode) }
    }).catch(() => undefined)
  }, [settingsOpen, syncApiUrl, syncToken])
  useEffect(() => {
    if (!remindersOn || !syncToken) {
      setReminderSyncState('idle')
      setReminderSyncError('')
      return
    }
    const controller = new AbortController()
    const id = window.setTimeout(() => {
      void (async () => {
        setReminderSyncState('syncing')
        setReminderSyncError('')
        const currentIds = tasks.map((task) => task.id)
        const headers = { authorization: `Bearer ${syncToken}` }
        const removedIds = syncedReminderIdsRef.current.filter((taskId) => !currentIds.includes(taskId))
        const removed = removedIds.map((taskId) => fetch(`${syncApiUrl}/api/tasks/${encodeURIComponent(String(taskId))}`, { method: 'DELETE', headers, signal: controller.signal }))
        const requests = tasks.map((task) => {
          const dueAt = new Date(`${task.date ?? dateKey(new Date())}T${task.time}:00`).getTime()
          const status = task.archived ? 'dismissed' : task.done ? 'completed' : 'pending'
          return fetch(`${syncApiUrl}/api/tasks`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ id: String(task.id), title: task.title, category: task.category, dueAt, durationMinutes: task.duration, status }), signal: controller.signal })
        })
        const results = await Promise.allSettled([...removed, ...requests])
        if (controller.signal.aborted) return
        const syncFailure = getReminderSyncFailure(results)
        if (syncFailure) {
          setReminderSyncError(`${syncFailure} Görevler bu cihaza kaydedildi; hatırlatma eşitlemesi tamamlanmadı.`)
          setReminderSyncState('error')
          return
        }
        syncedReminderIdsRef.current = currentIds
        localStorage.setItem('vf-reminder-task-ids', JSON.stringify(currentIds))
        setReminderSyncState('synced')
      })().catch((error: unknown) => {
        if (controller.signal.aborted) return
        setReminderSyncError(error instanceof Error ? error.message : 'Hatırlatma eşitlemesi tamamlanamadı.')
        setReminderSyncState('error')
      })
    }, 500)
    return () => { window.clearTimeout(id); controller.abort() }
  }, [tasks, remindersOn, syncToken, syncApiUrl, reminderSyncAttempt])
  useEffect(() => { localStorage.setItem('vf-habits', JSON.stringify(habits)) }, [habits])
  useEffect(() => { localStorage.setItem('vf-focus-sessions', JSON.stringify(focusSessions)) }, [focusSessions])
  useEffect(() => { localStorage.setItem('vf-study-logs', JSON.stringify(manualStudyLogs)) }, [manualStudyLogs])
  useEffect(() => { localStorage.setItem('vf-learning-goals', JSON.stringify(learningGoals)) }, [learningGoals])
  useEffect(() => { localStorage.setItem('vf-pomodoro-key', pomodoroKey) }, [pomodoroKey])
  useEffect(() => { localStorage.setItem('vf-available-minutes', JSON.stringify(availableMinutes)) }, [availableMinutes])
  useEffect(() => { localStorage.setItem('vf-recommendation-energy', JSON.stringify(recommendationEnergy)) }, [recommendationEnergy])
  useEffect(() => {
    if (!timerRunning) return
    const startedAt = timerSegmentStartedAtRef.current
    if (startedAt === null) return
    const segmentBase = timerSegmentBaseSecondsRef.current
    const focusBase = pomodoroSegmentBaseSecondsRef.current
    const updateElapsed = () => {
      const nowMs = Date.now()
      setSeconds(getElapsedSeconds(startedAt, nowMs, segmentBase))
      if (timerPhase === 'focus') setPomodoroElapsed(getElapsedSeconds(startedAt, nowMs, focusBase))
    }
    const id = window.setInterval(updateElapsed, 1000)
    updateElapsed()
    return () => window.clearInterval(id)
  }, [timerRunning, timerPhase])
  useEffect(() => {
    if (!toast) return
    const canUndo = toast === 'Görev silindi.' || toast === 'Görev 10 dakika ertelendi.'
    const id = window.setTimeout(() => { setToast(''); setUndoAction(null) }, canUndo ? 5000 : 2800)
    return () => window.clearTimeout(id)
  }, [toast])

  useEffect(() => {
    const id = window.setInterval(() => setClockNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const now = new Date(clockNow)
  const dateLabel = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)
  const dateUpper = dateLabel.toLocaleUpperCase('tr-TR')
  const todayKey = dateKey(now)
  const overdueTasks = tasks.filter((task) => !task.archived && !task.done && new Date(`${task.date ?? todayKey}T${task.time}:00`).getTime() < now.getTime()).sort((a, b) => (a.date ?? todayKey).localeCompare(b.date ?? todayKey) || a.time.localeCompare(b.time))
  const todayTasks = useMemo(() => tasks.filter((task) => !task.archived && (task.date ?? todayKey) === todayKey), [tasks, todayKey])
  const scheduledNextTask = useMemo(() => todayTasks.filter((task) => !task.done).sort((a, b) => a.time.localeCompare(b.time))[0], [todayTasks])
  const selectedFocusTask = todayTasks.find((task) => task.id === focusTaskId && !task.done)
  const nextTask = selectedFocusTask ?? scheduledNextTask
  const doneCount = todayTasks.filter((task) => task.done).length
  const progress = Math.round((doneCount / Math.max(todayTasks.length, 1)) * 100)
  const plannedMinutes = todayTasks.reduce((sum, task) => sum + task.duration, 0)
  const energyRank = { light: 1, steady: 2, deep: 3 }
  const recommendationRank = energyRank[recommendationEnergy]
  const recommendedTasks = todayTasks.filter((task) => !task.done && task.duration <= availableMinutes && energyRank[task.energy ?? 'steady'] <= recommendationRank).sort((a, b) => (b.priority === 'high' ? 1 : b.priority === 'normal' ? 0 : -1) - (a.priority === 'high' ? 1 : a.priority === 'normal' ? 0 : -1) || a.time.localeCompare(b.time)).slice(0, 3)
  const focusTodaySeconds = focusSessions.filter((session) => session.date === todayKey).reduce((sum, session) => sum + session.seconds, 0)
  const learningTodaySeconds = focusSessions.filter((session) => session.date === todayKey && session.category === 'Öğrenme').reduce((sum, session) => sum + session.seconds, 0) + manualStudyLogs.filter((log) => log.date === todayKey).reduce((sum, log) => sum + log.minutes * 60, 0)
  const todayWeekday = ((now.getDay() + 6) % 7) + 1
  const todayHabits = habits.filter((habit) => isHabitScheduledOnWeekday(habit.frequencyMode, habit.scheduledDays, todayWeekday))
  const checkedHabitsToday = todayHabits.filter((habit) => habit.checked).length
  const habitProgress = todayHabits.length ? Math.round((checkedHabitsToday / todayHabits.length) * 100) : 0
  const longestHabitDays = Math.max(0, ...habits.map((habit) => longestStreak(habit.checkDates ?? [])))
  const habitCalendarStart = new Date(now)
  habitCalendarStart.setHours(0, 0, 0, 0)
  habitCalendarStart.setDate(habitCalendarStart.getDate() - ((habitCalendarStart.getDay() + 6) % 7) - 21)
  const calendarHabit = habitCalendarId === 'all' ? undefined : habits.find((habit) => habit.id === habitCalendarId)
  const habitHeatmapDays = Array.from({ length: 28 }, (_, index) => {
    const day = new Date(habitCalendarStart)
    day.setDate(habitCalendarStart.getDate() + index)
    const key = dateKey(day)
    const count = habits.filter((habit) => (habit.checkDates ?? []).includes(key)).length
    const completed = Boolean(calendarHabit && (calendarHabit.checkDates ?? []).includes(key))
    const state = calendarHabit ? getHabitCalendarState(key, todayKey, completed, calendarHabit.frequencyMode, calendarHabit.scheduledDays) : count ? 'completed' : 'flexible'
    return { key, count, state }
  })
  const habitCalendarDoneDays = habitHeatmapDays.filter((day) => calendarHabit ? day.state === 'completed' : day.count > 0).length
  const habitCalendarMissedDays = habitHeatmapDays.filter((day) => day.state === 'missed').length
  const calendarWeek = useMemo(() => {
    const anchor = new Date(`${calendarAnchor}T00:00:00`)
    anchor.setHours(0, 0, 0, 0)
    anchor.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7))
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(anchor)
      day.setDate(anchor.getDate() + index)
      return day
    })
  }, [calendarAnchor])
  const calendarMonthDays = useMemo(() => {
    const selected = new Date(`${selectedDay}T00:00:00`)
    const first = new Date(selected.getFullYear(), selected.getMonth(), 1)
    first.setDate(first.getDate() - ((first.getDay() + 6) % 7))
    return Array.from({ length: 42 }, (_, index) => { const day = new Date(first); day.setDate(first.getDate() + index); return day })
  }, [selectedDay])
  const analysisWeek = useMemo(() => {
    const monday = new Date(now)
    monday.setHours(0, 0, 0, 0)
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(monday)
      day.setDate(monday.getDate() + index)
      return day
    })
  }, [todayKey])
  const analysisRangeDays = useMemo(() => {
    if (analysisPeriod === 'week') return analysisWeek
    const end = new Date(`${todayKey}T00:00:00`)
    return Array.from({ length: 28 }, (_, index) => { const day = new Date(end); day.setDate(end.getDate() - 27 + index); return day })
  }, [analysisPeriod, analysisWeek, todayKey])
  const weeklyTimerStudySeconds = focusSessions.filter((session) => session.category === 'Öğrenme' && analysisWeek.some((day) => dateKey(day) === session.date)).reduce((sum, session) => sum + session.seconds, 0)
  const weeklyManualStudySeconds = manualStudyLogs.filter((log) => analysisWeek.some((day) => dateKey(day) === log.date)).reduce((sum, log) => sum + log.minutes * 60, 0)
  const weeklyStudySeconds = weeklyTimerStudySeconds + weeklyManualStudySeconds
  const habitWeekKeys = analysisWeek.map(dateKey)
  const habitWeeklyStats = habits.map((habit) => ({ id: habit.id, ...getHabitWeekMetrics(habit.checkDates ?? [], habit.weeklyTarget ?? 7, habitWeekKeys) }))
  const habitStatsById = new Map(habitWeeklyStats.map((metric) => [metric.id, metric]))
  const weeklyHabitChecks = habitWeeklyStats.reduce((sum, metric) => sum + metric.checkCount, 0)
  const weeklyHabitTarget = habitWeeklyStats.reduce((sum, metric) => sum + metric.target, 0)
  const weeklyHabitProgress = weeklyHabitTarget ? Math.min(100, Math.round((weeklyHabitChecks / weeklyHabitTarget) * 100)) : 0
  const weeklySessionCount = focusSessions.filter((session) => analysisWeek.some((day) => dateKey(day) === session.date)).length
  const categoryPalette: Record<string, string> = { 'Öğrenme': '#8465df', 'Sağlık': '#61b7a5', 'İş/Okul': '#8d9de0', 'Hobiler': '#e29b77', 'Kişisel': '#b38de0', 'Ev': '#d1a566' }
  const rangeKeys = analysisRangeDays.map(dateKey)
  const rangeFocusByDay = analysisRangeDays.map((day) => focusSessions.filter((session) => session.date === dateKey(day)).reduce((sum, session) => sum + session.seconds, 0))
  const rangePlanByDay = analysisRangeDays.map((day) => tasks.filter((task) => !task.archived && (task.date ?? todayKey) === dateKey(day)).reduce((sum, task) => sum + task.duration, 0))
  const rangeFocusSeconds = rangeFocusByDay.reduce((sum, seconds) => sum + seconds, 0)
  const rangeTasks = tasks.filter((task) => !task.archived && isTaskCountableForAnalytics(task, rangeKeys, todayKey, now))
  const rangeDoneTasks = rangeTasks.filter((task) => task.done).length
  const rangeCompletion = rangeTasks.length ? Math.round(rangeDoneTasks / rangeTasks.length * 100) : 0
  const rangeElapsedPlanMinutes = rangeTasks.reduce((sum, task) => sum + task.duration, 0)
  const rangeSessionCount = focusSessions.filter((session) => rangeKeys.includes(session.date)).length
  const rangeLearningTimerSeconds = focusSessions.filter((session) => session.category === 'Öğrenme' && rangeKeys.includes(session.date)).reduce((sum, session) => sum + session.seconds, 0)
  const rangeManualLearningMinutes = manualStudyLogs.filter((log) => rangeKeys.includes(log.date)).reduce((sum, log) => sum + log.minutes, 0)
  const rangeStudySeconds = rangeLearningTimerSeconds + rangeManualLearningMinutes * 60
  const rangeHabitChecks = habits.reduce((sum, habit) => sum + (habit.checkDates ?? []).filter((date) => rangeKeys.includes(date)).length, 0)
  const rangeCategoryTotals = [...new Set(focusSessions.filter((session) => rangeKeys.includes(session.date)).map((session) => session.category))].map((category) => ({ category, seconds: focusSessions.filter((session) => session.category === category && rangeKeys.includes(session.date)).reduce((sum, session) => sum + session.seconds, 0) })).sort((a, b) => b.seconds - a.seconds)
  const rangeTotalCategorySeconds = rangeCategoryTotals.reduce((sum, item) => sum + item.seconds, 0)
  const rangeRecordedOfPlanned = rangeElapsedPlanMinutes ? Math.min(100, Math.round(rangeFocusSeconds / 60 / rangeElapsedPlanMinutes * 100)) : 0
  const rangeChartItems = analysisPeriod === 'week'
    ? analysisRangeDays.map((day, index) => ({ label: new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(day).replace('.', ''), planned: rangePlanByDay[index], focus: rangeFocusByDay[index] }))
    : Array.from({ length: 4 }, (_, index) => ({ label: `${index + 1}. hf`, planned: rangePlanByDay.slice(index * 7, index * 7 + 7).reduce((sum, value) => sum + value, 0), focus: rangeFocusByDay.slice(index * 7, index * 7 + 7).reduce((sum, value) => sum + value, 0) }))
  const rangeMaxMinutes = Math.max(60, ...rangeChartItems.map((item) => item.planned), ...rangeChartItems.map((item) => item.focus / 60))
  const rangeStudyByDay = analysisRangeDays.map((day) => focusSessions.filter((session) => session.category === 'Öğrenme' && session.date === dateKey(day)).reduce((sum, session) => sum + session.seconds, 0) + manualStudyLogs.filter((log) => log.date === dateKey(day)).reduce((sum, log) => sum + log.minutes * 60, 0))
  const rangeStudyChartItems = analysisPeriod === 'week'
    ? analysisRangeDays.map((day, index) => ({ label: new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(day).replace('.', ''), seconds: rangeStudyByDay[index] }))
    : Array.from({ length: 4 }, (_, index) => ({ label: `${index + 1}. hf`, seconds: rangeStudyByDay.slice(index * 7, index * 7 + 7).reduce((sum, value) => sum + value, 0) }))
  let rangeCategoryCursor = 0
  const rangeDonutGradient = rangeTotalCategorySeconds ? `conic-gradient(${rangeCategoryTotals.map((item) => { const start = rangeCategoryCursor; rangeCategoryCursor += item.seconds / rangeTotalCategorySeconds * 100; return `${categoryPalette[item.category] ?? '#a89aba'} ${start}% ${rangeCategoryCursor}%` }).join(', ')})` : 'conic-gradient(#e8e2f0 0% 100%)'
  const profileInitial = profileName.trim().slice(0, 1).toLocaleUpperCase('tr-TR') || 'V'
  const earnedTaskXp = tasks.filter((task) => task.done && !task.isExample).length * 10
  const earnedHabitXp = habits.filter((habit) => !habit.isExample).reduce((sum, habit) => sum + (habit.checkDates ?? []).length, 0) * 5
  const earnedFocusXp = Math.floor(focusSessions.reduce((sum, session) => sum + session.seconds, 0) / 900) * 5
  const earnedLearningXp = Math.floor(manualStudyLogs.reduce((sum, log) => sum + log.minutes, 0) / 30) * 5
  const totalXp = earnedTaskXp + earnedHabitXp + earnedFocusXp + earnedLearningXp
  const profileLevel = Math.floor(totalXp / 100) + 1
  const levelXp = totalXp % 100
  const skillProgress = availableCategories.map((category) => ({ label: category.label, seconds: focusSessions.filter((session) => session.category === category.label).reduce((sum, session) => sum + session.seconds, 0) })).filter((item) => item.seconds > 0).sort((a, b) => b.seconds - a.seconds)
  const learningTasks = tasks.filter((task) => !task.archived && task.category === 'Öğrenme')
  const learningSessions = focusSessions.filter((session) => session.category === 'Öğrenme').sort((a, b) => b.endedAt - a.endedAt)
  const studyLogEntries = [
    ...learningSessions.map((session) => ({ id: `timer-${session.id}`, title: session.taskTitle, dateLabel: new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(session.endedAt)), sortAt: session.endedAt, seconds: session.seconds, source: 'Zamanlayıcı', note: '' })),
    ...manualStudyLogs.map((log) => ({ id: `manual-${log.id}`, title: log.title, dateLabel: new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(new Date(`${log.date}T12:00:00`)), sortAt: log.loggedAt, seconds: log.minutes * 60, source: 'Manuel kayıt', note: log.note })),
  ] .sort((a, b) => b.sortAt - a.sortAt)
  const learningWeekByDay = analysisWeek.map((day) => focusSessions.filter((session) => session.category === 'Öğrenme' && session.date === dateKey(day)).reduce((sum, session) => sum + session.seconds, 0) + manualStudyLogs.filter((log) => log.date === dateKey(day)).reduce((sum, log) => sum + log.minutes * 60, 0))
  const maxLearningMinutes = Math.max(30, ...learningWeekByDay.map((seconds) => seconds / 60))
  const selectedTasks = tasks.filter((task) => !task.archived && (task.date ?? todayKey) === selectedDay).sort((a, b) => a.time.localeCompare(b.time))
  const selectedPlannedMinutes = selectedTasks.reduce((sum, task) => sum + task.duration, 0)
  const searchResults = tasks.filter((task) => (showArchived ? Boolean(task.archived) : !task.archived) && (!searchQuery.trim() || `${task.title} ${task.category} ${task.notes ?? ''}`.toLocaleLowerCase('tr-TR').includes(searchQuery.trim().toLocaleLowerCase('tr-TR')))).sort((a, b) => (a.date ?? todayKey).localeCompare(b.date ?? todayKey) || a.time.localeCompare(b.time))
  const selectedCalendarDate = calendarWeek.find((day) => dateKey(day) === selectedDay) ?? new Date(`${selectedDay}T00:00:00`)
  const selectedCalendarLabel = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).format(selectedCalendarDate).toLocaleUpperCase('tr-TR')
  const pomodoro = pomodoroPresets.find((preset) => preset.key === pomodoroKey) ?? pomodoroPresets[0]
  const timerLimitSeconds = (timerPhase === 'break' || timerPhase === 'breakReady' ? pomodoro.rest : pomodoro.focus) * 60
  const timerRemaining = timerPhase === 'focus' ? Math.max(0, timerLimitSeconds - pomodoroElapsed) : timerPhase === 'breakReady' ? timerLimitSeconds : Math.max(0, timerLimitSeconds - seconds)
  const timerElapsed = timerPhase === 'focus' ? pomodoroElapsed : seconds
  const timerLabel = `${String(Math.floor(timerRemaining / 60)).padStart(2, '0')}:${String(timerRemaining % 60).padStart(2, '0')}`
  useEffect(() => {
    if (!timerRunning || timerElapsed < timerLimitSeconds) return
    setTimerRunning(false)
    timerSegmentStartedAtRef.current = null
    timerSegmentBaseSecondsRef.current = 0
    pomodoroSegmentBaseSecondsRef.current = 0
    setSeconds(0)
    if (timerPhase === 'focus') {
      const elapsed = seconds
      if (elapsed >= 10) setFocusSessions((sessions) => [...sessions, { id: Date.now(), date: todayKey, seconds: elapsed, category: nextTask?.category ?? 'Kişisel', taskTitle: nextTask?.title ?? 'Serbest odak', endedAt: Date.now() }])
      setPomodoroElapsed(0)
      setTimerPhase('breakReady')
      setToast(`Odak bölümü tamamlandı. ${pomodoro.rest} dakikalık mola hazır.`)
    } else if (timerPhase === 'break') {
      setTimerPhase('focus')
      setToast('Mola tamamlandı. Yeni odak bölümüne hazır olduğunda başlayabilirsin.')
    }
  }, [timerRunning, seconds, timerElapsed, timerLimitSeconds, timerPhase, todayKey, nextTask, pomodoro.rest])
  const hasExampleData = tasks.some((task) => task.isExample) || habits.some((habit) => habit.isExample)

  function openProfileEditor() {
    setProfileNameDraft(profileName)
    setProfileAvatarDraft(profileAvatar)
    setProfileAvatarThemeDraft(profileAvatarTheme)
    setProfileGamificationDraft(gamificationEnabled)
    setProfileOpen(true)
  }
  function handleProfileImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setToast('Fotoğrafı JPG, PNG veya WebP biçiminde seç.'); return }
    if (file.size > 8 * 1024 * 1024) { setToast('Fotoğraf en fazla 8 MB olabilir.'); return }
    const reader = new FileReader()
    reader.onerror = () => setToast('Fotoğraf okunamadı; başka bir görsel deneyebilirsin.')
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => setToast('Bu fotoğraf biçimi açılamadı; JPG, PNG veya WebP deneyebilirsin.')
      image.onload = () => {
        const side = Math.min(image.naturalWidth, image.naturalHeight)
        const canvas = document.createElement('canvas')
        canvas.width = 256
        canvas.height = 256
        const context = canvas.getContext('2d')
        if (!context || !side) { setToast('Fotoğraf işlenemedi.'); return }
        context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 256, 256)
        const compressed = canvas.toDataURL('image/jpeg', 0.82)
        if (compressed.length > 400_000) { setToast('Bu fotoğraf küçültülemedi; daha küçük bir görsel seç.'); return }
        setProfileAvatarDraft(compressed)
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  }
  function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = profileNameDraft.trim()
    if (!name) return
    setProfileName(name.slice(0, 32))
    setProfileAvatar(profileAvatarDraft)
    setProfileAvatarTheme(profileAvatarThemeDraft)
    setGamificationEnabled(profileGamificationDraft)
    setProfileOpen(false)
    setToast('Profil kaydedildi.')
  }
  function shiftCalendarWeek(direction: number) {
    const next = new Date(`${selectedDay}T00:00:00`)
    next.setDate(next.getDate() + direction * 7)
    const key = dateKey(next)
    setSelectedDay(key)
    setCalendarAnchor(key)
  }
  function shiftCalendarMonth(direction: number) {
    const next = new Date(`${selectedDay}T00:00:00`)
    const dayOfMonth = next.getDate()
    next.setDate(1)
    next.setMonth(next.getMonth() + direction)
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
    next.setDate(Math.min(dayOfMonth, lastDay))
    const key = dateKey(next)
    setSelectedDay(key)
    setCalendarAnchor(key)
  }
  function selectCalendarDate(day: Date) {
    const key = dateKey(day)
    if (moveSelectionTaskId !== null) requestTaskMove(moveSelectionTaskId, key)
    else { setSelectedDay(key); setCalendarAnchor(key) }
  }
  function handleCalendarDrop(event: React.DragEvent<HTMLButtonElement>, day: Date) {
    event.preventDefault()
    event.stopPropagation()
    const taskId = Number(event.dataTransfer.getData('text/plain')) || draggingTaskId
    if (taskId) requestTaskMove(taskId, dateKey(day))
    setDraggingTaskId(null)
  }
  function buildTaskSuggestions(): TaskSuggestion[] {
    const dayStart = 9 * 60
    const dayEnd = 21 * 60
    let cursor = dayStart
    const gaps: { start: number; end: number }[] = []
    const scheduled = selectedTasks.map((task) => ({ start: timeToMinutes(task.time), end: timeToMinutes(task.time) + task.duration })).sort((a, b) => a.start - b.start)
    for (const block of scheduled) {
      if (block.start > cursor) gaps.push({ start: cursor, end: Math.min(block.start, dayEnd) })
      cursor = Math.max(cursor, block.end)
    }
    if (cursor < dayEnd) gaps.push({ start: cursor, end: dayEnd })
    const candidates = tasks.filter((task) => !task.archived && !task.done && (task.date ?? todayKey) !== selectedDay && task.duration <= availableMinutes && energyRank[task.energy ?? 'steady'] <= recommendationRank).sort((a, b) => (b.priority === 'high' ? 1 : b.priority === 'normal' ? 0 : -1) - (a.priority === 'high' ? 1 : a.priority === 'normal' ? 0 : -1) || a.time.localeCompare(b.time))
    const suggestions: TaskSuggestion[] = []
    for (const task of candidates) {
      const slot = gaps.find((gap) => gap.end - gap.start >= task.duration)
      if (!slot || suggestions.length >= 3) continue
      const minutes = slot.start
      suggestions.push({ taskId: task.id, time: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`, reason: `${task.duration} dk’lık boşluğa uyuyor` })
      slot.start += task.duration + 10
    }
    return suggestions
  }
  function openPlanSuggestions() {
    setTaskSuggestions(buildTaskSuggestions())
    setSuggestionOpen(true)
  }
  function choosePlanSuggestion(suggestion: TaskSuggestion) {
    setSuggestionOpen(false)
    requestTaskMove(suggestion.taskId, selectedDay, suggestion.time)
  }
  function requestTaskMove(taskId: number, targetDate: string, targetTime?: string) {
    const task = tasks.find((item) => item.id === taskId)
    if (!task) return
    const originalDate = task.date ?? todayKey
    const plannedTargetTime = targetTime ?? task.time
    if (originalDate === targetDate && task.time === plannedTargetTime) { setMoveSelectionTaskId(null); setToast('Görev zaten bu zaman aralığında planlı.'); return }
    setPendingMove({ taskId, targetDate, originalDate, originalTime: task.time, targetTime: plannedTargetTime })
    setMoveSelectionTaskId(null)
  }
  function confirmTaskMove() {
    if (!pendingMove) return
    setTasks((items) => items.map((task) => task.id === pendingMove.taskId ? { ...task, date: pendingMove.targetDate, time: pendingMove.targetTime ?? task.time } : task))
    setSelectedDay(pendingMove.targetDate)
    setCalendarAnchor(pendingMove.targetDate)
    setPendingMove(null)
    setToast('Görev planı güncellendi.')
  }
  function removeExampleData() {
    setTasks((items) => items.filter((task) => !task.isExample))
    setHabits((items) => items.filter((habit) => !habit.isExample))
    setToast('Başlangıç örnekleri kaldırıldı.')
  }
  function openNewTaskModal() {
    setEditingTask(null)
    setTaskName('')
    setTaskDate(activeTab === 'Takvim' ? selectedDay : todayKey)
    setTaskTime('18:00')
    setTaskCategory(activeTab === 'Öğrenme' ? 'Öğrenme' : 'Kişisel')
    setTaskDuration(30)
    setTaskPriority('normal')
    setTaskEnergy('steady')
    setTaskNotes('')
    setPlannerStep(1)
    setModalOpen(true)
  }
  function openTaskEditor(task: Task) {
    setEditingTask(task)
    setTaskName(task.title)
    setTaskDate(task.date ?? todayKey)
    setTaskTime(task.time)
    setTaskCategory(task.category)
    setTaskDuration(task.duration)
    setTaskPriority(task.priority ?? 'normal')
    setTaskEnergy(task.energy ?? 'steady')
    setTaskNotes(task.notes ?? '')
    setPlannerStep(1)
    setModalOpen(true)
  }
  function closeTaskModal() {
    setModalOpen(false)
    setEditingTask(null)
    setTaskName('')
    setTaskNotes('')
    setPlannerStep(1)
  }
  function openHabitModal() {
    setEditingHabitId(null)
    setHabitName('')
    setHabitWeeklyTarget(7)
    setHabitScheduleMode('weekly')
    setHabitSelectedDays([])
    setHabitModalOpen(true)
  }
  function editHabit(habit: Habit) {
    setEditingHabitId(habit.id)
    setHabitName(habit.name)
    setHabitWeeklyTarget(habit.weeklyTarget ?? 7)
    setHabitScheduleMode(habit.frequencyMode === 'selectedDays' ? 'selectedDays' : 'weekly')
    setHabitSelectedDays(habit.scheduledDays ?? [])
    setHabitModalOpen(true)
  }
  function openStudyLogModal() {
    setStudyLogTitle('')
    setStudyLogMinutes(30)
    setStudyLogDate(todayKey)
    setStudyLogNote('')
    setStudyLogGoalId('')
    setStudyLogModalOpen(true)
  }
  function openGoalModal() {
    setGoalTitle('')
    setGoalDescription('')
    setGoalFirstMilestone('')
    setGoalModalOpen(true)
  }
  function addManualStudyLog(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = studyLogTitle.trim()
    if (!title || studyLogMinutes < 1) return
    setManualStudyLogs((logs) => [...logs, { id: Date.now(), title, date: studyLogDate, minutes: studyLogMinutes, note: studyLogNote.trim(), goalId: studyLogGoalId ? Number(studyLogGoalId) : undefined, loggedAt: Date.now() }])
    setStudyLogModalOpen(false)
    setToast('Çalışma süresi kaydedildi.')
  }
  function addLearningGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = goalTitle.trim()
    if (!title) return
    const firstStep = goalFirstMilestone.trim()
    setLearningGoals((goals) => [...goals, { id: Date.now(), title, description: goalDescription.trim(), milestones: firstStep ? [{ id: Date.now() + 1, title: firstStep, done: false }] : [], createdAt: Date.now() }])
    setGoalModalOpen(false)
    setToast('Öğrenme hedefi eklendi.')
  }
  function toggleMilestone(goalId: number, milestoneId: number) {
    setLearningGoals((goals) => goals.map((goal) => goal.id === goalId ? { ...goal, milestones: goal.milestones.map((step) => step.id === milestoneId ? { ...step, done: !step.done, completedAt: !step.done ? Date.now() : undefined } : step) } : goal))
  }
  function addMilestone(event: React.FormEvent<HTMLFormElement>, goalId: number) {
    event.preventDefault()
    const title = (milestoneDrafts[goalId] ?? '').trim()
    if (!title) return
    setLearningGoals((goals) => goals.map((goal) => goal.id === goalId ? { ...goal, milestones: [...goal.milestones, { id: Date.now(), title, done: false }] } : goal))
    setMilestoneDrafts((drafts) => ({ ...drafts, [goalId]: '' }))
  }
  function getCurrentTimerSegmentSeconds() {
    const startedAt = timerSegmentStartedAtRef.current
    return startedAt === null ? seconds : getElapsedSeconds(startedAt, Date.now(), timerSegmentBaseSecondsRef.current)
  }
  function saveFocusSession(elapsedOverride = getCurrentTimerSegmentSeconds()) {
    if (timerPhase === 'focus' && elapsedOverride >= 10) {
      setFocusSessions((sessions) => [...sessions, {
        id: Date.now(), date: todayKey, seconds: elapsedOverride,
        category: nextTask?.category ?? 'Kişisel', taskTitle: nextTask?.title ?? 'Serbest odak', endedAt: Date.now(),
      }])
    }
    setSeconds(0)
  }
  function toggleFocusTimer() {
    if (timerRunning) {
      const startedAt = timerSegmentStartedAtRef.current
      const nowMs = Date.now()
      const elapsed = startedAt === null ? seconds : getElapsedSeconds(startedAt, nowMs, timerSegmentBaseSecondsRef.current)
      const focusElapsed = startedAt === null ? pomodoroElapsed : getElapsedSeconds(startedAt, nowMs, pomodoroSegmentBaseSecondsRef.current)
      timerSegmentStartedAtRef.current = null
      setTimerRunning(false)
      if (timerPhase === 'focus') {
        setPomodoroElapsed(focusElapsed)
        saveFocusSession(elapsed)
      } else setSeconds(elapsed)
    } else {
      if (timerPhase === 'breakReady') {
        setTimerPhase('break')
        setSeconds(0)
        timerSegmentBaseSecondsRef.current = 0
      } else timerSegmentBaseSecondsRef.current = seconds
      pomodoroSegmentBaseSecondsRef.current = pomodoroElapsed
      timerSegmentStartedAtRef.current = Date.now()
      setTimerRunning(true)
    }
  }
  function finishBreak() {
    timerSegmentStartedAtRef.current = null
    timerSegmentBaseSecondsRef.current = 0
    pomodoroSegmentBaseSecondsRef.current = 0
    setTimerRunning(false)
    setTimerPhase('focus')
    setSeconds(0)
    setToast('Mola bitirildi.')
  }
  function completeTask(id: number) {
    const isFocusedTask = timerRunning && nextTask?.id === id
    if (isFocusedTask) {
      if (timerPhase === 'focus') saveFocusSession()
      timerSegmentStartedAtRef.current = null
      timerSegmentBaseSecondsRef.current = 0
      pomodoroSegmentBaseSecondsRef.current = 0
      setTimerRunning(false)
      setTimerPhase('focus')
      setSeconds(0)
      setPomodoroElapsed(0)
    }
    setTasks((items) => items.map((item) => item.id === id ? { ...item, done: true, completedAt: Date.now() } : item))
    setToast('Görev tamamlandı.')
  }
  function archiveTask(task: Task) {
    if (timerRunning && nextTask?.id === task.id) {
      if (timerPhase === 'focus') saveFocusSession()
      timerSegmentStartedAtRef.current = null
      timerSegmentBaseSecondsRef.current = 0
      pomodoroSegmentBaseSecondsRef.current = 0
      setTimerRunning(false)
      setTimerPhase('focus')
      setSeconds(0)
      setPomodoroElapsed(0)
    }
    setTasks((items) => items.map((item) => item.id === task.id ? { ...item, archived: true } : item))
    setToast('Görev arşivlendi. Arşivden geri alabilirsin.')
  }
  function snoozeTask(id: number) {
    const task = tasks.find((item) => item.id === id)
    if (!task) return
    if (timerRunning && timerPhase === 'focus') saveFocusSession()
    timerSegmentStartedAtRef.current = null
    timerSegmentBaseSecondsRef.current = 0
    pomodoroSegmentBaseSecondsRef.current = 0
    setTimerRunning(false)
    setTimerPhase('focus')
    setSeconds(0)
    setPomodoroElapsed(0)
    setUndoAction({ kind: 'snooze', task })
    const nextTime = getSnoozeDate(new Date(), 10)
    setTasks((items) => items.map((item) => item.id === id ? { ...item, date: dateKey(nextTime), time: `${String(nextTime.getHours()).padStart(2, '0')}:${String(nextTime.getMinutes()).padStart(2, '0')}` } : item))
    setToast('Görev 10 dakika ertelendi.')
  }
  function deleteTask(task: Task) {
    if (timerRunning && nextTask?.id === task.id) {
      if (timerPhase === 'focus') saveFocusSession()
      timerSegmentStartedAtRef.current = null
      timerSegmentBaseSecondsRef.current = 0
      pomodoroSegmentBaseSecondsRef.current = 0
      setTimerRunning(false)
      setTimerPhase('focus')
      setSeconds(0)
      setPomodoroElapsed(0)
    }
    setUndoAction({ kind: 'delete', task })
    if (remindersOn && syncToken) void fetch(`${syncApiUrl}/api/tasks/${encodeURIComponent(String(task.id))}`, { method: 'DELETE', headers: { authorization: `Bearer ${syncToken}` } }).catch(() => undefined)
    setTasks((items) => items.filter((item) => item.id !== task.id))
    setToast('Görev silindi.')
  }
  function undoTaskChange() {
    if (!undoAction) return
    if (undoAction.kind === 'delete') setTasks((items) => [...items, undoAction.task])
    else setTasks((items) => items.map((item) => item.id === undoAction.task.id ? undoAction.task : item))
    setUndoAction(null)
    setToast('Değişiklik geri alındı.')
  }
  function toggleHabit(id: number) {
    setHabits((items) => items.map((habit) => {
      if (habit.id !== id) return habit
      const dates = habit.checkDates ?? []
      const isChecked = dates.includes(todayKey)
      const checkDates = isChecked ? dates.filter((date) => date !== todayKey) : [...dates, todayKey]
      return { ...habit, checkDates, checked: !isChecked }
    }))
  }
  function addHabit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = habitName.trim()
    if (!name || (habitScheduleMode === 'selectedDays' && habitSelectedDays.length === 0)) return
    const weeklyTarget = habitScheduleMode === 'selectedDays' ? habitSelectedDays.length : habitWeeklyTarget
    const scheduledDays = habitScheduleMode === 'selectedDays' ? [...habitSelectedDays].sort((a, b) => a - b) : undefined
    const weekdays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
    const detail = scheduledDays ? scheduledDays.map((day) => weekdays[day - 1]).join(' · ') : weeklyTarget === 7 ? 'Her gün' : `Haftada ${weeklyTarget} kez`
    if (editingHabitId !== null) {
      setHabits((items) => items.map((habit) => habit.id === editingHabitId ? { ...habit, name, detail, weeklyTarget, frequencyMode: habitScheduleMode, scheduledDays } : habit))
    } else {
      setHabits((items) => [...items, { id: Date.now(), name, detail, icon: 'spark', progress: 0, checked: false, weeklyTarget, frequencyMode: habitScheduleMode, scheduledDays, checkDates: [] }])
    }
    setEditingHabitId(null)
    setHabitName('')
    setHabitModalOpen(false)
    setToast(editingHabitId !== null ? 'Alışkanlık güncellendi.' : 'Alışkanlık eklendi.')
  }
  function handleTaskFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (plannerStep === 1) {
      event.preventDefault()
      if (taskName.trim()) setPlannerStep(2)
      return
    }
    addTask(event)
  }
  function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = taskName.trim()
    if (!title) return
    const time = taskTime
    const date = taskDate
    const duration = taskDuration
    const category = taskCategory
    const priority = taskPriority
    const energy = taskEnergy
    const notes = taskNotes.trim()
    const color = category === 'Sağlık' ? 'mint' : category === 'Hobiler' ? 'blue' : category === 'Kişisel' || category === 'Ev' ? 'peach' : 'violet'
    const icon = category === 'Öğrenme' || category === 'İş/Okul' ? 'book' : category === 'Sağlık' ? 'flower' : 'target'
    if (activeTab === 'Takvim') {
      setSelectedDay(date)
      setCalendarAnchor(date)
    }
    if (editingTask) {
      setTasks((items) => items.map((item) => item.id === editingTask.id ? { ...item, title, category, time, date, duration, color, icon, priority, energy, notes } : item))
      setToast('Görev güncellendi.')
    } else {
      setTasks((items) => [...items, { id: Date.now(), title, category, time, date, duration, done: false, color, icon, priority, energy, notes, createdAt: Date.now() }])
      setToast('Görev planına eklendi.')
    }
    closeTaskModal()
  }
  async function enableTaskReminders() {
    if (!syncToken) { setSyncStatus('Önce Worker oturumunu aç.'); return }
    if (!('Notification' in window) || !('serviceWorker' in navigator)) { setSyncStatus('Bu tarayıcı Web Push bildirimlerini desteklemiyor.'); return }
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') throw new Error('Bildirim izni verilmedi.')
      const keyResponse = await fetch(`${syncApiUrl}/api/push/public-key`)
      const keyResult = await keyResponse.json() as { publicKey?: string; error?: string }
      if (!keyResponse.ok || !keyResult.publicKey) throw new Error(keyResult.error ?? 'Push anahtarı henüz yapılandırılmamış.')
      const registration = await navigator.serviceWorker.ready
      const applicationServerKey = fromBase64Url(keyResult.publicKey)
      const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
      const response = await fetch(`${syncApiUrl}/api/push/subscribe`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${syncToken}` }, body: JSON.stringify(subscription.toJSON()) })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Push aboneliği kaydedilemedi.')
      setRemindersOn(true)
      setSyncStatus('Hatırlatmalar etkin. Görev saati ve beş dakikalık tekrarlar sunucu tarafından gönderilir; teslimat OS/tarayıcıya bağlıdır.')
    } catch (error) { setSyncStatus(error instanceof Error ? error.message : 'Hatırlatmalar etkinleştirilemedi.') }
  }
  async function saveReminderPreferences(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!syncToken) { setSyncStatus('Hatırlatma tercihlerini kaydetmek için Worker oturumu aç.'); return }
    try {
      const response = await fetch(`${syncApiUrl}/api/reminders/settings`, { method: 'PUT', headers: { 'content-type': 'application/json', authorization: `Bearer ${syncToken}` }, body: JSON.stringify({ quietStart, quietEnd, wording: reminderWording, privacyMode }) })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Tercihler kaydedilemedi.')
      if (remindersOn) setTasks((items) => items.slice())
      setSyncStatus('Sessiz saat ve gizlilik tercihleri kaydedildi.')
    } catch (error) { setSyncStatus(error instanceof Error ? error.message : 'Tercihler kaydedilemedi.') }
  }
  async function disableTaskReminders() {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription && syncToken) await fetch(`${syncApiUrl}/api/push/subscribe`, { method: 'DELETE', headers: { 'content-type': 'application/json', authorization: `Bearer ${syncToken}` }, body: JSON.stringify({ endpoint: subscription.endpoint }) })
      await subscription?.unsubscribe()
      setRemindersOn(false)
      setSyncStatus('Bu cihazdaki hatırlatmalar kapatıldı. Sunucu başka aboneliklere göndermeye devam edebilir.')
    } catch { setSyncStatus('Hatırlatmalar kapatılamadı; bağlantıyı kontrol et.') }
  }
  async function copyQuickLink(action: string) {
    const url = `${window.location.origin}/?action=${action}`
    try { await navigator.clipboard.writeText(url); setSyncStatus(`Kısayol bağlantısı kopyalandı: ${url}`) }
    catch { setSyncStatus(`Kısayol URL’si: ${url}`) }
  }
  function currentBackup(): BackupData {
    return { format: 'violet-focus-backup-v1', tasks, habits, focusSessions, manualStudyLogs, learningGoals, customCategories, profile: { name: profileName, gamificationEnabled, avatarDataUrl: profileAvatar ?? undefined, avatarTheme: profileAvatarTheme }, settings: { pomodoroKey, availableMinutes, recommendationEnergy } }
  }
  function restoreBackupData(backup: BackupData) {
    setTasks(backup.tasks.map((task) => ({ ...task, date: task.date ?? todayKey })))
    setHabits(backup.habits.map((habit) => { const checkDates = habit.checkDates ?? []; return { ...habit, checkDates, checked: checkDates.includes(todayKey) } }))
    setFocusSessions(backup.focusSessions)
    setManualStudyLogs(backup.manualStudyLogs)
    setLearningGoals(backup.learningGoals)
    setCustomCategories(backup.customCategories ?? [])
    setProfileName(backup.profile?.name.trim() ? backup.profile.name.trim().slice(0, 32) : 'Benim alanım')
    setProfileAvatar(backup.profile?.avatarDataUrl ?? null)
    setProfileAvatarTheme(backup.profile?.avatarTheme ?? 'lavender')
    setGamificationEnabled(backup.profile?.gamificationEnabled ?? false)
    if (backup.settings?.pomodoroKey && pomodoroPresets.some((preset) => preset.key === backup.settings?.pomodoroKey)) setPomodoroKey(backup.settings.pomodoroKey)
    if (backup.settings?.availableMinutes && [15,30,45,60].includes(backup.settings.availableMinutes)) setAvailableMinutes(backup.settings.availableMinutes)
    if (backup.settings?.recommendationEnergy && ['light','steady','deep'].includes(backup.settings.recommendationEnergy)) setRecommendationEnergy(backup.settings.recommendationEnergy)
    setFocusTaskId(null)
  }
  async function connectCloudSync(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const base = new URL(syncApiUrl.trim())
      if (base.protocol !== 'https:') throw new Error('Eşitleme adresi HTTPS olmalı.')
      setSyncApiUrl(base.origin)
      const response = await fetch(`${base.origin}/api/auth/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: syncPassword }) })
      const result = await response.json() as { token?: string; error?: string }
      if (!response.ok || !result.token) throw new Error(result.error ?? 'Bağlantı kurulamadı.')
      setSyncToken(result.token)
      setSyncPassword('')
      setSyncStatus('Güvenli oturum açıldı. Veriler henüz gönderilmedi.')
    } catch (error) { setSyncStatus(error instanceof Error ? error.message : 'Bağlantı kurulamadı.') }
  }
  async function uploadEncryptedSync() {
    if (!syncToken || syncPassphrase.length < 12) { setSyncStatus('Eşitleme parolası en az 12 karakter olmalı.'); return }
    if (!window.confirm('Bu cihazdaki görev, alışkanlık, öğrenme ve odak verilerini şifreleyip buluttaki yedeğin yerine koyacaksın. Devam edilsin mi?')) return
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16))
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const key = await deriveSyncKey(syncPassphrase, salt)
      const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(currentBackup())))
      const response = await fetch(`${syncApiUrl}/api/sync`, { method: 'PUT', headers: { 'content-type': 'application/json', authorization: `Bearer ${syncToken}` }, body: JSON.stringify({ salt: toBase64Url(salt), iv: toBase64Url(iv), ciphertext: toBase64Url(new Uint8Array(ciphertext)) }) })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Buluta gönderilemedi.')
      setSyncStatus('Şifreli yedek buluta gönderildi.')
    } catch (error) { setSyncStatus(error instanceof Error ? error.message : 'Eşitleme başarısız oldu.') }
  }
  async function downloadEncryptedSync() {
    if (!syncToken || syncPassphrase.length < 12) { setSyncStatus('Eşitleme parolası en az 12 karakter olmalı.'); return }
    try {
      const response = await fetch(`${syncApiUrl}/api/sync`, { headers: { authorization: `Bearer ${syncToken}` } })
      const result = await response.json() as { vault: EncryptedVault | null; error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Bulut yedeği alınamadı.')
      if (!result.vault) { setSyncStatus('Bulutta henüz yedek yok.'); return }
      const key = await deriveSyncKey(syncPassphrase, fromBase64Url(result.vault.salt))
      const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64Url(result.vault.iv) }, key, fromBase64Url(result.vault.ciphertext))
      const backup = parseBackup(JSON.parse(new TextDecoder().decode(plaintext)))
      if (!window.confirm('Bu şifreli yedek mevcut bu-cihaz verilerinin yerini alacak. Devam edilsin mi?')) return
      restoreBackupData(backup)
      setSyncStatus('Şifreli yedek bu cihaza geri yüklendi.')
    } catch (error) { setSyncStatus(error instanceof Error ? `Açılamadı: ${error.message}` : 'Bulut yedeği açılamadı.') }
  }
  function disconnectCloudSync() {
    setSyncToken('')
    setSyncPassphrase('')
    setSyncStatus('Bu cihaz bulut oturumundan çıkarıldı; sunucudaki şifreli yedek korunuyor.')
  }
  function exportBackup() {
    const backup = { format: 'violet-focus-backup-v1', exportedAt: new Date().toISOString(), tasks, habits, focusSessions, manualStudyLogs, learningGoals, customCategories, profile: { name: profileName, gamificationEnabled, avatarDataUrl: profileAvatar ?? undefined, avatarTheme: profileAvatarTheme }, settings: { pomodoroKey, availableMinutes, recommendationEnergy } }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `violet-focus-yedek-${todayKey}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setToast('Yedek dosyası indirildi.')
  }
  async function importBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const backup = parseBackup(JSON.parse(await file.text()))
      if (!window.confirm('Bu yedek mevcut görev, alışkanlık, öğrenme verileri ve özel kategorilerin yerini alacak. Devam edilsin mi?')) return
      restoreBackupData(backup)
      setToast('Yedek geri yüklendi.')
    } catch (error) {
      setToast(error instanceof Error ? `Yedek açılamadı: ${error.message}` : 'Yedek açılamadı.')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup"><div className="brand-mark"><Sparkles size={19} strokeWidth={2.2} /></div><div><strong>violet<span>focus</span></strong><small>GÜNÜNÜN RİTMİ</small></div><button className="icon-button sidebar-close" onClick={() => setMobileMenu(false)} aria-label="Menüyü kapat"><X size={18} /></button></div>
        <button className="profile-switch" onClick={openProfileEditor} aria-label="Profilini düzenle"><div className={`avatar avatar-tone-${profileAvatarTheme}`}>{profileAvatar ? <img src={profileAvatar} alt="" /> : profileInitial}</div><span><b>{profileName}</b><small>Kişisel çalışma alanı · Profili düzenle</small></span><ChevronDown size={16} /></button>
        <div className="nav-label">MENÜ</div>
        <nav className="main-nav" aria-label="Ana menü">
          {navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${activeTab === label ? 'active' : ''}`} onClick={() => { setActiveTab(label); setMobileMenu(false) }}><Icon size={18} strokeWidth={1.9} /><span>{label}</span>{label === 'Şimdi' && <span className="nav-dot" />}</button>)}
        </nav>
        <div className="nav-label areas-label">ALANLARIN <button className="tiny-plus" onClick={() => setToast('Özel alanlar yakında eklenebilecek')} aria-label="Alan ekle"><Plus size={14} /></button></div>
        <div className="area-list"><button><i className="area-dot dot-lavender" />Öğrenme<span>{tasks.filter((task) => task.category === 'Öğrenme').length}</span></button><button><i className="area-dot dot-rose" />Sağlık<span>{tasks.filter((task) => task.category === 'Sağlık').length}</span></button><button><i className="area-dot dot-blue" />Hobiler<span>{tasks.filter((task) => task.category === 'Hobiler').length}</span></button><button><i className="area-dot dot-peach" />Kişisel<span>{tasks.filter((task) => task.category === 'Kişisel').length}</span></button></div>
        <div className="sidebar-bottom">
          <div className="focus-card"><div className="focus-card-icon"><Zap size={16} fill="currentColor" /></div><div><b>Odak modun</b><p>Her seferinde tek adım.</p></div><span className="online-dot" /></div>
          <button className="nav-item settings-item" onClick={() => setSettingsOpen(true)}><Settings2 size={18} /><span>Ayarlar</span></button>
          <div className="sidebar-foot"><span className="status-pip" /> Bugün kendin için buradasın</div>
        </div>
      </aside>
      {mobileMenu && <button className="scrim" onClick={() => setMobileMenu(false)} aria-label="Menüyü kapat" />}

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu-button" onClick={() => setMobileMenu(true)} aria-label="Menüyü aç"><Menu size={20} /></button>
          <div className="breadcrumbs"><span>Alanım</span><ChevronRight size={14} /><b>{activeTab}</b></div>
          <div className="top-actions"><div className="date-chip"><CalendarDays size={15} /><span>{dateLabel}</span></div><button className="icon-button search-btn" onClick={() => { setSearchOpen(true); setSearchQuery(''); setShowArchived(false) }} aria-label="Görevlerde ara"><Search size={18} /></button><button className={`icon-button notification-btn ${remindersOn ? 'permission-granted' : ''}`} onClick={() => setSettingsOpen(true)} aria-label="Hatırlatma ayarlarını aç" title={remindersOn ? 'Hatırlatmalar etkin' : 'Hatırlatmalar kapalı'}><Bell size={18} /><i /></button><button type="button" className={`top-avatar avatar-tone-${profileAvatarTheme}`} onClick={openProfileEditor} aria-label="Profili düzenle">{profileAvatar ? <img src={profileAvatar} alt="" /> : profileInitial}</button></div>
        </header>
        {hasExampleData && <div className="example-data-banner"><span className="example-badge"><Sparkles size={14} /></span><p><b>Başlangıç örnek verileri</b><span> Görev ve alışkanlık örnekleri analizlere dahil. Dilediğinde kaldırabilirsin.</span></p><button onClick={removeExampleData}>Örnekleri kaldır</button></div>}

        {activeTab === 'Şimdi' && <section className="page-content">
          <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> {dateUpper} <span className="eyebrow-spark">✦</span></div><h1>Şimdi ne <em>yapmalıyım?</em></h1><p className="welcome-copy">Sıradaki görevini ve bugünkü planını burada görebilirsin.</p></div><button className="add-task-button" onClick={openNewTaskModal}><Plus size={17} /> Görev ekle</button></div>

          <div className="daily-snapshot" aria-label="Bugünün verileri">
            <article className="snapshot-card snapshot-plan"><span className="snapshot-icon"><CalendarDays size={17} /></span><div><small>BUGÜNÜN PLANI</small><b>{todayTasks.length}<span> görev</span></b><p>{plannedMinutes} dk planlandı</p></div></article>
            <article className="snapshot-card snapshot-done"><span className="snapshot-icon"><CheckCheck size={17} /></span><div><small>TAMAMLAMA</small><b>{doneCount}<span> / {todayTasks.length}</span></b><p>{progress}% gün ilerlemesi</p></div><i style={{ width: `${progress}%` }} /></article>
            <article className="snapshot-card snapshot-focus"><span className="snapshot-icon"><Clock3 size={17} /></span><div><small>ODAK SÜRESİ</small><b>{formatDuration(focusTodaySeconds)}</b><p>{formatDuration(learningTodaySeconds)} öğrenme</p></div></article>
            <article className="snapshot-card snapshot-habits"><span className="snapshot-icon"><Flower2 size={17} /></span><div><small>RUTİNLER</small><b>{checkedHabitsToday}<span> / {todayHabits.length}</span></b><p>{habitProgress}% bugünkü hedef</p></div></article>
          </div>
          {overdueTasks.length > 0 && <section className="overdue-review" aria-label="Günlük geciken görev değerlendirmesi"><div className="overdue-review-heading"><div><span className="section-kicker">GÜNLÜK GÖZDEN GEÇİRME</span><h3>{overdueTasks.length} geciken {overdueTasks.length === 1 ? 'görev' : 'görev'}</h3><p>Planın değişmedi. Her görev için ne yapmak istediğini seç.</p></div><button className="soft-select" onClick={() => setOverdueReviewExpanded((expanded) => !expanded)} aria-expanded={overdueReviewExpanded}>{overdueReviewExpanded ? 'Gizle' : 'Gözden geçir'} <ChevronDown size={14} /></button></div>{overdueReviewExpanded && <div className="overdue-review-list">{overdueTasks.map((task) => <article className="overdue-task" key={task.id}><div className="overdue-task-copy"><b>{task.title}</b><span>{new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(new Date(`${task.date ?? todayKey}T12:00:00`))} · planlanan saat {task.time}</span></div><div className="overdue-task-actions"><button onClick={() => openTaskEditor(task)}><Pencil size={14} /> Düzenle</button><button onClick={() => completeTask(task.id)}><Check size={14} /> Tamamlandı</button><button onClick={() => archiveTask(task)}><Trash2 size={14} /> Arşivle</button></div></article>)}</div>}</section>}
          {gamificationEnabled && <section className="xp-card" aria-label="İsteğe bağlı ilerleme"><div className="xp-copy"><span className="section-kicker">İSTEĞE BAĞLI İLERLEME</span><h3>Seviye {profileLevel} <span>·</span> {totalXp} XP</h3><p>XP kayıtlı etkinliklerinden hesaplanır; seri baskısı veya kaçırılan gün cezası yok.</p><div className="xp-track"><i style={{ width: `${levelXp}%` }} /></div><div className="skill-chips">{skillProgress.length ? skillProgress.slice(0, 3).map((skill) => <span key={skill.label}>{skill.label} · Seviye {Math.floor(skill.seconds / 7200) + 1}</span>) : <span>Odak kaydı geldikçe alan seviyeleri görünür.</span>}</div></div><div className="xp-total"><b>{levelXp}</b><span>/ 100 XP · sonraki seviye</span></div></section>}

          <div className="dashboard-grid">
            <div className="main-column">
              <section className="focus-panel" id="focus-panel">
                <div className="focus-panel-glow" />
                <div className="focus-panel-top"><div className="live-label"><span className="pulse-dot" /> ŞİMDİ ODAKLAN</div><button className="focus-more" onClick={() => nextTask && openTaskEditor(nextTask)} disabled={!nextTask || timerRunning} aria-label="Sıradaki görevi düzenle"><Pencil size={16} /></button></div>
                {nextTask ? <>
                  <div className="task-category"><span className={`category-glyph glyph-${nextTask.color}`}>{nextTask.icon === 'book' ? <BookOpen size={14} /> : nextTask.icon === 'flower' ? <Flower2 size={14} /> : <Target size={14} />}</span>{nextTask.category}<span className="category-divider">/</span><span className="task-due">{selectedFocusTask ? 'Odak seçimin' : 'Sıradaki görev'}</span><span className={`priority-chip priority-${nextTask.priority ?? 'normal'}`}>{nextTask.priority === 'high' ? 'Öncelikli' : nextTask.priority === 'low' ? 'Esnek' : 'Normal'}</span></div>
                  <h2>{nextTask.title}</h2>
                  <div className="task-meta"><span><Clock3 size={15} /> {nextTask.time} <span className="meta-separator">·</span> {nextTask.duration} dakika</span><span className="meta-divider" /><span className="soft-pill"><Zap size={13} /> {nextTask.energy === 'deep' ? 'Derin odak' : nextTask.energy === 'light' ? 'Hafif efor' : 'Dengeli efor'}</span></div>
                  <div className="focus-actions">{timerPhase === 'breakReady' ? <><button className="start-button" onClick={toggleFocusTimer}><Play size={16} fill="currentColor" /> {pomodoro.rest} dk molaya başla</button><button className="complete-button" onClick={finishBreak}>Mola yapmayacağım</button></> : timerPhase === 'break' ? <><button className="start-button" onClick={toggleFocusTimer}>{timerRunning ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}{timerRunning ? 'Molayı duraklat' : 'Molaya devam et'}</button><button className="complete-button" onClick={finishBreak}>Molayı bitir</button></> : <><button className="start-button" onClick={toggleFocusTimer}>{timerRunning ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}{timerRunning ? 'Duraklat' : seconds > 0 || pomodoroElapsed > 0 ? 'Devam et' : `${pomodoro.focus} dk odaklan`}</button><button className="complete-button" onClick={() => completeTask(nextTask.id)}><Check size={17} /> Tamamlandı</button><button className="snooze-button" onClick={() => snoozeTask(nextTask.id)}><AlarmClock size={16} /> Ertele</button></>}</div>
                  {(timerRunning || seconds > 0 || pomodoroElapsed > 0 || timerPhase === 'breakReady') && <div className={`timer-running timer-${timerPhase}`}><span className="timer-live" /> {timerPhase === 'break' ? 'Mola' : timerPhase === 'breakReady' ? 'Mola hazır' : `Pomodoro · ${pomodoro.focus} dk`} <b>{timerLabel}</b></div>}
                  {!timerRunning && timerPhase === 'focus' && seconds === 0 && pomodoroElapsed === 0 && <div className="pomodoro-picker"><span>Odak döngüsü</span>{pomodoroPresets.map((preset) => <button type="button" key={preset.key} className={pomodoroKey === preset.key ? 'selected' : ''} aria-pressed={pomodoroKey === preset.key} onClick={() => setPomodoroKey(preset.key)}><b>{preset.focus}/{preset.rest}</b><small>dk</small></button>)}</div>}
                </> : <div className="all-done"><div className="all-done-icon"><CheckCheck size={25} /></div><h2>Bugün için planlanan görev kalmadı.</h2><p>İstersen gününü burada bitirebilir veya yeni bir görev ekleyebilirsin.</p><button onClick={openNewTaskModal} className="complete-button"><Plus size={16} /> Yeni görev ekle</button></div>}
                <div className="focus-panel-footer"><span><Sparkles size={14} /> İlerleme, mükemmellikten daha önemli.</span><span className="panel-index">01 <i /> 04</span></div>
              </section>

              <section className="schedule-section">
                <div className="section-heading"><div><span className="section-kicker">BUGÜNÜN AKIŞI</span><h3>Günün planı <span className="heading-count">{todayTasks.length} görev</span></h3></div><button className="text-button" onClick={() => setActiveTab('Takvim')}>Tüm takvim <ArrowRight size={15} /></button></div>
                <div className="timeline-list">
                  {todayTasks.slice(0, 4).map((task, index) => <div className={`timeline-row ${task.done ? 'is-done' : ''}`} key={task.id}>
                    <div className="timeline-time">{task.time}</div><div className="timeline-track"><span className={`timeline-node ${task.done ? 'node-done' : index === 0 ? 'node-active' : ''}`}>{task.done ? <Check size={11} /> : null}</span>{index !== Math.min(todayTasks.length, 4) - 1 && <i className="timeline-line" />}</div>
                    <div className={`timeline-task task-${task.color}`}><div className="timeline-task-main"><span className="timeline-task-icon">{task.icon === 'book' ? <BookOpen size={15} /> : task.icon === 'flower' ? <Flower2 size={15} /> : <Target size={15} />}</span><div><b>{task.title}</b><small>{task.category} <span>·</span> {task.duration} dk</small></div></div><span className={`task-state ${task.done ? 'state-done' : ''}`}>{task.done ? 'Tamamlandı' : index === 0 ? 'Sıradaki' : 'Planlandı'}</span></div>
                  </div>)}
                </div>
                <button className="add-inline" onClick={openNewTaskModal}><Plus size={15} /> Gününe bir görev daha ekle</button>
              </section>
              <section className="smart-recommendations"><div className="recommendation-header"><span className="recommendation-art"><Sparkles size={18} /></span><div><span className="section-kicker">HIZLI SEÇİM</span><h3>Zamanına ve enerjine uygun bir görev</h3><p>Öneri seçmek takvimini değiştirmez; yalnızca odak kartını günceller.</p></div></div><div className="recommendation-controls"><div className="recommendation-control"><span>Ne kadar zamanın var?</span><div>{[15,30,45,60].map((minutes) => <button type="button" key={minutes} className={availableMinutes === minutes ? 'selected' : ''} aria-pressed={availableMinutes === minutes} onClick={() => setAvailableMinutes(minutes)}>{minutes} dk</button>)}</div></div><div className="recommendation-control"><span>Enerji düzeyin</span><div>{energyChoices.map(({ value, label }) => <button type="button" key={value} className={recommendationEnergy === value ? 'selected' : ''} aria-pressed={recommendationEnergy === value} onClick={() => setRecommendationEnergy(value)}>{label}</button>)}</div></div></div><div className="recommendation-results">{recommendedTasks.length ? recommendedTasks.map((task) => <article className="recommendation-task" key={task.id}><span className={`recommendation-task-icon tone-${availableCategories.find((item) => item.label === task.category)?.tone ?? 'lilac'}`}>{(() => { const Icon = availableCategories.find((item) => item.label === task.category)?.icon ?? Focus; return <Icon size={17} /> })()}</span><div><small>{task.category} · {task.duration} dk{task.priority === 'high' ? ' · Öncelikli' : ''}</small><b>{task.title}</b></div><button type="button" disabled={timerRunning} title={timerRunning ? 'Odak oturumu sürerken görev değiştirilemez.' : undefined} onClick={() => { setFocusTaskId(task.id); document.getElementById('focus-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }}>Seç <ArrowRight size={14} /></button></article>) : <div className="recommendation-empty"><span><Clock3 size={17} /></span><p>Bu süre ve enerji seçimine uyan bugünkü görev yok. Filtreyi değiştirebilir veya kendin görev ekleyebilirsin.</p></div>}</div></section>
            </div>

            <aside className="right-column">
              <section className="progress-card"><div className="section-heading compact"><div><span className="section-kicker">İSTİKRAR KAZANIYOR</span><h3>Günün ilerlemesi</h3></div><button className="more-round" aria-label="Daha fazla"><MoreHorizontal size={18} /></button></div><div className="progress-body"><div className="ring-wrap"><svg viewBox="0 0 120 120" className="progress-ring" aria-label={`${progress} yüzde tamamlandı`}><circle className="ring-track" cx="60" cy="60" r="49" /><circle className="ring-fill" cx="60" cy="60" r="49" style={{ strokeDashoffset: `${307.9 - (307.9 * progress / 100)}` }} /></svg><div className="ring-center"><b>{progress}%</b><span>tamamlandı</span></div></div><div className="progress-stats"><div><span className="stat-dot dot-violet" /><span>Tamamlandı</span><b>{doneCount}</b></div><div><span className="stat-dot dot-light" /><span>Kalan</span><b>{todayTasks.length - doneCount}</b></div><div><span className="stat-dot dot-peach" /><span>Odak süresi</span><b>{formatDuration(focusTodaySeconds)}</b></div></div></div><div className="progress-bottom"><span>Bugünkü ilerlemen</span><span className="mini-sparkles">✦ ✦ ✦</span></div></section>

              <section className="habit-card"><div className="section-heading compact"><div><span className="section-kicker">KÜÇÜK RİTÜELLER</span><h3>Alışkanlıkların</h3></div><button className="arrow-round" onClick={() => setActiveTab('Alışkanlıklar')} aria-label="Alışkanlıklara git"><ArrowRight size={16} /></button></div><div className="habit-list">{habits.slice(0, 3).map((habit) => <div className="habit-row" key={habit.id}><div className={`habit-icon habit-${habit.icon}`}>{habit.icon === 'book' ? <BookOpen size={16} /> : habit.icon === 'spark' ? <Sparkles size={16} /> : <span className="water-drop">●</span>}</div><div className="habit-info"><b>{habit.name}</b><small>{habit.detail} · {habitStatsById.get(habit.id)?.checkCount ?? 0}/{habitStatsById.get(habit.id)?.target ?? habit.weeklyTarget ?? 7} bu hafta</small><div className="habit-progress"><i style={{ width: `${habitStatsById.get(habit.id)?.progress ?? 0}%` }} /></div></div><button className={`habit-check ${habit.checked ? 'checked' : ''}`} onClick={() => toggleHabit(habit.id)} aria-label={`${habit.name} alışkanlığını işaretle`}>{habit.checked ? <Check size={14} /> : null}</button></div>)}</div><button className="text-button habit-view" onClick={() => setActiveTab('Alışkanlıklar')}>Tüm alışkanlıklar <ArrowRight size={14} /></button></section>

              <section className="quote-card"><div className="quote-mark">“</div><p>Biraz ilerlemek,<br /><b>hiç başlamamaktan iyidir.</b></p><div className="quote-bottom"><span>BUGÜNÜN NOTU</span><div><i /><i /><i /></div></div></section>
            </aside>
          </div>
          <footer className="page-footer"><span>Violet Focus <i>·</i> Kendine verdiğin sözü tut.</span><button onClick={() => setToast('Geri bildirim yakında!')}><CircleHelp size={14} /> Yardım & geri bildirim</button></footer>
        </section>}

        {activeTab === 'Takvim' && <section className="page-content secondary-page"><div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> ZAMANINI SAHİPLEN</div><h1>Takvimin, <em>senin ritmin.</em></h1><p className="welcome-copy">Planını gör, boşluklarını fark et, gününe yer aç.</p></div><button className="add-task-button" onClick={openNewTaskModal}><Plus size={17} /> Görev ekle</button></div><div className="calendar-toolbar"><div className="calendar-month"><button className="calendar-nav" onClick={() => calendarView === 'week' ? shiftCalendarWeek(-1) : shiftCalendarMonth(-1)} aria-label={calendarView === 'week' ? "Önceki hafta" : "Önceki ay"}><ChevronLeft size={18} /></button><b>{new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(selectedCalendarDate)}</b><button className="calendar-nav" onClick={() => calendarView === 'week' ? shiftCalendarWeek(1) : shiftCalendarMonth(1)} aria-label={calendarView === 'week' ? "Sonraki hafta" : "Sonraki ay"}><ChevronRight size={18} /></button></div><div className="calendar-mode"><button type="button" className={calendarView === 'week' ? 'selected' : ''} aria-pressed={calendarView === 'week'} onClick={() => setCalendarView('week')}>Hafta</button><button type="button" className={calendarView === 'month' ? 'selected' : ''} aria-pressed={calendarView === 'month'} onClick={() => setCalendarView('month')}>Ay</button></div></div>{calendarView === 'week' ? <div className="week-strip">{calendarWeek.map((day) => <button className={`week-day ${dateKey(day) === selectedDay ? 'selected' : ''} ${moveSelectionTaskId !== null ? 'move-target' : ''}`} key={dateKey(day)} onClick={() => selectCalendarDate(day)} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }} onDrop={(event) => handleCalendarDrop(event, day)}><span>{new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(day).replace('.', '')}</span><b>{day.getDate()}</b><i className={tasks.some((task) => !task.archived && (task.date ?? todayKey) === dateKey(day)) ? 'has-events' : ''} /></button>)}</div> : <div className="month-calendar"><div className="month-weekdays">{week.map((day) => <span key={day}>{day}</span>)}</div><div className="month-grid">{calendarMonthDays.map((day) => { const key = dateKey(day); const dayCount = tasks.filter((task) => !task.archived && (task.date ?? todayKey) === key).length; return <button type="button" key={key} className={`month-day ${key === selectedDay ? 'selected' : ''} ${dateKey(day).slice(0, 7) === selectedDay.slice(0, 7) ? '' : 'outside-month'} ${key === todayKey ? 'is-today' : ''} ${moveSelectionTaskId !== null ? 'move-target' : ''}`} aria-label={`${new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).format(day)}${dayCount ? `, ${dayCount} görev` : ''}`} aria-pressed={key === selectedDay} onClick={() => selectCalendarDate(day)} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }} onDrop={(event) => handleCalendarDrop(event, day)}><span className="month-day-number">{day.getDate()}</span>{dayCount > 0 && <span className="month-day-count">{dayCount}</span>}{dayCount > 0 && <i />}</button> })}</div></div>}{moveSelectionTaskId !== null && <div className="calendar-move-hint"><CalendarDays size={15} /> Taşımak istediğin görevin yeni gününü yukarıdan seç. Plan, onayından önce değişmez.<button onClick={() => setMoveSelectionTaskId(null)}>Vazgeç</button></div>}<div className="calendar-layout"><div className="day-agenda"><div className="agenda-heading"><div><span className="section-kicker">{selectedCalendarLabel}</span><h3>Günün akışı</h3></div><span className="agenda-total">{selectedTasks.length} planlı görev</span></div>{selectedTasks.length ? selectedTasks.map((task) => <div className="agenda-hour" key={task.id}><span>{task.time}</span><div className="hour-line"><div className={`agenda-event event-${task.color} ${draggingTaskId === task.id ? 'is-dragging' : ''}`} draggable onDragStart={(event) => { event.dataTransfer.setData('text/plain', String(task.id)); event.dataTransfer.effectAllowed = 'move'; setDraggingTaskId(task.id) }} onDragEnd={() => setDraggingTaskId(null)}><div className="agenda-event-copy"><b>{task.title}</b><small>{task.duration} dakika · {task.category}{task.priority === 'high' ? ' · Öncelikli' : ''}{task.done ? ' · Tamamlandı' : ''}</small>{task.notes && <em>{task.notes}</em>}</div><div className="agenda-event-actions"><button onClick={() => openTaskEditor(task)} aria-label={`${task.title} görevini düzenle`} title="Düzenle"><Pencil size={14} /></button><button onClick={() => { setMoveSelectionTaskId(task.id); setToast('Taşınacak günü takvimden seç.') }} aria-label={`${task.title} görevini başka güne taşı`} title="Başka güne taşı"><CalendarDays size={14} /></button><button onClick={() => deleteTask(task)} aria-label={`${task.title} görevini sil`} title="Sil"><Trash2 size={14} /></button></div></div></div></div>) : <div className="empty-agenda"><CalendarDays size={22} /><b>Bu gün için plan yok</b><span>İstersen boşluğu kendine ayır ya da görev ekle.</span></div>}</div><aside className="calendar-side"><div className="side-note"><span className="section-kicker">GÜNÜN ÖZETİ</span><div className="side-note-number">{selectedTasks.length}<small> görev</small></div><p>Bir plan, esneklik için de yer bırakır.</p><div className="side-note-bottom"><Clock3 size={15} /> {selectedPlannedMinutes} dk planlandı</div></div><div className="glass-note"><Sparkles size={17} /><p><b>Bir boşluk fark ettin mi?</b><br />Hedeflerinden birini uygun zamana yerleştirmeyi deneyebilirsin.</p><button onClick={openPlanSuggestions}>Boşluk önerisi al <ArrowRight size={14} /></button></div></aside></div></section>}

        {activeTab === 'Alışkanlıklar' && <section className="page-content secondary-page"><div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> HER GÜN BİRAZ DAHA</div><h1>Küçük ritüeller, <em>büyük farklar.</em></h1><p className="welcome-copy">İstikrar, kendine verdiğin sözleri tutmakla başlar.</p></div><button className="add-task-button" onClick={openHabitModal}><Plus size={17} /> Alışkanlık ekle</button></div><div className="stats-row"><div className="stat-tile"><span className="tile-icon lavender"><Flame size={18} /></span><div><small>EN UZUN SERİ</small><b>{longestHabitDays} gün</b><span>kaydedilen en uzun seri</span></div></div><div className="stat-tile"><span className="tile-icon mint"><Target size={18} /></span><div><small>BU HAFTA</small><b>{weeklyHabitProgress}%</b><span>haftalık hedef tutarlılığı</span></div></div><div className="stat-tile"><span className="tile-icon peach"><CheckCheck size={18} /></span><div><small>TAMAMLANAN</small><b>{weeklyHabitChecks}</b><span>işaret bu hafta</span></div></div></div><div className="habits-layout"><section className="habits-main-card"><div className="section-heading"><div><span className="section-kicker">BUGÜN, {new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(now).toLocaleUpperCase('tr-TR')}</span><h3>Bugünkü ritüellerin</h3></div><button className="soft-select">Bu hafta <ChevronDown size={14} /></button></div>{habits.map((habit) => <div className="habit-detail-row" key={habit.id}><div className={`habit-icon habit-${habit.icon}`}>{habit.icon === 'book' ? <BookOpen size={17} /> : habit.icon === 'spark' ? <Sparkles size={17} /> : <span className="water-drop">●</span>}</div><div className="habit-detail-copy"><b>{habit.name}</b><span>{habit.detail} · {habitStatsById.get(habit.id)?.checkCount ?? 0}/{habitStatsById.get(habit.id)?.target ?? habit.weeklyTarget ?? 7} bu hafta</span><div className="habit-progress wide"><i style={{ width: `${habitStatsById.get(habit.id)?.progress ?? 0}%` }} /></div></div><span className="habit-percent">{habitStatsById.get(habit.id)?.progress ?? 0}%</span><button className="habit-edit-button" onClick={() => editHabit(habit)} aria-label={`${habit.name} alışkanlığını düzenle`}><Pencil size={14} /></button><button className={`habit-check large ${habit.checked ? 'checked' : ''}`} onClick={() => toggleHabit(habit.id)} aria-label="Alışkanlığı tamamla">{habit.checked && <Check size={15} />}</button></div>)}</section><section className="consistency-card"><div className="section-heading compact"><div><span className="section-kicker">SON 4 HAFTA</span><h3>Alışkanlık takvimi</h3></div></div><label className="habit-calendar-filter" htmlFor="habit-calendar-select">Takvimde göster</label><select id="habit-calendar-select" className="habit-calendar-select" value={habitCalendarId} onChange={(event) => setHabitCalendarId(event.target.value === 'all' ? 'all' : Number(event.target.value))}><option value="all">Tüm alışkanlıklar</option>{habits.map((habit) => <option key={habit.id} value={habit.id}>{habit.name}</option>)}</select><div className="habit-calendar-weekdays" aria-hidden="true">{week.map((day) => <span key={day}>{day}</span>)}</div><div className="heatmap-grid habit-calendar-grid" aria-label="Son dört haftanın alışkanlık takvimi">{habitHeatmapDays.map((day) => { const dayNumber = Number(day.key.slice(-2)); const dayLabel = calendarHabit ? ({ completed: 'Tamamlandı', missed: 'Planlı, işaretlenmedi', today: 'Bugün, henüz işaretlenmedi', upcoming: 'Yaklaşan planlı gün', flexible: 'Esnek gün, kayıt yok', off: 'Plan dışı gün' } as const)[day.state] : `${day.count} alışkanlık işareti`; const dateLabel = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${day.key}T12:00:00`)); return <div key={day.key} className={`habit-calendar-cell ${calendarHabit ? `calendar-${day.state}` : `heat-${Math.min(day.count, 4)}`} ${day.key === todayKey ? 'calendar-is-today' : ''}`} role="img" aria-label={`${dateLabel}: ${dayLabel}`} title={`${dateLabel} · ${dayLabel}`}><span>{dayNumber}</span><i /></div> })}</div><div className="habit-calendar-legend">{calendarHabit?.frequencyMode === 'selectedDays' ? <><span><i className="legend-done" />Tamamlandı</span><span><i className="legend-missed" />Planlı, işaret yok</span><span><i className="legend-off" />Plan dışı</span></> : <><span><i className="legend-done" />Kayıt var</span><span><i className="legend-off" />Kayıt yok</span></>}</div><div className="consistency-footer"><span>{calendarHabit?.frequencyMode === 'selectedDays' ? `${habitCalendarDoneDays} tamamlandı · ${habitCalendarMissedDays} planlı günde işaret yok` : calendarHabit ? `${habitCalendarDoneDays} tamamlanan gün · haftalık hedef ${calendarHabit.weeklyTarget ?? 7} kez` : 'Son 4 haftada kaydedilen'}</span><b>{calendarHabit ? calendarHabit.name : habitCalendarDoneDays ? `${habitHeatmapDays.reduce((sum, day) => sum + day.count, 0)} işaret` : 'Henüz kayıt yok'}</b></div></section></div></section>}

        {activeTab === 'Öğrenme' && <section className="page-content secondary-page">
          <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> MERAKINI CANLI TUT</div><h1>Her gün biraz daha <em>öğren.</em></h1><p className="welcome-copy">Zamanını kaydet, hedeflerini küçük adımlara böl.</p></div><div className="learning-actions"><button className="secondary-action-button" onClick={openStudyLogModal}><Clock3 size={15} /> Süre kaydet</button><button className="add-task-button" onClick={openGoalModal}><Plus size={16} /> Hedef oluştur</button></div></div>
          <div className="learning-summary"><div className="learning-summary-copy"><span className="section-kicker">BU HAFTAKİ ÖĞRENME SÜRESİ</span><h3>{formatDuration(weeklyStudySeconds)} <span>kayıtlı</span></h3><p>{weeklySessionCount} zamanlayıcı oturumu · {manualStudyLogs.filter((log) => analysisWeek.some((day) => dateKey(day) === log.date)).reduce((sum, log) => sum + log.minutes, 0)} dk manuel kayıt</p></div><div className="study-bars">{week.map((day, i) => <div className="study-bar-column" key={day}><i style={{ height: `${Math.max(4, learningWeekByDay[i] / 60 / maxLearningMinutes * 100)}%` }} className={dateKey(analysisWeek[i]) === todayKey ? 'bar-today' : ''} /><small>{day}</small></div>)}</div></div>
          <div className="learning-section-head"><div><span className="section-kicker">KÜÇÜK ADIMLAR</span><h3>Öğrenme hedeflerin</h3></div><button className="text-button" onClick={openGoalModal}><Plus size={14} /> Hedef ekle</button></div>
          <div className="learning-goal-grid">{learningGoals.length ? learningGoals.map((goal) => { const completed = goal.milestones.filter((step) => step.done).length; const goalMinutes = manualStudyLogs.filter((log) => log.goalId === goal.id).reduce((sum, log) => sum + log.minutes, 0); const ratio = goal.milestones.length ? Math.round(completed / goal.milestones.length * 100) : 0; return <article className="learning-goal-card" key={goal.id}><div className="goal-card-head"><span className="goal-art"><BookOpen size={19} /></span><span className="goal-step-count">{completed}/{goal.milestones.length} adım</span></div><h3>{goal.title}</h3><p>{goal.description || 'Hedefini küçük ve tamamlanabilir adımlara böl.'}</p><div className="goal-progress-label"><span>Milestone ilerlemesi</span><b>{ratio}%</b></div><div className="goal-progress-track"><i style={{ width: `${ratio}%` }} /></div><div className="goal-milestones">{goal.milestones.length ? goal.milestones.map((step) => <button type="button" className={`milestone-row ${step.done ? 'is-complete' : ''}`} key={step.id} onClick={() => toggleMilestone(goal.id, step.id)} aria-pressed={step.done}><span>{step.done && <Check size={12} />}</span><b>{step.title}</b></button>) : <small className="milestone-empty">İlk adımını ekleyerek başla.</small>}</div><form className="milestone-add-form" onSubmit={(event) => addMilestone(event, goal.id)}><input aria-label={`${goal.title} için milestone ekle`} placeholder="Yeni bir küçük adım…" value={milestoneDrafts[goal.id] ?? ''} onChange={(event) => setMilestoneDrafts((drafts) => ({ ...drafts, [goal.id]: event.target.value }))} maxLength={70} /><button type="submit" disabled={!(milestoneDrafts[goal.id] ?? '').trim()} aria-label="Milestone ekle"><Plus size={15} /></button></form><div className="goal-study-time"><Clock3 size={13} /> {goalMinutes} dk manuel çalışma bu hedefle ilişkili</div></article> }) : <div className="learning-empty goal-empty"><span className="goal-empty-art"><Target size={22} /></span><b>Henüz öğrenme hedefi yok</b><span>Bir hedef oluştur; sonra onu takip edilebilir adımlara böl.</span><button className="text-button" onClick={openGoalModal}><Plus size={14} /> İlk hedefini oluştur</button></div>}</div>
          <div className="learning-section-head"><div><span className="section-kicker">PLANIN</span><h3>Öğrenme görevlerin</h3></div><button className="soft-select" onClick={openNewTaskModal}><Plus size={13} /> {learningTasks.length} görev</button></div>
          <div className="course-grid">{learningTasks.length ? learningTasks.map((task) => { const taskSeconds = focusSessions.filter((session) => session.taskTitle === task.title).reduce((sum, session) => sum + session.seconds, 0); return <article className="course-card course-purple" key={task.id}><div className="course-card-top"><span className="course-icon"><BookOpen size={19} /></span><span className={`task-state ${task.done ? 'state-done' : ''}`}>{task.done ? 'Tamamlandı' : 'Planlandı'}</span></div><span className="course-tag">ÖĞRENME · {task.date === todayKey ? 'BUGÜN' : task.date}</span><h3>{task.title}</h3><p>{task.time} · {task.duration} dakika planlandı</p><div className="course-footer"><span><Clock3 size={14} />{taskSeconds ? `${formatDuration(taskSeconds)} zamanlayıcı` : 'Henüz süre kaydı yok'}</span><button onClick={() => { setSelectedDay(task.date ?? todayKey); setCalendarAnchor(task.date ?? todayKey); setActiveTab('Takvim') }}>Takvimde gör <ArrowRight size={14} /></button></div></article> }) : <div className="learning-empty"><BookOpen size={22} /><b>Henüz öğrenme görevi yok</b><span>Bir öğrenme görevi oluşturup takvimine ekleyebilirsin.</span><button className="text-button" onClick={openNewTaskModal}><Plus size={14} /> Öğrenme görevi ekle</button></div>}</div>
          <div className="study-log"><div className="section-heading"><div><span className="section-kicker">ÇALIŞMA GEÇMİŞİ</span><h3>Çalışma günlüğün</h3></div><button className="text-button" onClick={openStudyLogModal}><Plus size={14} /> Manuel kayıt</button></div>{studyLogEntries.length ? studyLogEntries.slice(0, 8).map((entry) => <div className="log-row" key={entry.id}><div className={`log-icon ${entry.source === 'Manuel kayıt' ? 'manual-log-icon' : ''}`}>{entry.source === 'Manuel kayıt' ? <Pencil size={15} /> : <BookOpen size={16} />}</div><div><b>{entry.title}</b><small>{entry.dateLabel} · {entry.source}{entry.note ? ` · ${entry.note}` : ''}</small></div><strong>{formatDuration(entry.seconds)}</strong>{entry.source === 'Zamanlayıcı' && <Check size={16} className="log-check" />}</div>) : <p className="empty-data-note">Henüz kayıt yok. Zamanlayıcıyı kullanabilir veya geçmiş bir çalışma süresini kendin ekleyebilirsin.</p>}</div>
        </section>}

        {activeTab === 'Analiz' && <section className="page-content secondary-page"><div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> KENDİ RİTMİNİ KEŞFET</div><h1>İlerlemene <em>bir bak.</em></h1><p className="welcome-copy">Veriler yargılamak için değil, kendini daha iyi tanımak için.</p></div><div className="analysis-range-switch" role="group" aria-label="Analiz dönemi"><button type="button" className={analysisPeriod === 'week' ? 'selected' : ''} aria-pressed={analysisPeriod === 'week'} onClick={() => setAnalysisPeriod('week')}>Bu hafta</button><button type="button" className={analysisPeriod === '4weeks' ? 'selected' : ''} aria-pressed={analysisPeriod === '4weeks'} onClick={() => setAnalysisPeriod('4weeks')}>Son 4 hafta</button></div></div><div className="insight-stats">
          <div className="insight-tile"><span className="section-kicker">GÖREV TAMAMLAMA</span><b>{rangeTasks.length ? <>{rangeCompletion}<span>%</span></> : '—'}</b><small>{rangeTasks.length ? `${rangeDoneTasks} / ${rangeTasks.length} zamanı gelen görev` : 'Henüz zamanı gelen görev yok'}</small></div>
          <div className="insight-tile"><span className="section-kicker">ODAK SÜRESİ</span><b>{Math.floor(rangeFocusSeconds / 3600)}<small>sa</small></b><small>{Math.floor((rangeFocusSeconds % 3600) / 60)} dk kaydedildi</small></div>
          <div className="insight-tile"><span className="section-kicker">ALIŞKANLIK İŞARETLERİ</span><b>{rangeHabitChecks}</b><small>seçili dönemde kaydedildi</small></div>
          <div className="insight-tile"><span className="section-kicker">ÖĞRENME ODAĞI</span><b>{Math.floor(rangeStudySeconds / 3600)}<small>sa</small></b><small>{Math.floor((rangeStudySeconds % 3600) / 60)} dk · timer + manuel kayıt</small></div>
        </div><div className="insights-grid"><section className="chart-card"><div className="section-heading"><div><span className="section-kicker">PLAN / ODAK KAYDI</span><h3>Plan ve odak zamanın</h3></div><span className="range-indicator">{analysisPeriod === 'week' ? 'Bu hafta' : 'Son 4 hafta'}</span></div><div className="legend"><span><i className="legend-planned" /> Planlanan</span><span><i className="legend-actual" /> Odak kaydı</span></div><div className={`chart-bars range-chart-bars ${analysisPeriod === '4weeks' ? 'four-weeks' : ''}`}>{rangeChartItems.some((item) => item.planned > 0 || item.focus > 0) ? rangeChartItems.map((item) => <div className="chart-day" key={item.label}><div className="bar-pair"><i title={`Planlanan ${item.planned} dakika`} style={{ height: `${item.planned ? Math.max(4, item.planned / rangeMaxMinutes * 100) : 0}%` }} /><i title={`Odak ${Math.floor(item.focus / 60)} dakika`} style={{ height: `${item.focus ? Math.max(4, item.focus / 60 / rangeMaxMinutes * 100) : 0}%` }} /></div><small>{item.label}</small></div>) : <p className="empty-data-note">Bu dönemde plan veya zamanlayıcı kaydı yok.</p>}</div></section><section className="category-card"><div className="section-heading compact"><div><span className="section-kicker">KATEGORİ DAĞILIMI</span><h3>Odak alanların</h3></div><button className="more-round"><MoreHorizontal size={18} /></button></div><div className="category-breakdown"><div className="donut-chart" style={{ background: rangeDonutGradient }}><div><b>{rangeFocusSeconds ? Math.floor(rangeFocusSeconds / 3600) : '—'}</b><small>sa odak</small></div></div><div className="category-legend">{rangeCategoryTotals.length ? rangeCategoryTotals.map((item) => <div key={item.category}><i style={{ background: categoryPalette[item.category] ?? '#a89aba' }} /><span>{item.category}</span><b>{Math.round(item.seconds / rangeTotalCategorySeconds * 100)}%</b></div>) : <p className="empty-data-note">Odak oturumu kaydedildikçe kategori dağılımı burada görünür.</p>}</div></div></section><section className="trend-card"><div className="section-heading"><div><span className="section-kicker">KÜÇÜK BİR İÇGÖRÜ</span><h3>{analysisPeriod === 'week' ? 'Bu haftanın odağı' : 'Son 4 haftanın özeti'}</h3></div><span className="trend-icon"><TrendingUp size={17} /></span></div><p>{rangeSessionCount ? <>Seçili dönemde <b>{rangeSessionCount} odak oturumu</b> kaydettin; toplam {Math.floor(rangeFocusSeconds / 60)} dakika timer kaydı var.</> : 'Bu dönemde timer oturumu kaydı yok. İlk oturumunu tamamladığında burada görünür.'}</p><div className="trend-bottom"><span><Sparkles size={14} /> Veriden öğren, kendine göre planla.</span><button onClick={() => setAnalysisDetailOpen(true)}>Ayrıntılar <ArrowRight size={14} /></button></div></section><section className="category-time-card"><div className="section-heading"><div><span className="section-kicker">SÜRE KAYDI</span><h3>Plan ve odak verisi</h3></div><span className="range-indicator">{analysisPeriod === 'week' ? 'Bu hafta' : 'Son 4 hafta'}</span></div><div className="accuracy-row"><span>Zamanı gelen plan {rangeElapsedPlanMinutes} dk · kaydedilen {Math.floor(rangeFocusSeconds / 60)} dk</span><b>{rangeElapsedPlanMinutes ? `${rangeRecordedOfPlanned}%` : '—'}</b></div><div className="accuracy-track"><i style={{ width: `${rangeElapsedPlanMinutes ? rangeRecordedOfPlanned : 0}%` }} /></div><p>Odak verisi yalnızca zamanlayıcıyla kaydedilen oturumları içerir; görev süresi gerçekleşen süre sayılmaz.</p></section></div><section className="data-tools-card"><div className="data-tools-illustration"><ShieldCheck size={20} /></div><div className="data-tools-copy"><span className="section-kicker">VERİLERİNİN KONTROLÜ SENDE</span><h3>Yedekle veya geri yükle</h3><p>Veriler varsayılan olarak bu cihazda kalır. JSON yedeği görevleri, rutinleri, öğrenme hedeflerini, özel kategorileri ve kayıtları içerir.</p></div><div className="data-tools-actions"><button className="secondary-action-button" onClick={exportBackup}><ArrowDownToLine size={15} /> Yedek indir</button><button className="add-task-button" onClick={() => importInputRef.current?.click()}><Upload size={15} /> Yedek seç</button><input ref={importInputRef} className="visually-hidden-file" type="file" accept="application/json,.json" onChange={importBackup} /></div></section></section>}
      </main>

      <nav className="mobile-tab-bar" aria-label="Alt gezinme">
        {navItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className={`mobile-tab ${activeTab === label ? 'active' : ''}`}
            onClick={() => setActiveTab(label)}
            aria-label={label}
            aria-current={activeTab === label ? 'page' : undefined}
          >
            <Icon size={19} strokeWidth={activeTab === label ? 2.2 : 1.8} />
            <span>{label === 'Alışkanlıklar' ? 'Rutinler' : label}</span>
          </button>
        ))}
      </nav>

      {profileOpen && <div className="modal-backdrop profile-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setProfileOpen(false) }}><form className="task-modal profile-modal profile-editor-modal" onSubmit={saveProfile} role="dialog" aria-modal="true" aria-labelledby="profile-title"><header className="profile-editor-header"><div><span className="section-kicker">KİŞİSEL ALANIN</span><h2 id="profile-title">Profilini özelleştir</h2><p>Görünüşünü ve ilerleme tercihlerini düzenle.</p></div><button type="button" className="icon-button" onClick={() => setProfileOpen(false)} aria-label="Kapat"><X size={19} /></button></header><section className="profile-identity-card"><div className={`profile-editor-avatar avatar-tone-${profileAvatarThemeDraft}`}>{profileAvatarDraft ? <img src={profileAvatarDraft} alt="Profil fotoğrafı önizlemesi" /> : profileNameDraft.trim().slice(0, 1).toLocaleUpperCase('tr-TR') || 'V'}<span className="profile-avatar-sparkle"><Sparkles size={13} /></span></div><div className="profile-identity-copy"><span className="section-kicker">VIOLET FOCUS ÜYESİ</span><h3>{profileNameDraft.trim() || 'Görünen adın'}</h3><p>Bu cihazdaki kişisel çalışma alanın</p><input ref={profileImageInputRef} className="visually-hidden-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleProfileImageChange} /><div className="profile-photo-actions"><button type="button" className="profile-photo-button" onClick={() => profileImageInputRef.current?.click()}><Upload size={14} /> Fotoğraf seç</button>{profileAvatarDraft && <button type="button" className="profile-remove-photo" onClick={() => setProfileAvatarDraft(null)}>Kaldır</button>}</div><small className="profile-photo-help">JPG, PNG veya WebP · 8 MB’a kadar</small></div></section><section className="profile-editor-section"><div className="profile-section-heading"><span className="section-kicker">GÖRÜNÜŞ</span><small>Fotoğrafın yoksa baş harfin kullanılır.</small></div><div className="profile-color-row" role="group" aria-label="Profil rengi">{[{ key: 'lavender', label: 'Lavanta' }, { key: 'violet', label: 'Menekşe' }, { key: 'rose', label: 'Gül kurusu' }, { key: 'sky', label: 'Gökyüzü' }].map((tone) => <button type="button" key={tone.key} className={`profile-color-option tone-${tone.key} ${profileAvatarThemeDraft === tone.key ? 'selected' : ''}`} aria-label={`${tone.label} profil rengi`} aria-pressed={profileAvatarThemeDraft === tone.key} onClick={() => setProfileAvatarThemeDraft(tone.key as 'lavender' | 'violet' | 'rose' | 'sky')}><i /><span>{tone.label}</span>{profileAvatarThemeDraft === tone.key && <Check size={13} />}</button>)}</div></section><section className="profile-editor-section"><div className="profile-section-heading"><span className="section-kicker">KİMLİK</span><small>Uygulamada görünecek adın</small></div><label htmlFor="profile-name">Görünen ad</label><input id="profile-name" maxLength={32} value={profileNameDraft} onChange={(event) => setProfileNameDraft(event.target.value)} required /></section><section className="profile-progress-section"><label className="profile-gamification-toggle"><input type="checkbox" checked={profileGamificationDraft} onChange={(event) => setProfileGamificationDraft(event.target.checked)} /><span><b>İsteğe bağlı XP ve seviye ilerlemesi</b><small>Yalnızca kaydedilmiş etkinliklerden hesaplanır. Seri baskısı veya kaçırılan gün cezası yok.</small></span></label>{profileGamificationDraft ? <div className="profile-level-preview"><span className="profile-level-icon"><Sparkles size={17} /></span><div><b>Seviye {profileLevel} <i>·</i> {totalXp} XP</b><span>Bir sonraki seviyeye {100 - levelXp} XP</span><div className="profile-level-track"><i style={{ width: `${levelXp}%` }} /></div></div></div> : <p className="profile-private-note"><ShieldCheck size={14} /> Profil bilgilerin bu cihazda saklanır; fotoğraf buluta yalnızca sen şifreli yedeklemeyi başlatırsan eklenir.</p>}</section><footer className="profile-editor-actions"><button type="button" className="planner-back" onClick={() => setProfileOpen(false)}>Vazgeç</button><button type="submit" className="start-button"><Check size={15} /> Profili kaydet</button></footer></form></div>}
      {suggestionOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSuggestionOpen(false) }}><section className="task-modal suggestion-modal" role="dialog" aria-modal="true" aria-labelledby="suggestion-title"><div className="modal-top"><div className="planner-heading"><span className="planner-mark"><Sparkles size={18} /></span><div><span className="section-kicker">TAKVİM ÖNERİSİ</span><h2 id="suggestion-title">Uygun boşluklar</h2><p>{selectedCalendarLabel} için süre ve efor tercihine göre.</p></div></div><button type="button" className="icon-button" onClick={() => setSuggestionOpen(false)} aria-label="Kapat"><X size={19} /></button></div>{taskSuggestions.length ? <><div className="suggestion-list">{taskSuggestions.map((suggestion) => { const task = tasks.find((item) => item.id === suggestion.taskId); return task ? <button type="button" className="suggestion-option" key={task.id} onClick={() => choosePlanSuggestion(suggestion)}><span className="suggestion-time">{suggestion.time}</span><span className="suggestion-option-copy"><b>{task.title}</b><small>{task.duration} dk · {task.category} · {suggestion.reason} · şu an {task.date ?? todayKey} {task.time}</small></span><ArrowRight size={16} /></button> : null })}</div><p className="analysis-detail-note">Seçmek planı hemen değiştirmez. Önce taşıma önizlemesini görür, son kararı sen verirsin.</p></> : <div className="suggestion-empty">Bu günün boşluklarında süre ve efor tercihine uyan taşınabilir görev bulunamadı. Takvim planı değişmedi.</div>}</section></div>}
      {analysisDetailOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAnalysisDetailOpen(false) }}><section className="task-modal analysis-detail-modal" role="dialog" aria-modal="true" aria-labelledby="analysis-detail-title"><div className="modal-top"><div className="planner-heading"><span className="planner-mark"><LayoutGrid size={18} /></span><div><span className="section-kicker">{analysisPeriod === 'week' ? 'BU HAFTA' : 'SON 4 HAFTA'}</span><h2 id="analysis-detail-title">Analiz ayrıntıları</h2><p>Plan, zamanlayıcı kaydı, öğrenme ve alışkanlık işaretleri ayrı gösterilir.</p></div></div><button type="button" className="icon-button" onClick={() => setAnalysisDetailOpen(false)} aria-label="Kapat"><X size={19} /></button></div><span className="section-kicker">PLAN / ZAMANLAYICI</span><div className="analysis-detail-list">{rangeChartItems.map((item) => <div className="analysis-detail-row" key={item.label}><span>{item.label}</span><b>{item.planned} dk plan · {Math.floor(item.focus / 60)} dk timer</b></div>)}</div><div className="analysis-detail-note">Planlanan görev süresi ile gerçek odak süresi aynı ölçüm değildir. Timer kaydı yalnızca tamamlanan zamanlayıcı oturumlarından gelir.</div><span className="section-kicker">KATEGORİLERE GÖRE TIMER</span><div className="analysis-detail-list">{rangeCategoryTotals.length ? rangeCategoryTotals.map((item) => <div className="analysis-detail-row" key={item.category}><span><i style={{ background: categoryPalette[item.category] ?? '#a89aba' }} />{item.category}</span><b>{formatDuration(item.seconds)}</b></div>) : <p className="empty-data-note">Bu dönemde timer oturumu kaydı yok.</p>}</div><span className="section-kicker">ÖĞRENME KAYDI</span><div className="analysis-detail-list"><div className="analysis-detail-row"><span>Öğrenme kategorisi · timer</span><b>{formatDuration(rangeLearningTimerSeconds)}</b></div><div className="analysis-detail-row"><span>Manuel çalışma kaydı</span><b>{rangeManualLearningMinutes} dk</b></div></div><div className="analysis-detail-list">{rangeStudyChartItems.map((item) => <div className="analysis-detail-row" key={item.label}><span>{item.label} · öğrenme toplamı</span><b>{Math.floor(item.seconds / 60)} dk</b></div>)}</div><div className="analysis-detail-note">Manuel öğrenme süresi, timer oturumlarından ayrı tutulur. Hedef adımları da öğrenme hedeflerinde ayrıca izlenir.</div><span className="section-kicker">ALIŞKANLIK İŞARETLERİ</span><div className="analysis-detail-list">{habits.length ? habits.map((habit) => <div className="analysis-detail-row" key={habit.id}><span>{habit.name}</span><b>{(habit.checkDates ?? []).filter((date) => rangeKeys.includes(date)).length} işaret</b></div>) : <p className="empty-data-note">Alışkanlık kaydı bulunmuyor.</p>}</div><div className="analysis-detail-note">Alışkanlıkların sıklığı kişiye özeldir; burada yalnızca bu dönemdeki işaret sayısı gösterilir. Az veri olduğunda trend çıkarımı yapılmaz.</div></section></div>}
      {settingsOpen && <div className="modal-backdrop search-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false) }}><section className="task-modal settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title"><div className="modal-top"><div className="planner-heading"><span className="planner-mark"><Settings2 size={18} /></span><div><span className="section-kicker">KONTROL SENDE</span><h2 id="settings-title">Ayarlar</h2><p>Eşitleme, hatırlatmalar ve kısa yollar.</p></div></div><button type="button" className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Ayarları kapat"><X size={19} /></button></div><section className="settings-section"><span className="section-kicker">G · ŞİFRELİ BULUT EŞİTLEME</span><h3>Yalnızca sen başlatınca aktarılır</h3><p className="settings-copy">Eşitleme parolan cihazında AES-GCM şifrelemesi için kullanılır ve sunucuya gönderilmez. Worker yalnızca şifreli içerik saklar. İlk gönderme ve bu cihaza geri yükleme ayrıca onay ister.</p>{!syncToken ? <form className="settings-connect-form" onSubmit={connectCloudSync}><label>Worker API adresi<input type="url" value={syncApiUrl} onChange={(event) => setSyncApiUrl(event.target.value)} required placeholder="https://…workers.dev" /></label><label>Worker erişim parolası<small>Worker ayarında APP_PASSWORD olarak yapılandırdığın mevcut parola. Eşitleme parolasından farklıdır.</small><input type="password" value={syncPassword} onChange={(event) => setSyncPassword(event.target.value)} required autoComplete="current-password" /></label><button type="submit" className="secondary-action-button">Güvenli oturum aç</button></form> : <div className="settings-connect-form"><div className="connection-state"><span className="status-pip" /> Worker oturumu açık · veri aktarımı başlamadı</div><label>Eşitleme parolası <small>12+ karakter; diğer cihazlarda da aynı parolayı kullan. Uygulama saklamaz.</small><input type="password" minLength={12} value={syncPassphrase} onChange={(event) => setSyncPassphrase(event.target.value)} autoComplete="new-password" /></label><div className="settings-button-row"><button type="button" className="secondary-action-button" onClick={uploadEncryptedSync}><ArrowDownToLine size={15} /> Şifrele ve buluta gönder</button><button type="button" className="secondary-action-button" onClick={downloadEncryptedSync}><Upload size={15} /> Şifreli yedeği indir</button></div><button type="button" className="plain-settings-button" onClick={disconnectCloudSync}>Oturumu kapat</button></div>}</section><section className="settings-section"><span className="section-kicker">F · GÖREV HATIRLATMALARI</span><h3>{remindersOn ? 'Hatırlatmalar açık' : 'Hatırlatmalar kapalı'}</h3><p className="settings-copy">Görev saatinde ve sonra her 5 dakikada bir hatırlatma isteği gönderilir; tamamlamak, ertelemek, arşivlemek veya silmek durdurur. Hatırlatma için görev zamanı ve başlığı Worker'a iletilir; gizlilik açıkken başlık D1'de genel metne çevrilir. Teslimat tarayıcı ve işletim sistemine bağlıdır.</p><div className="settings-connect-form"><div className="form-row"><div><label htmlFor="quiet-start">Sessiz saat başlangıcı</label><input id="quiet-start" type="time" value={quietStart} onChange={(event) => setQuietStart(event.target.value)} /></div><div><label htmlFor="quiet-end">Sessiz saat bitişi</label><input id="quiet-end" type="time" value={quietEnd} onChange={(event) => setQuietEnd(event.target.value)} /></div></div><label>Bildirim metni<select value={reminderWording} onChange={(event) => setReminderWording(event.target.value as 'brief' | 'task')}><option value="brief">Kısa: “Görev zamanı.”</option><option value="task">Görev başlığını göster</option></select></label><label className="settings-check"><input type="checkbox" checked={privacyMode} onChange={(event) => setPrivacyMode(event.target.checked)} /><span>Kilit ekranında görev başlığını gizle</span></label><div className="settings-button-row"><button type="button" className="secondary-action-button" disabled={!syncToken} onClick={() => { const form = document.getElementById('reminder-save-proxy') as HTMLFormElement | null; form?.requestSubmit() }}>Tercihleri kaydet</button>{remindersOn ? <button type="button" className="plain-settings-button" onClick={disableTaskReminders}>Bu cihazda kapat</button> : <button type="button" className="add-task-button" disabled={!syncToken} onClick={enableTaskReminders}><Bell size={15} /> Hatırlatmaları etkinleştir</button>}</div>{remindersOn && <div className={`reminder-sync-status sync-${reminderSyncState}`} role="status"><span>{reminderSyncState === 'syncing' ? 'Görev hatırlatmaları eşitleniyor…' : reminderSyncState === 'synced' ? 'Görev hatırlatmaları Worker ile eşitlendi.' : reminderSyncState === 'error' ? reminderSyncError : syncToken ? 'Eşitleme bekliyor.' : 'Worker oturumu kapalı; görev değişiklikleri eşitlenmiyor.'}</span>{reminderSyncState === 'error' && <button type="button" onClick={() => setReminderSyncAttempt((attempt) => attempt + 1)}>Yeniden dene</button>}</div>}<form id="reminder-save-proxy" onSubmit={saveReminderPreferences} /></div></section><section className="settings-section"><span className="section-kicker">I · ÖZEL KATEGORİLER</span><h3>Kategorilerin</h3><p className="settings-copy">Yeni kategoriyi görev planlarken de ekleyebilirsin.</p><div className="settings-category-list">{availableCategories.map((category) => <span key={category.label}>{category.label}{customCategories.includes(category.label) && <button type="button" aria-label={`${category.label} kategorisini kaldır`} onClick={() => { if (tasks.some((task) => task.category === category.label)) { setToast('Bu kategori görevlerde kullanılıyor; önce görevlerini başka kategoriye taşı.'); return } setCustomCategories((items) => items.filter((item) => item !== category.label)) }}>×</button>}</span>)}</div></section><section className="settings-section"><span className="section-kicker">K · KESTİRMELER</span><h3>Hızlı açılışlar</h3><p className="settings-copy">Manifest kısayolları desteklenen kurulumlarda görünür. iOS Kestirmeler’de “URL’yi aç” eylemine aşağıdaki bağlantıyı ekle. iOS PWA’larında yerel ana ekran widget’ı web uygulamasıyla sunulamıyor.</p><div className="settings-button-row"><button type="button" className="secondary-action-button" onClick={() => copyQuickLink('add-task')}>Görev ekle URL’si</button><button type="button" className="secondary-action-button" onClick={() => copyQuickLink('calendar')}>Takvim URL’si</button><button type="button" className="secondary-action-button" onClick={() => copyQuickLink('start-focus')}>Odak URL’si</button></div></section>{syncStatus && <div className="sync-status" role="status">{syncStatus}</div>}</section></div>}
      {searchOpen && <div className="modal-backdrop search-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSearchOpen(false) }}><section className="task-modal search-modal" role="dialog" aria-modal="true" aria-labelledby="search-title"><div className="modal-top"><div className="planner-heading"><span className="planner-mark"><Search size={18} /></span><div><span className="section-kicker">GÖREV ARŞİVİ</span><h2 id="search-title">Bul ve düzenle</h2><p>Görev adı, kategori veya not içinde ara.</p></div></div><button type="button" className="icon-button" onClick={() => setSearchOpen(false)} aria-label="Aramayı kapat"><X size={19} /></button></div><label className="search-input-wrap"><Search size={17} /><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Görev veya kategori ara…" /></label><div className="search-tabs"><button type="button" className={!showArchived ? 'selected' : ''} onClick={() => setShowArchived(false)}>Aktif görevler</button><button type="button" className={showArchived ? 'selected' : ''} onClick={() => setShowArchived(true)}>Arşiv ({tasks.filter((task) => task.archived).length})</button></div><div className="search-results">{searchResults.length ? searchResults.map((task) => <article className="search-result" key={task.id}><button type="button" className="search-result-main" onClick={() => { setSelectedDay(task.date ?? todayKey); setCalendarAnchor(task.date ?? todayKey); setActiveTab('Takvim'); setSearchOpen(false) }}><span className={`recommendation-task-icon tone-${availableCategories.find((item) => item.label === task.category)?.tone ?? 'lilac'}`}><Focus size={16} /></span><span><b>{task.title}</b><small>{task.category} · {task.date ?? todayKey} · {task.time}{task.done ? ' · Tamamlandı' : ''}</small></span><ArrowRight size={15} /></button><button type="button" className="archive-action" onClick={() => { setTasks((items) => items.map((item) => item.id === task.id ? { ...item, archived: !item.archived } : item)); setToast(task.archived ? 'Görev arşivden çıkarıldı.' : 'Görev arşivlendi.') }}>{task.archived ? 'Geri al' : 'Arşivle'}</button></article>) : <div className="search-empty"><Search size={20} /><b>{showArchived ? 'Arşiv boş' : 'Eşleşen görev yok'}</b><span>Arama kelimeni değiştirebilir veya başka bir kategori deneyebilirsin.</span></div>}</div></section></div>}
      {modalOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeTaskModal() }}><form className="task-modal task-planner-modal" onSubmit={handleTaskFormSubmit}>
        <div className="modal-top"><div className="planner-heading"><span className="planner-mark"><Sparkles size={18} /></span><div><span className="section-kicker">{editingTask ? 'GÖREVİNİ GÜNCELLE' : 'KENDİ RİTMİNİ KUR'}</span><h2>{editingTask ? 'Görevi düzenle' : 'Görevini planla'}</h2><p>Önce görevi seç, sonra sana uygun planı kur.</p></div></div><button type="button" className="icon-button" onClick={closeTaskModal} aria-label="Kapat"><X size={19} /></button></div>
        <div className="planner-stepper" aria-label="Planlama adımları"><span className={plannerStep === 1 ? 'active' : 'complete'}><i>01</i><b>Görevini tanımla</b></span><em /><span className={plannerStep === 2 ? 'active' : ''}><i>02</i><b>Zamanını seç</b></span></div>
        {plannerStep === 1 ? <div className="planner-page" key="task-step-one"><div className="planner-intro"><span className="step-eyebrow">ADIM 1 · NE YAPACAKSIN?</span><h3>Önce niyetini belirle.</h3><p>Bir kategori seç; bu görev için uygun simge ve analiz alanı onunla eşleşecek.</p></div><label htmlFor="task-title">Görev adı</label><input id="task-title" autoFocus placeholder="Örn. İngilizce konuşma pratiği" value={taskName} onChange={(event) => setTaskName(event.target.value)} maxLength={80} /><div className="selection-field"><span className="form-label">Hangi alanına ait?</span><div className="category-choice-grid" role="group" aria-label="Görev kategorisi">{availableCategories.map(({ label, icon: CategoryIcon, tone, description }) => <button type="button" key={label} className={`category-choice tone-${tone} ${taskCategory === label ? 'selected' : ''}`} aria-pressed={taskCategory === label} onClick={() => setTaskCategory(label)}><span className="category-choice-icon"><CategoryIcon size={18} /></span><span className="category-choice-copy"><b>{label}</b><small>{description}</small></span>{taskCategory === label && <Check size={14} className="choice-check" />}</button>)}</div><div className="custom-category-create"><input aria-label="Yeni kategori adı" maxLength={24} placeholder="Özel kategori adı" value={customCategoryDraft} onChange={(event) => setCustomCategoryDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); const name = customCategoryDraft.trim(); if (name && !availableCategories.some((item) => item.label.toLocaleLowerCase('tr-TR') === name.toLocaleLowerCase('tr-TR'))) { setCustomCategories((items) => [...items, name]); setTaskCategory(name); setCustomCategoryDraft('') } } }} /><button type="button" onClick={() => { const name = customCategoryDraft.trim(); if (!name) return; if (availableCategories.some((item) => item.label.toLocaleLowerCase('tr-TR') === name.toLocaleLowerCase('tr-TR'))) { setToast('Bu kategori zaten var.'); return } setCustomCategories((items) => [...items, name]); setTaskCategory(name); setCustomCategoryDraft('') }}>Kategori ekle</button></div></div><div className="selected-category-note"><span className={`selected-category-icon tone-${availableCategories.find((item) => item.label === taskCategory)?.tone ?? 'lilac'}`}>{(() => { const Icon = availableCategories.find((item) => item.label === taskCategory)?.icon ?? Focus; return <Icon size={16} /> })()}</span><span><b>{taskCategory}</b><small>{availableCategories.find((item) => item.label === taskCategory)?.description}</small></span><span className="selection-ready">SEÇİLDİ</span></div></div> : <div className="planner-page" key="task-step-two"><div className="planner-intro"><span className="step-eyebrow">ADIM 2 · UYGUN BİR YER AÇ</span><h3>Ne zaman ve nasıl?</h3><p>Tarih ve süre yalnızca bu görevi planlar; başka görevlerin yerini değiştirmez.</p></div><div className="form-row"><div><label htmlFor="task-date">Tarih</label><input id="task-date" name="date" type="date" value={taskDate} onChange={(event) => setTaskDate(event.target.value)} required /></div><div><label htmlFor="task-time">Başlangıç saati</label><input id="task-time" name="time" type="time" value={taskTime} onChange={(event) => setTaskTime(event.target.value)} required /></div></div><div className="selection-field duration-field"><span className="form-label">Planlanan süre</span><div className="duration-choice-grid" role="group" aria-label="Planlanan süre">{durationChoices.map((minutes) => <button type="button" key={minutes} className={taskDuration === minutes ? 'selected' : ''} aria-pressed={taskDuration === minutes} onClick={() => setTaskDuration(minutes)}><b>{minutes}</b><small>dk</small></button>)}</div></div><div className="selection-field"><span className="form-label">Öncelik</span><div className="detail-choice-grid priority-choice-grid" role="group" aria-label="Görev önceliği">{priorityChoices.map(({ value, label, note, icon: ChoiceIcon }) => <button type="button" key={value} className={`detail-choice priority-${value} ${taskPriority === value ? 'selected' : ''}`} aria-pressed={taskPriority === value} onClick={() => setTaskPriority(value)}><span><ChoiceIcon size={16} /></span><b>{label}</b><small>{note}</small></button>)}</div></div><div className="selection-field"><span className="form-label">Bu görev nasıl bir enerji istiyor?</span><div className="detail-choice-grid energy-choice-grid" role="group" aria-label="Görev eforu">{energyChoices.map(({ value, label, note, icon: ChoiceIcon }) => <button type="button" key={value} className={`detail-choice energy-${value} ${taskEnergy === value ? 'selected' : ''}`} aria-pressed={taskEnergy === value} onClick={() => setTaskEnergy(value)}><span><ChoiceIcon size={16} /></span><b>{label}</b><small>{note}</small></button>)}</div></div><div className="notes-field"><label htmlFor="task-notes">Kendine not <span>İsteğe bağlı</span></label><textarea id="task-notes" value={taskNotes} onChange={(event) => setTaskNotes(event.target.value)} maxLength={180} placeholder="Hazırlamam gerekenler, küçük bir hatırlatma…" /></div><div className="plan-preview"><span className="preview-icon"><CalendarDays size={17} /></span><span><small>PLAN ÖNİZLEMESİ</small><b>{taskDate ? new Intl.DateTimeFormat('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${taskDate}T00:00:00`)) : 'Tarih seç'} · {taskTime || 'Saat seç'} · {taskDuration} dk</b></span><span className={`priority-chip priority-${taskPriority}`}>{taskPriority === 'high' ? 'Öncelikli' : taskPriority === 'low' ? 'Esnek' : 'Normal'}</span></div></div>}
        <div className="planner-actions">{plannerStep === 2 ? <button type="button" className="planner-back" onClick={() => setPlannerStep(1)}><ChevronLeft size={16} /> Görev bilgilerine dön</button> : <span className="planner-reassurance"><ShieldCheck size={15} /> Planı yalnızca sen değiştirirsin.</span>}{plannerStep === 1 ? <button type="button" className="start-button planner-next" disabled={!taskName.trim()} onClick={() => setPlannerStep(2)}>Zamanını seç <ArrowRight size={16} /></button> : <button type="submit" className="start-button planner-next">{editingTask ? <Check size={16} /> : <Plus size={16} />}{editingTask ? 'Değişiklikleri kaydet' : 'Görevi planla'}</button>}</div>
      </form></div>}
      {habitModalOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setHabitModalOpen(false) }}><form className="task-modal habit-modal" onSubmit={addHabit}><div className="modal-top"><div><span className="section-kicker">{editingHabitId !== null ? 'RİTÜELİNİ DÜZENLE' : 'YENİ BİR RİTÜEL'}</span><h2>{editingHabitId !== null ? 'Alışkanlığı düzenle' : 'Alışkanlık ekle'}</h2></div><button type="button" className="icon-button" onClick={() => setHabitModalOpen(false)} aria-label="Kapat"><X size={19} /></button></div><label htmlFor="habit-name">Alışkanlık adı</label><input id="habit-name" autoFocus required placeholder="Örn. 10 dakika yürüyüş" value={habitName} onChange={(event) => setHabitName(event.target.value)} /><span className="form-label">Tekrar düzeni</span><div className="habit-cadence-switch" role="group" aria-label="Alışkanlık tekrar biçimi"><button type="button" className={habitScheduleMode === 'weekly' ? 'selected' : ''} aria-pressed={habitScheduleMode === 'weekly'} onClick={() => setHabitScheduleMode('weekly')}>Haftalık hedef</button><button type="button" className={habitScheduleMode === 'selectedDays' ? 'selected' : ''} aria-pressed={habitScheduleMode === 'selectedDays'} onClick={() => setHabitScheduleMode('selectedDays')}>Belirli günler</button></div>{habitScheduleMode === 'weekly' ? <><span className="form-label">Haftada kaç kez?</span><div className="frequency-choice-grid" role="group" aria-label="Haftalık tekrar sayısı">{[1,2,3,4,5,6,7].map((count) => <button type="button" key={count} className={habitWeeklyTarget === count ? 'selected' : ''} aria-pressed={habitWeeklyTarget === count} onClick={() => setHabitWeeklyTarget(count)}><b>{count}</b><small>{count === 7 ? 'gün' : 'kez'}</small></button>)}</div><p className="frequency-caption">{habitWeeklyTarget === 7 ? 'Her gün' : `Haftada ${habitWeeklyTarget} kez`}</p></> : <><span className="form-label">Hangi günlerde?</span><div className="weekday-choice-grid" role="group" aria-label="Alışkanlığın yapılacağı günler">{week.map((day, index) => { const dayNumber = index + 1; const selected = habitSelectedDays.includes(dayNumber); return <button type="button" key={day} className={selected ? 'selected' : ''} aria-pressed={selected} onClick={() => setHabitSelectedDays((days) => selected ? days.filter((item) => item !== dayNumber) : [...days, dayNumber])}>{day}</button> })}</div><p className="frequency-caption">{habitSelectedDays.length ? `${habitSelectedDays.length} gün seçildi` : 'En az bir gün seç'}</p></>}<input type="hidden" name="weekly-target" value={habitWeeklyTarget} /><div className="modal-note"><Sparkles size={15} /> İlerlemeni her gün kendi ritminde işaretle.</div><button className="start-button modal-submit" type="submit" disabled={!habitName.trim() || (habitScheduleMode === 'selectedDays' && habitSelectedDays.length === 0)}>{editingHabitId !== null ? <Check size={16} /> : <Plus size={16} />} {editingHabitId !== null ? 'Değişiklikleri kaydet' : 'Alışkanlığı ekle'}</button></form></div>}
      {studyLogModalOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setStudyLogModalOpen(false) }}><form className="task-modal" onSubmit={addManualStudyLog}><div className="modal-top"><div className="planner-heading"><span className="planner-mark"><Clock3 size={18} /></span><div><span className="section-kicker">ÖĞRENME KAYDI</span><h2>Çalışma süresi ekle</h2><p>Geçmiş bir çalışmayı da manuel kaydedebilirsin.</p></div></div><button type="button" className="icon-button" onClick={() => setStudyLogModalOpen(false)} aria-label="Kapat"><X size={19} /></button></div><label htmlFor="study-log-title">Çalışma başlığı</label><input id="study-log-title" autoFocus required maxLength={80} placeholder="Örn. İspanyolca kelime tekrarı" value={studyLogTitle} onChange={(event) => setStudyLogTitle(event.target.value)} /><div className="form-row"><div><label htmlFor="study-log-date">Tarih</label><input id="study-log-date" type="date" value={studyLogDate} onChange={(event) => setStudyLogDate(event.target.value)} required /></div><div><label htmlFor="study-log-minutes">Süre (dakika)</label><input id="study-log-minutes" type="number" min="1" max="600" value={studyLogMinutes} onChange={(event) => setStudyLogMinutes(Number(event.target.value))} required /></div></div><label htmlFor="study-log-goal">İlişkili hedef <span>İsteğe bağlı</span></label><select id="study-log-goal" value={studyLogGoalId} onChange={(event) => setStudyLogGoalId(event.target.value)}><option value="">Hedef seçmeden kaydet</option>{learningGoals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select><div className="notes-field"><label htmlFor="study-log-note">Kısa not <span>İsteğe bağlı</span></label><textarea id="study-log-note" maxLength={160} value={studyLogNote} onChange={(event) => setStudyLogNote(event.target.value)} placeholder="Neye çalıştın veya ne öğrendin?" /></div><button type="submit" className="start-button modal-submit"><Check size={16} /> Süreyi kaydet</button></form></div>}
      {goalModalOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setGoalModalOpen(false) }}><form className="task-modal" onSubmit={addLearningGoal}><div className="modal-top"><div className="planner-heading"><span className="planner-mark"><Target size={18} /></span><div><span className="section-kicker">ÖĞRENME YOLCULUĞU</span><h2>Yeni hedef oluştur</h2><p>Başlamak için bir hedef ve ilk adımını tanımla.</p></div></div><button type="button" className="icon-button" onClick={() => setGoalModalOpen(false)} aria-label="Kapat"><X size={19} /></button></div><label htmlFor="goal-title">Ne öğrenmek istiyorsun?</label><input id="goal-title" autoFocus required maxLength={70} placeholder="Örn. Temel fotoğrafçılık" value={goalTitle} onChange={(event) => setGoalTitle(event.target.value)} /><label htmlFor="goal-description">Hedefinin açıklaması <span>İsteğe bağlı</span></label><textarea id="goal-description" maxLength={160} placeholder="Bu hedef senin için neden önemli?" value={goalDescription} onChange={(event) => setGoalDescription(event.target.value)} /><label htmlFor="goal-first-step">İlk milestone <span>İsteğe bağlı</span></label><input id="goal-first-step" maxLength={70} placeholder="Örn. Kamera ayarlarını öğren" value={goalFirstMilestone} onChange={(event) => setGoalFirstMilestone(event.target.value)} /><div className="modal-note"><ShieldCheck size={15} /> İlerleme yalnızca tamamladığın adımlara göre hesaplanır.</div><button type="submit" className="start-button modal-submit"><Plus size={16} /> Hedefi oluştur</button></form></div>}
      {pendingMove && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingMove(null) }}><div className="task-modal move-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="move-confirm-title"><div className="modal-top"><div className="planner-heading"><span className="planner-mark"><CalendarDays size={18} /></span><div><span className="section-kicker">TAKVİM DEĞİŞİKLİĞİ</span><h2 id="move-confirm-title">Görevi taşıyalım mı?</h2><p>Görev ve saat, yalnızca onayından sonra değişir.</p></div></div><button type="button" className="icon-button" onClick={() => setPendingMove(null)} aria-label="Kapat"><X size={19} /></button></div><div className="move-preview"><div><small>ŞİMDİ</small><b>{new Intl.DateTimeFormat('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${pendingMove.originalDate}T00:00:00`))}</b><span>{pendingMove.originalTime}</span></div><ArrowRight size={17} /><div><small>YENİ PLAN</small><b>{new Intl.DateTimeFormat('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${pendingMove.targetDate}T00:00:00`))}</b><span>{pendingMove.targetTime ?? pendingMove.originalTime}</span></div></div><div className="move-task-name">{tasks.find((task) => task.id === pendingMove.taskId)?.title}</div><div className="planner-actions"><button className="planner-back" onClick={() => setPendingMove(null)}>Vazgeç</button><button className="start-button planner-next" onClick={confirmTaskMove}>Evet, bu plana taşı</button></div></div></div>}
      {toast && <div className="toast" role="status" aria-live="polite"><span><Check size={15} /></span>{toast}{undoAction && (toast === 'Görev silindi.' || toast === 'Görev 10 dakika ertelendi.') && <button onClick={undoTaskChange}><Undo2 size={14} /> Geri al</button>}</div>}
    </div>
  )
}

export default App
