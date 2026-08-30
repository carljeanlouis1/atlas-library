import { useEffect, useState } from 'react'
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom'
import { Search, Sun, Moon, Library, Headphones, Disc3, CalendarDays, SlidersHorizontal } from 'lucide-react'
import { useAudioQueue, SKIP_SECONDS } from '../contexts/AudioQueueContext'
import { useTheme } from '../lib/theme'
import PlayerBar from './PlayerBar'
import CommandPalette from './CommandPalette'

const NAV = [
  { path: '/', label: 'Library', icon: Library, end: true },
  { path: '/audio', label: 'Audio', icon: Headphones, end: false },
  { path: '/music', label: 'Music', icon: Disc3, end: false },
  { path: '/timeline', label: 'Log', icon: CalendarDays, end: false },
  { path: '/settings', label: 'Settings', icon: SlidersHorizontal, end: false },
]

export default function Layout() {
  const location = useLocation()
  const { theme, toggle } = useTheme()
  const { currentTrack, isPlaying, togglePlay, skip } = useAudioQueue()
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Global keys: cmd-K or / opens search, space plays, arrows jump.
  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      const el = target as HTMLElement | null
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
    }

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
        return
      }
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '/') {
        e.preventDefault()
        setPaletteOpen(true)
      } else if (e.key === ' ' && currentTrack) {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'ArrowLeft' && currentTrack) {
        e.preventDefault()
        skip(-SKIP_SECONDS)
      } else if (e.key === 'ArrowRight' && currentTrack) {
        e.preventDefault()
        skip(SKIP_SECONDS)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentTrack, togglePlay, skip])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname])

  const hasPlayer = !!currentTrack

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-hairline bg-ground/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-shell items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="group flex items-baseline gap-2">
            <span className="ident text-[0.95rem] leading-none">Atlas</span>
            <span className="eyebrow hidden leading-none sm:inline">Library</span>
            {isPlaying && (
              <span
                className="ml-0.5 h-1.5 w-1.5 animate-pulse-dot rounded-full bg-amber"
                title="Playing"
              />
            )}
          </Link>

          <nav className="ml-auto hidden items-center gap-1 sm:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `eyebrow rounded px-2.5 py-1.5 transition-colors ${
                    isActive ? 'text-amber' : 'hover:text-ink'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:ml-2">
            <button
              onClick={() => setPaletteOpen(true)}
              className="group flex items-center gap-2 rounded-md border border-hairline px-2.5 py-1.5 text-ink-mute transition-colors hover:border-ink-mute hover:text-ink"
              aria-label="Search the archive"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="eyebrow hidden md:inline">Search</span>
              <span className="timecode hidden md:inline">/</span>
            </button>
            <button
              onClick={toggle}
              className="btn-icon"
              aria-label={theme === 'night' ? 'Switch to daylight' : 'Switch to night'}
            >
              {theme === 'night' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className={hasPlayer ? 'pb-44 sm:pb-28' : 'pb-24 sm:pb-16'}>
        <Outlet />
      </main>

      <PlayerBar />

      {/* Mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-panel sm:hidden">
        <div className="flex h-14 items-stretch">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${
                    isActive ? 'text-amber' : 'text-ink-mute'
                  }`
                }
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="eyebrow text-[9px] leading-none tracking-[0.08em]">{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
