import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  BookOpen, Headphones, Clock, Home, Search, MessageCircle, Settings, Music,
  Play, Pause, SkipBack, SkipForward, List, Bookmark, ChevronUp, ChevronDown,
  X, Trash2
} from 'lucide-react'
import { useAudioQueue } from '../contexts/AudioQueueContext'

const navItems = [
  { path: '/', icon: Home, label: 'Library' },
  { path: '/music', icon: Music, label: 'Music' },
  { path: '/audio', icon: Headphones, label: 'Audio' },
  { path: '/timeline', icon: Clock, label: 'Timeline' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

function formatTime(time: number) {
  const mins = Math.floor(time / 60)
  const secs = Math.floor(time % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function Layout() {
  const location = useLocation()
  const [queueOpen, setQueueOpen] = useState(false)

  const {
    currentTrack, isPlaying, currentTime, duration, queue,
    bookmarkSaved, resumeMessage,
    togglePlay, skip, seek, skipToNext,
    removeFromQueue, moveInQueue, clearQueue, saveCurrentBookmark,
  } = useAudioQueue()

  const hasPlayer = !!currentTrack

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-atlas-400 to-atlas-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg">Atlas Library</span>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search content..."
                className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-atlas-500 transition-colors"
              />
            </div>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-atlas-500/20 text-atlas-400'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className={`pt-16 min-h-screen ${hasPlayer ? 'pb-28' : ''}`}>
        <Outlet />
      </main>

      {/* Queue Drawer — slides up above player bar */}
      {hasPlayer && queueOpen && (
        <div className="fixed bottom-[4.5rem] left-0 right-0 z-40">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-surface border border-border border-b-0 rounded-t-xl overflow-hidden shadow-xl">
              {/* Queue header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                <span className="text-sm font-medium">
                  Up Next
                  {queue.length > 0 && (
                    <span className="ml-1.5 text-xs text-text-muted">({queue.length} track{queue.length !== 1 ? 's' : ''})</span>
                  )}
                </span>
                {queue.length > 0 && (
                  <button
                    onClick={clearQueue}
                    className="flex items-center gap-1 text-xs text-text-muted hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear all
                  </button>
                )}
              </div>
              {/* Queue list */}
              <div className="overflow-y-auto max-h-60">
                {queue.length === 0 ? (
                  <div className="py-8 text-center text-sm text-text-muted">
                    Queue is empty — add tracks from the Audio page
                  </div>
                ) : (
                  queue.map((item, i) => (
                    <div key={`${item.id}-${i}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover border-b border-border/50 last:border-0">
                      <span className="text-xs text-text-muted w-5 text-center flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{item.title}</div>
                        <div className="text-xs text-text-muted capitalize">{item.type}</div>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => moveInQueue(i, 'up')}
                          disabled={i === 0}
                          className="p-1 hover:bg-surface rounded disabled:opacity-25 transition-opacity"
                          title="Move up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveInQueue(i, 'down')}
                          disabled={i === queue.length - 1}
                          className="p-1 hover:bg-surface rounded disabled:opacity-25 transition-opacity"
                          title="Move down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeFromQueue(i)}
                          className="p-1 hover:text-red-400 hover:bg-surface rounded transition-colors"
                          title="Remove"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Player Bar */}
      {hasPlayer && (
        <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t">
          <div className="max-w-4xl mx-auto px-4 pt-2 pb-3">
            {/* Seek slider */}
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="audio-slider w-full mb-2"
            />
            <div className="flex items-center gap-2">
              {/* Track info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{currentTrack.title}</div>
                <div className="text-xs text-text-muted flex items-center gap-2">
                  <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                  {resumeMessage && (
                    <span className="text-atlas-400 animate-pulse">{resumeMessage}</span>
                  )}
                  {bookmarkSaved && (
                    <span className="text-atlas-400">Saved!</span>
                  )}
                </div>
              </div>

              {/* Playback controls */}
              <button onClick={() => skip(-10)} className="p-2 hover:bg-surface-hover rounded-lg transition-colors" title="Back 10s">
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-atlas-500 hover:bg-atlas-600 flex items-center justify-center flex-shrink-0 transition-colors"
              >
                {isPlaying
                  ? <Pause className="w-4 h-4 text-white" />
                  : <Play className="w-4 h-4 text-white ml-0.5" />
                }
              </button>
              <button onClick={() => skip(10)} className="p-2 hover:bg-surface-hover rounded-lg transition-colors" title="Forward 10s">
                <SkipForward className="w-4 h-4" />
              </button>
              {queue.length > 0 && (
                <button
                  onClick={skipToNext}
                  className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors"
                  title="Skip to next"
                >
                  Next
                </button>
              )}
              <button
                onClick={saveCurrentBookmark}
                className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
                title="Save position"
              >
                <Bookmark className={`w-4 h-4 ${bookmarkSaved ? 'text-atlas-400 fill-atlas-400' : 'text-text-muted'}`} />
              </button>

              {/* Queue toggle with badge */}
              <button
                onClick={() => setQueueOpen(p => !p)}
                className={`relative p-2 rounded-lg transition-colors ${queueOpen ? 'bg-atlas-500/20 text-atlas-400' : 'hover:bg-surface-hover text-text-muted'}`}
                title="Queue"
              >
                <List className="w-4 h-4" />
                {queue.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-atlas-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                    {queue.length > 9 ? '9+' : queue.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat button */}
      <button
        className={`fixed right-6 w-14 h-14 rounded-full bg-atlas-500 hover:bg-atlas-600 text-white shadow-lg shadow-atlas-500/20 flex items-center justify-center transition-all ${
          hasPlayer ? 'bottom-24' : 'bottom-6'
        }`}
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    </div>
  )
}
