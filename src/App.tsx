import { useEffect, useMemo, useState } from 'react'
import {
  AlarmClock, ArrowRight, ArrowUpRight, Bell, BookOpen, CalendarDays,
  Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3,
  Flame, Flower2, Focus, LayoutGrid, Menu, MoreHorizontal, Pause,
  Play, Plus, Search, Settings2, Sparkles, Target, TrendingUp, X, Zap,
} from 'lucide-react'

type Tab = 'Şimdi' | 'Takvim' | 'Alışkanlıklar' | 'Öğrenme' | 'Analiz'
type Task = { id: number; title: string; category: string; time: string; duration: number; done: boolean; color: string; icon: string }
const initialTasks: Task[] = [
  { id: 1, title: 'İngilizce listening pratiği', category: 'Öğrenme', time: '10:00', duration: 45, done: false, color: 'violet', icon: 'book' },
  { id: 2, title: 'Kısa yürüyüş ve temiz hava', category: 'Sağlık', time: '11:15', duration: 30, done: false, color: 'mint', icon: 'flower' },
  { id: 3, title: 'Proje için fikirleri toparla', category: 'Kişisel', time: '13:00', duration: 60, done: false, color: 'peach', icon: 'target' },
  { id: 4, title: 'Bir bölüm kitap oku', category: 'Hobiler', time: '16:30', duration: 25, done: true, color: 'blue', icon: 'book' },
]
const initialHabits = [
  { id: 1, name: 'Su iç', detail: 'Günlük · 6 / 8 bardak', icon: 'drop', progress: 75, checked: false },
  { id: 2, name: 'Kitap oku', detail: 'Günlük · 20 dakika', icon: 'book', progress: 100, checked: true },
  { id: 3, name: 'Esneme', detail: 'Haftada 4 kez · 2 / 4', icon: 'spark', progress: 50, checked: false },
]
const navItems: { label: Tab; icon: typeof Focus }[] = [
  { label: 'Şimdi', icon: Focus }, { label: 'Takvim', icon: CalendarDays },
  { label: 'Alışkanlıklar', icon: Flower2 }, { label: 'Öğrenme', icon: BookOpen }, { label: 'Analiz', icon: LayoutGrid },
]
const week = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Şimdi')
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('vf-tasks')
    return saved ? JSON.parse(saved) as Task[] : initialTasks
  })
  const [habits, setHabits] = useState(initialHabits)
  const [timerRunning, setTimerRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [taskName, setTaskName] = useState('')
  const [toast, setToast] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [selectedDay, setSelectedDay] = useState('Per')
  const [remindersOn, setRemindersOn] = useState(false)

  useEffect(() => { localStorage.setItem('vf-tasks', JSON.stringify(tasks)) }, [tasks])
  useEffect(() => {
    if (!timerRunning) return
    const id = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(id)
  }, [timerRunning])
  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(id)
  }, [toast])

  const nextTask = useMemo(() => tasks.find((task) => !task.done), [tasks])
  const doneCount = tasks.filter((task) => task.done).length
  const progress = Math.round((doneCount / Math.max(tasks.length, 1)) * 100)
  const now = new Date()
  const dateLabel = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)
  const timerLabel = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  function completeTask(id: number) {
    setTasks((items) => items.map((item) => item.id === id ? { ...item, done: true } : item))
    setTimerRunning(false)
    setSeconds(0)
    setToast('Görev tamamlandı. Güzel iş!')
  }
  function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = taskName.trim()
    if (!title) return
    const formData = new FormData(event.currentTarget)
    const time = String(formData.get('time') || '18:00')
    const duration = Number(formData.get('duration') || 30)
    setTasks((items) => [...items, { id: Date.now(), title, category: 'Kişisel', time, duration, done: false, color: 'violet', icon: 'target' }])
    setTaskName('')
    setModalOpen(false)
    setToast('Görev planına eklendi')
  }
  function requestNotifications() {
    if (!('Notification' in window)) { setToast('Bu tarayıcı bildirimleri desteklemiyor'); return }
    Notification.requestPermission().then((permission) => {
      setRemindersOn(permission === 'granted')
      setToast(permission === 'granted' ? 'Bildirim izni açıldı' : 'Bildirim izni verilmedi')
    })
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup"><div className="brand-mark"><Sparkles size={19} strokeWidth={2.2} /></div><div><strong>violet<span>focus</span></strong><small>GÜNÜNÜN RİTMİ</small></div><button className="icon-button sidebar-close" onClick={() => setMobileMenu(false)} aria-label="Menüyü kapat"><X size={18} /></button></div>
        <button className="profile-switch"><div className="avatar">E</div><span><b>Benim alanım</b><small>Kişisel çalışma alanı</small></span><ChevronDown size={16} /></button>
        <div className="nav-label">MENÜ</div>
        <nav className="main-nav" aria-label="Ana menü">
          {navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${activeTab === label ? 'active' : ''}`} onClick={() => { setActiveTab(label); setMobileMenu(false) }}><Icon size={18} strokeWidth={1.9} /><span>{label}</span>{label === 'Şimdi' && <span className="nav-dot" />}</button>)}
        </nav>
        <div className="nav-label areas-label">ALANLARIN <button className="tiny-plus" onClick={() => setToast('Özel alanlar yakında eklenebilecek')} aria-label="Alan ekle"><Plus size={14} /></button></div>
        <div className="area-list"><button><i className="area-dot dot-lavender" />Öğrenme<span>3</span></button><button><i className="area-dot dot-rose" />Sağlık<span>2</span></button><button><i className="area-dot dot-blue" />Hobiler<span>2</span></button><button><i className="area-dot dot-peach" />Kişisel<span>4</span></button></div>
        <div className="sidebar-bottom">
          <div className="focus-card"><div className="focus-card-icon"><Zap size={16} fill="currentColor" /></div><div><b>Odak modun</b><p>Her seferinde tek adım.</p></div><span className="online-dot" /></div>
          <button className="nav-item settings-item" onClick={() => setToast('Ayarlar yakında burada')}><Settings2 size={18} /><span>Ayarlar</span></button>
          <div className="sidebar-foot"><span className="status-pip" /> Bugün kendin için buradasın</div>
        </div>
      </aside>
      {mobileMenu && <button className="scrim" onClick={() => setMobileMenu(false)} aria-label="Menüyü kapat" />}

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu-button" onClick={() => setMobileMenu(true)} aria-label="Menüyü aç"><Menu size={20} /></button>
          <div className="breadcrumbs"><span>Alanım</span><ChevronRight size={14} /><b>{activeTab}</b></div>
          <div className="top-actions"><div className="date-chip"><CalendarDays size={15} /><span>{dateLabel}</span></div><button className="icon-button search-btn" onClick={() => setToast('Arama yakında burada')} aria-label="Ara"><Search size={18} /></button><button className={`icon-button notification-btn ${remindersOn ? 'is-on' : ''}`} onClick={requestNotifications} aria-label="Bildirimleri aç"><Bell size={18} /><i /></button><div className="top-avatar">E</div></div>
        </header>

        {activeTab === 'Şimdi' && <section className="page-content">
          <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> PERŞEMBE, 29 EKİM <span className="eyebrow-spark">✦</span></div><h1>Merhaba, bugün <em>senin günün.</em></h1><p className="welcome-copy">Küçük adımlar, büyük değişimler. Şimdi bir sonraki adımına odaklan.</p></div><button className="add-task-button" onClick={() => setModalOpen(true)}><Plus size={17} /> Görev ekle</button></div>

          <div className="dashboard-grid">
            <div className="main-column">
              <section className="focus-panel">
                <div className="focus-panel-glow" />
                <div className="focus-panel-top"><div className="live-label"><span className="pulse-dot" /> ŞİMDİ ODAKLAN</div><button className="focus-more" aria-label="Diğer seçenekler"><MoreHorizontal size={20} /></button></div>
                {nextTask ? <>
                  <div className="task-category"><span className={`category-glyph glyph-${nextTask.color}`}>{nextTask.icon === 'book' ? <BookOpen size={14} /> : nextTask.icon === 'flower' ? <Flower2 size={14} /> : <Target size={14} />}</span>{nextTask.category}<span className="category-divider">/</span><span className="task-due">Sıradaki görev</span></div>
                  <h2>{nextTask.title}</h2>
                  <div className="task-meta"><span><Clock3 size={15} /> {nextTask.time} <span className="meta-separator">·</span> {nextTask.duration} dakika</span><span className="meta-divider" /><span className="soft-pill"><Sparkles size={13} /> Tek bir şeye odaklan</span></div>
                  <div className="focus-actions"><button className="start-button" onClick={() => setTimerRunning((value) => !value)}>{timerRunning ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}{timerRunning ? 'Duraklat' : 'Odaklanmaya başla'}</button><button className="complete-button" onClick={() => completeTask(nextTask.id)}><Check size={17} /> Tamamlandı</button><button className="snooze-button" onClick={() => setToast('Görev 10 dakika ertelendi')}><AlarmClock size={16} /> Ertele</button></div>
                  {timerRunning && <div className="timer-running"><span className="timer-live" /> Odak oturumu açık <b>{timerLabel}</b></div>}
                </> : <div className="all-done"><div className="all-done-icon"><CheckCheck size={25} /></div><h2>Bugünlük bu kadar! ✨</h2><p>Planındaki görevlerin hepsi tamamlandı. Kendinle gurur duy.</p><button onClick={() => setModalOpen(true)} className="complete-button"><Plus size={16} /> Yeni görev ekle</button></div>}
                <div className="focus-panel-footer"><span><Sparkles size={14} /> İlerleme, mükemmellikten daha önemli.</span><span className="panel-index">01 <i /> 04</span></div>
              </section>

              <section className="schedule-section">
                <div className="section-heading"><div><span className="section-kicker">BUGÜNÜN AKIŞI</span><h3>Günün planı <span className="heading-count">{tasks.length} görev</span></h3></div><button className="text-button" onClick={() => setActiveTab('Takvim')}>Tüm takvim <ArrowRight size={15} /></button></div>
                <div className="timeline-list">
                  {tasks.slice(0, 4).map((task, index) => <div className={`timeline-row ${task.done ? 'is-done' : ''}`} key={task.id}>
                    <div className="timeline-time">{task.time}</div><div className="timeline-track"><span className={`timeline-node ${task.done ? 'node-done' : index === 0 ? 'node-active' : ''}`}>{task.done ? <Check size={11} /> : null}</span>{index !== Math.min(tasks.length, 4) - 1 && <i className="timeline-line" />}</div>
                    <div className={`timeline-task task-${task.color}`}><div className="timeline-task-main"><span className="timeline-task-icon">{task.icon === 'book' ? <BookOpen size={15} /> : task.icon === 'flower' ? <Flower2 size={15} /> : <Target size={15} />}</span><div><b>{task.title}</b><small>{task.category} <span>·</span> {task.duration} dk</small></div></div><span className={`task-state ${task.done ? 'state-done' : ''}`}>{task.done ? 'Tamamlandı' : index === 0 ? 'Sıradaki' : 'Planlandı'}</span></div>
                  </div>)}
                </div>
                <button className="add-inline" onClick={() => setModalOpen(true)}><Plus size={15} /> Gününe bir görev daha ekle</button>
              </section>
            </div>

            <aside className="right-column">
              <section className="progress-card"><div className="section-heading compact"><div><span className="section-kicker">İSTİKRAR KAZANIYOR</span><h3>Günün ilerlemesi</h3></div><button className="more-round" aria-label="Daha fazla"><MoreHorizontal size={18} /></button></div><div className="progress-body"><div className="ring-wrap"><svg viewBox="0 0 120 120" className="progress-ring" aria-label={`${progress} yüzde tamamlandı`}><circle className="ring-track" cx="60" cy="60" r="49" /><circle className="ring-fill" cx="60" cy="60" r="49" style={{ strokeDashoffset: `${307.9 - (307.9 * progress / 100)}` }} /></svg><div className="ring-center"><b>{progress}%</b><span>tamamlandı</span></div></div><div className="progress-stats"><div><span className="stat-dot dot-violet" /><span>Tamamlandı</span><b>{doneCount}</b></div><div><span className="stat-dot dot-light" /><span>Kalan</span><b>{tasks.length - doneCount}</b></div><div><span className="stat-dot dot-peach" /><span>Odak süresi</span><b>1s 20d</b></div></div></div><div className="progress-bottom"><span>Harika gidiyorsun!</span><span className="mini-sparkles">✦ ✦ ✦</span></div></section>

              <section className="habit-card"><div className="section-heading compact"><div><span className="section-kicker">KÜÇÜK RİTÜELLER</span><h3>Alışkanlıkların</h3></div><button className="arrow-round" onClick={() => setActiveTab('Alışkanlıklar')} aria-label="Alışkanlıklara git"><ArrowRight size={16} /></button></div><div className="habit-list">{habits.slice(0, 3).map((habit) => <div className="habit-row" key={habit.id}><div className={`habit-icon habit-${habit.icon}`}>{habit.icon === 'book' ? <BookOpen size={16} /> : habit.icon === 'spark' ? <Sparkles size={16} /> : <span className="water-drop">●</span>}</div><div className="habit-info"><b>{habit.name}</b><small>{habit.detail}</small><div className="habit-progress"><i style={{ width: `${habit.progress}%` }} /></div></div><button className={`habit-check ${habit.checked ? 'checked' : ''}`} onClick={() => setHabits((list) => list.map((item) => item.id === habit.id ? { ...item, checked: !item.checked, progress: item.checked ? Math.max(0, item.progress - 25) : Math.min(100, item.progress + 25) } : item))} aria-label={`${habit.name} alışkanlığını işaretle`}>{habit.checked ? <Check size={14} /> : null}</button></div>)}</div><button className="text-button habit-view" onClick={() => setActiveTab('Alışkanlıklar')}>Tüm alışkanlıklar <ArrowRight size={14} /></button></section>

              <section className="quote-card"><div className="quote-mark">“</div><p>Biraz ilerlemek,<br /><b>hiç başlamamaktan iyidir.</b></p><div className="quote-bottom"><span>BUGÜNÜN NOTU</span><div><i /><i /><i /></div></div></section>
            </aside>
          </div>
          <footer className="page-footer"><span>Violet Focus <i>·</i> Kendine verdiğin sözü tut.</span><button onClick={() => setToast('Geri bildirim yakında!')}><CircleHelp size={14} /> Yardım & geri bildirim</button></footer>
        </section>}

        {activeTab === 'Takvim' && <section className="page-content secondary-page"><div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> ZAMANINI SAHİPLEN</div><h1>Takvimin, <em>senin ritmin.</em></h1><p className="welcome-copy">Planını gör, boşluklarını fark et, gününe yer aç.</p></div><button className="add-task-button" onClick={() => setModalOpen(true)}><Plus size={17} /> Görev ekle</button></div><div className="calendar-toolbar"><button className="calendar-month"><ChevronLeft size={18} /><b>Ekim 2026</b><ChevronRight size={18} /></button><div className="calendar-mode"><button className="selected">Hafta</button><button onClick={() => setToast('Ay görünümü yakında')}>Ay</button></div></div><div className="week-strip">{week.map((day, index) => <button className={`week-day ${day === selectedDay ? 'selected' : ''}`} key={day} onClick={() => setSelectedDay(day)}><span>{day}</span><b>{26 + index}</b><i className={index < 5 ? 'has-events' : ''} /></button>)}</div><div className="calendar-layout"><div className="day-agenda"><div className="agenda-heading"><div><span className="section-kicker">29 EKİM, PERŞEMBE</span><h3>Günün akışı</h3></div><span className="agenda-total">{tasks.length} planlı görev</span></div>{['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00'].map((hour, i) => <div className="agenda-hour" key={hour}><span>{hour}</span><div className="hour-line">{tasks[i] && <div className={`agenda-event event-${tasks[i].color}`}><b>{tasks[i].title}</b><small>{tasks[i].duration} dakika · {tasks[i].category}</small></div>}</div></div>)}</div><aside className="calendar-side"><div className="side-note"><span className="section-kicker">GÜNÜN ÖZETİ</span><div className="side-note-number">{tasks.length}<small> görev</small></div><p>Bir plan, esneklik için de yer bırakır.</p><div className="side-note-bottom"><Clock3 size={15} /> 2 saat 40 dk planlı</div></div><div className="glass-note"><Sparkles size={17} /><p><b>Bir boşluk fark ettin mi?</b><br />Hedeflerinden birini uygun zamana yerleştirmeyi deneyebilirsin.</p><button onClick={() => setToast('Akıllı plan önerileri yakında')}>Plan önerisi al <ArrowRight size={14} /></button></div></aside></div></section>}

        {activeTab === 'Alışkanlıklar' && <section className="page-content secondary-page"><div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> HER GÜN BİRAZ DAHA</div><h1>Küçük ritüeller, <em>büyük farklar.</em></h1><p className="welcome-copy">İstikrar, kendine verdiğin sözleri tutmakla başlar.</p></div><button className="add-task-button" onClick={() => setToast('Alışkanlık ekleme formu yakında')}><Plus size={17} /> Alışkanlık ekle</button></div><div className="stats-row"><div className="stat-tile"><span className="tile-icon lavender"><Flame size={18} /></span><div><small>EN UZUN SERİ</small><b>12 gün</b><span>Kitap okuma</span></div></div><div className="stat-tile"><span className="tile-icon mint"><Target size={18} /></span><div><small>BU HAFTA</small><b>76%</b><span>Hedef tutarlılığı</span></div></div><div className="stat-tile"><span className="tile-icon peach"><CheckCheck size={18} /></span><div><small>TAMAMLANAN</small><b>18</b><span>ritüel bu hafta</span></div></div></div><div className="habits-layout"><section className="habits-main-card"><div className="section-heading"><div><span className="section-kicker">BUGÜN, 29 EKİM</span><h3>Bugünkü ritüellerin</h3></div><button className="soft-select">Bu hafta <ChevronDown size={14} /></button></div>{habits.map((habit) => <div className="habit-detail-row" key={habit.id}><div className={`habit-icon habit-${habit.icon}`}>{habit.icon === 'book' ? <BookOpen size={17} /> : habit.icon === 'spark' ? <Sparkles size={17} /> : <span className="water-drop">●</span>}</div><div className="habit-detail-copy"><b>{habit.name}</b><span>{habit.detail}</span><div className="habit-progress wide"><i style={{ width: `${habit.progress}%` }} /></div></div><span className="habit-percent">{habit.progress}%</span><button className={`habit-check large ${habit.checked ? 'checked' : ''}`} onClick={() => setHabits((list) => list.map((item) => item.id === habit.id ? { ...item, checked: !item.checked, progress: item.checked ? Math.max(0, item.progress - 25) : Math.min(100, item.progress + 25) } : item))} aria-label="Alışkanlığı tamamla">{habit.checked && <Check size={15} />}</button></div>)}</section><section className="consistency-card"><div className="section-heading compact"><div><span className="section-kicker">SON 4 HAFTA</span><h3>Devamlılık haritan</h3></div><button className="more-round"><MoreHorizontal size={18} /></button></div><div className="heatmap-labels"><span>HAZ 1</span><span>HAZ 2</span><span>HAZ 3</span><span>HAZ 4</span></div><div className="heatmap-grid">{Array.from({ length: 28 }, (_, i) => <i className={`heat-cell heat-${(i * 7 + 3) % 5}`} key={i} />)}</div><div className="heatmap-legend"><span>Daha az</span><i className="heat-cell heat-0" /><i className="heat-cell heat-1" /><i className="heat-cell heat-3" /><i className="heat-cell heat-4" /><span>Daha çok</span></div><div className="consistency-footer"><span><span className="tiny-green-dot" /> En tutarlı günün</span><b>Perşembe</b></div></section></div></section>}

        {activeTab === 'Öğrenme' && <section className="page-content secondary-page"><div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> MERAKINI CANLI TUT</div><h1>Her gün biraz daha <em>öğren.</em></h1><p className="welcome-copy">Büyük hedefler, küçük ve düzenli çalışma adımlarıyla gerçekleşir.</p></div><button className="add-task-button" onClick={() => setToast('Öğrenme hedefi ekleme formu yakında')}><Plus size={17} /> Hedef ekle</button></div><div className="learning-summary"><div className="learning-summary-copy"><span className="section-kicker">BU HAFTAKİ ODAĞIN</span><h3>4 saat 25 dakika <span>öğrenmeye ayrıldı</span></h3><p>Geçen haftaya göre <b><ArrowUpRight size={14} /> %18 daha fazla</b></p></div><div className="study-bars">{[30,54,42,86,60,35,18].map((height, i) => <div className="study-bar-column" key={i}><i style={{ height: `${height}%` }} className={i === 3 ? 'bar-today' : ''} /><small>{week[i]}</small></div>)}</div></div><div className="learning-section-head"><div><span className="section-kicker">YOLCULUKLARIN</span><h3>Aktif öğrenme hedefleri</h3></div><button className="soft-select">Tümü <ChevronDown size={14} /></button></div><div className="course-grid"><article className="course-card course-purple"><div className="course-card-top"><span className="course-icon"><BookOpen size={19} /></span><button className="more-round"><MoreHorizontal size={18} /></button></div><span className="course-tag">DİL · İNGİLİZCE</span><h3>İngilizceyi akıcı<br />konuşmak</h3><p>Dinleme pratiği ve günlük kelimelerle adım adım ilerle.</p><div className="course-progress-label"><span>İlerleme</span><b>5 / 12 adım</b></div><div className="course-progress"><i style={{ width: '42%' }} /></div><div className="course-footer"><span><Clock3 size={14} /> 2sa 10dk çalışıldı</span><button onClick={() => setToast('İngilizce çalışma oturumu açıldı')}><Play size={14} fill="currentColor" /> Devam et</button></div></article><article className="course-card course-peach"><div className="course-card-top"><span className="course-icon"><Flower2 size={19} /></span><button className="more-round"><MoreHorizontal size={18} /></button></div><span className="course-tag">YARATICILIK · HOBİ</span><h3>Sulu boya<br />temelleri</h3><p>Renkleri keşfet, fırçanı eline al ve kendi tarzını bul.</p><div className="course-progress-label"><span>İlerleme</span><b>3 / 8 adım</b></div><div className="course-progress"><i style={{ width: '38%' }} /></div><div className="course-footer"><span><Clock3 size={14} /> 1sa 35dk çalışıldı</span><button onClick={() => setToast('Sulu boya çalışma oturumu açıldı')}><Play size={14} fill="currentColor" /> Devam et</button></div></article><button className="add-course-card" onClick={() => setToast('Yeni öğrenme hedefi yakında')}><span><Plus size={19} /></span><b>Yeni bir yolculuk başlat</b><small>Öğrenmek istediğin şeyi ekle</small></button></div><div className="study-log"><div className="section-heading"><div><span className="section-kicker">SON OTURUMLAR</span><h3>Çalışma günlüğün</h3></div><button className="text-button" onClick={() => setToast('Tüm oturumlar yakında')}>Tümünü gör <ArrowRight size={14} /></button></div><div className="log-row"><div className="log-icon"><BookOpen size={16} /></div><div><b>İngilizce · Listening pratiği</b><small>Bugün, 09:15</small></div><strong>35 dk</strong><Check size={16} className="log-check" /></div><div className="log-row"><div className="log-icon peach-log"><Flower2 size={16} /></div><div><b>Sulu boya · Renk çalışması</b><small>Dün, 18:40</small></div><strong>45 dk</strong><Check size={16} className="log-check" /></div></div></section>}

        {activeTab === 'Analiz' && <section className="page-content secondary-page"><div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> KENDİ RİTMİNİ KEŞFET</div><h1>İlerlemene <em>bir bak.</em></h1><p className="welcome-copy">Veriler yargılamak için değil, kendini daha iyi tanımak için.</p></div><button className="soft-select">Bu hafta <ChevronDown size={14} /></button></div><div className="insight-stats"><div className="insight-tile"><span className="section-kicker">GÖREV TAMAMLAMA</span><b>82<span>%</span></b><small><ArrowUpRight size={13} /> Geçen haftadan %8 fazla</small></div><div className="insight-tile"><span className="section-kicker">ODAK SÜRESİ</span><b>8.4<small>sa</small></b><small><ArrowUpRight size={13} /> Bu hafta +1.2 saat</small></div><div className="insight-tile"><span className="section-kicker">ALIŞKANLIK TUTARLILIĞI</span><b>76<span>%</span></b><small><ArrowUpRight size={13} /> Hedefinin üstündesin</small></div><div className="insight-tile"><span className="section-kicker">ÖĞRENME</span><b>4.4<small>sa</small></b><small><BookOpen size={13} /> 8 kilometre taşı tamamlandı</small></div></div><div className="insights-grid"><section className="chart-card"><div className="section-heading"><div><span className="section-kicker">PLANLANAN / GERÇEKLEŞEN</span><h3>Zamanını nasıl kullandın?</h3></div><button className="soft-select">Bu hafta <ChevronDown size={14} /></button></div><div className="legend"><span><i className="legend-planned" /> Planlanan</span><span><i className="legend-actual" /> Gerçekleşen</span></div><div className="chart-bars">{week.map((day, i) => <div className="chart-day" key={day}><div className="bar-pair"><i style={{ height: `${[56,72,49,88,63,38,25][i]}%` }} /><i style={{ height: `${[42,61,58,71,51,26,16][i]}%` }} /></div><small>{day}</small></div>)}</div></section><section className="category-card"><div className="section-heading compact"><div><span className="section-kicker">KATEGORİ DAĞILIMI</span><h3>Odak alanların</h3></div><button className="more-round"><MoreHorizontal size={18} /></button></div><div className="category-breakdown"><div className="donut-chart"><div><b>8.4</b><small>saat</small></div></div><div className="category-legend"><div><i className="legend-violet" /><span>Öğrenme</span><b>38%</b></div><div><i className="legend-lilac" /><span>Sağlık</span><b>27%</b></div><div><i className="legend-blue" /><span>Hobiler</span><b>21%</b></div><div><i className="legend-gray" /><span>Kişisel</span><b>14%</b></div></div></div></section><section className="trend-card"><div className="section-heading"><div><span className="section-kicker">KÜÇÜK BİR İÇGÖRÜ</span><h3>Sabahları daha tutarlısın</h3></div><span className="trend-icon"><TrendingUp size={17} /></span></div><p>Bu hafta sabah planladığın görevlerin <b>%88'ini</b> tamamladın. Öğleden sonra kendine biraz daha esneklik tanımışsın.</p><div className="trend-bottom"><span><Sparkles size={14} /> Veriden öğren, kendine göre planla.</span><button onClick={() => setToast('Analiz ayrıntıları yakında')}>Ayrıntılar <ArrowRight size={14} /></button></div></section><section className="category-time-card"><div className="section-heading"><div><span className="section-kicker">PLAN TUTARLILIĞI</span><h3>Tahminlerin zamanla</h3></div><button className="text-button">Son 4 hafta <ChevronDown size={14} /></button></div><div className="accuracy-row"><span>Görev sürelerini tahmin etme</span><b>+12%</b><ArrowUpRight size={15} /></div><div className="accuracy-track"><i style={{ width: '72%' }} /></div><p>Planladığın süreler ile gerçek çalışma süren birbirine yaklaşıyor.</p></section></div></section>}
      </main>

      {modalOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false) }}><form className="task-modal" onSubmit={addTask}><div className="modal-top"><div><span className="section-kicker">YENİ BİR ADIM</span><h2>Görevini planla</h2></div><button type="button" className="icon-button" onClick={() => setModalOpen(false)} aria-label="Kapat"><X size={19} /></button></div><label htmlFor="task-title">Görev adı</label><input id="task-title" autoFocus placeholder="Ne yapmak istiyorsun?" value={taskName} onChange={(event) => setTaskName(event.target.value)} /><div className="form-row"><div><label htmlFor="task-time">Saat</label><input id="task-time" name="time" type="time" defaultValue="18:00" /></div><div><label htmlFor="task-duration">Süre</label><select id="task-duration" name="duration" defaultValue="30"><option value="15">15 dakika</option><option value="30">30 dakika</option><option value="45">45 dakika</option><option value="60">1 saat</option></select></div></div><div className="modal-note"><Sparkles size={15} /> Planın değişirse önce sana soracağız.</div><button className="start-button modal-submit" type="submit"><Plus size={16} /> Takvime ekle</button></form></div>}
      {toast && <div className="toast"><span><Check size={15} /></span>{toast}</div>}
    </div>
  )
}

export default App
