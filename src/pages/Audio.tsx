import { useEffect, useState, useRef, useCallback } from 'react'
import { Play, Pause, Clock, Calendar, SkipBack, SkipForward, Loader2, Bookmark } from 'lucide-react'

interface AudioItem {
  id: string
  title: string
  audio_url: string
  type: string
  created_at: string
}

interface BookmarkData {
  time: number
  duration: number
  updatedAt: number
}

function getBookmark(id: string): BookmarkData | null {
  try {
    const raw = localStorage.getItem(`atlas-audio-pos-${id}`)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveBookmark(id: string, time: number, duration: number) {
  if (time < 2 || duration < 1) return
  localStorage.setItem(`atlas-audio-pos-${id}`, JSON.stringify({
    time,
    duration,
    updatedAt: Date.now()
  }))
}

function clearBookmark(id: string) {
  localStorage.removeItem(`atlas-audio-pos-${id}`)
}

function formatTime(time: number) {
  const mins = Math.floor(time / 60)
  const secs = Math.floor(time % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function Audio() {
  const [audioContent, setAudioContent] = useState<AudioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [resumeMessage, setResumeMessage] = useState<string | null>(null)
  const [bookmarkSaved, setBookmarkSaved] = useState(false)
  const [bookmarks, setBookmarks] = useState<Record<string, BookmarkData>>({})
  const audioRef = useRef<HTMLAudioElement>(null)
  const lastSaveRef = useRef(0)
  const pendingRestoreRef = useRef<string | null>(null)

  // Load all bookmarks on mount
  const refreshBookmarks = useCallback((items: AudioItem[]) => {
    const bm: Record<string, BookmarkData> = {}
    for (const item of items) {
      const b = getBookmark(item.id)
      if (b) bm[item.id] = b
    }
    setBookmarks(bm)
  }, [])

  useEffect(() => {
    fetch('/api/content?limit=50')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const withAudio = data.content.filter((item: AudioItem) => item.audio_url)
          setAudioContent(withAudio)
          refreshBookmarks(withAudio)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [refreshBookmarks])

  // Save position on beforeunload
  useEffect(() => {
    const handleUnload = () => {
      if (activeId && audioRef.current) {
        saveBookmark(activeId, audioRef.current.currentTime, audioRef.current.duration || 0)
      }
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [activeId])

  // Throttled auto-save on timeupdate
  const handleTimeUpdate = useCallback(() => {
    const time = audioRef.current?.currentTime || 0
    setCurrentTime(time)
    if (activeId) {
      const now = Date.now()
      if (now - lastSaveRef.current >= 5000) {
        lastSaveRef.current = now
        saveBookmark(activeId, time, audioRef.current?.duration || 0)
      }
    }
  }, [activeId])

  // Save position before switching tracks or on pause
  const saveCurrentPosition = useCallback(() => {
    if (activeId && audioRef.current && audioRef.current.currentTime > 2) {
      saveBookmark(activeId, audioRef.current.currentTime, audioRef.current.duration || 0)
      const b = getBookmark(activeId)
      if (b) setBookmarks(prev => ({ ...prev, [activeId]: b }))
    }
  }, [activeId])

  const playAudio = (item: AudioItem) => {
    if (activeId === item.id && isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
    } else {
      // Save current position before switching
      saveCurrentPosition()
      setActiveId(item.id)
      if (audioRef.current) {
        const bm = getBookmark(item.id)
        if (bm && bm.time > 2) {
          pendingRestoreRef.current = item.id
        }
        audioRef.current.src = item.audio_url
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  // Restore position when audio is ready
  const handleCanPlay = useCallback(() => {
    if (pendingRestoreRef.current && audioRef.current) {
      const bm = getBookmark(pendingRestoreRef.current)
      if (bm && bm.time > 2) {
        audioRef.current.currentTime = bm.time
        setCurrentTime(bm.time)
        setResumeMessage(`Resuming from ${formatTime(bm.time)}`)
        setTimeout(() => setResumeMessage(null), 3000)
      }
      pendingRestoreRef.current = null
    }
    setDuration(audioRef.current?.duration || 0)
  }, [])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    if (activeId) {
      clearBookmark(activeId)
      setBookmarks(prev => {
        const next = { ...prev }
        delete next[activeId]
        return next
      })
    }
  }, [activeId])

  const handlePause = useCallback(() => {
    saveCurrentPosition()
  }, [saveCurrentPosition])

  const skip = (seconds: number) => {
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration || 0
      if (audioDuration > 0) {
        audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.currentTime + seconds, audioDuration))
      }
    }
  }

  const handleManualBookmark = () => {
    if (activeId && audioRef.current) {
      saveBookmark(activeId, audioRef.current.currentTime, audioRef.current.duration || 0)
      const b = getBookmark(activeId)
      if (b) setBookmarks(prev => ({ ...prev, [activeId]: b }))
      setBookmarkSaved(true)
      setTimeout(() => setBookmarkSaved(false), 2000)
    }
  }

  const activeItem = audioContent.find(a => a.id === activeId)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Audio Archive</h1>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onDurationChange={() => setDuration(audioRef.current?.duration || 0)}
        onCanPlay={handleCanPlay}
        onEnded={handleEnded}
        onPause={handlePause}
      />

      {/* Now Playing Bar */}
      {activeItem && (
        <div className="bg-surface border border-border rounded-xl p-4 mb-6 sticky top-20 z-40">
          <div className="flex items-center gap-4 mb-3">
            <button
              onClick={() => skip(-10)}
              className="p-2 hover:bg-surface-hover rounded-lg"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => playAudio(activeItem)}
              className="w-10 h-10 rounded-full bg-atlas-500 hover:bg-atlas-600 flex items-center justify-center"
            >
              {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
            </button>
            <button
              onClick={() => skip(10)}
              className="p-2 hover:bg-surface-hover rounded-lg"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{activeItem.title}</div>
              <div className="text-sm text-text-muted flex items-center gap-2">
                <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                {resumeMessage && (
                  <span className="text-atlas-400 text-xs animate-pulse">{resumeMessage}</span>
                )}
              </div>
            </div>
            <button
              onClick={handleManualBookmark}
              className="p-2 hover:bg-surface-hover rounded-lg transition-colors relative"
              title="Save position"
            >
              <Bookmark className={`w-4 h-4 ${bookmarkSaved ? 'text-atlas-400 fill-atlas-400' : ''}`} />
              {bookmarkSaved && (
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-atlas-400 whitespace-nowrap">
                  Position saved!
                </span>
              )}
            </button>
          </div>
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={(e) => {
              const time = parseFloat(e.target.value)
              if (audioRef.current) {
                const audioDuration = audioRef.current.duration || 0
                if (audioDuration > 0 && time >= 0 && time <= audioDuration) {
                  audioRef.current.currentTime = time
                  setCurrentTime(time)
                }
              }
            }}
            className="audio-slider w-full"
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-atlas-400" />
        </div>
      ) : audioContent.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          No audio content yet.
        </div>
      ) : (
        <div className="space-y-3">
          {audioContent.map((item) => {
            const date = new Date(item.created_at).toLocaleDateString()
            const isActive = activeId === item.id
            const bm = bookmarks[item.id]
            const progress = bm && bm.duration > 0 ? (bm.time / bm.duration) * 100 : 0
            return (
              <div
                key={item.id}
                className={`bg-surface border rounded-xl overflow-hidden content-card cursor-pointer ${
                  isActive ? 'border-atlas-500' : 'border-border'
                }`}
                onClick={() => playAudio(item)}
              >
                <div className="p-4 flex items-center gap-4">
                  <button className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    isActive ? 'bg-atlas-600' : 'bg-atlas-500 hover:bg-atlas-600'
                  }`}>
                    {isActive && isPlaying ? (
                      <Pause className="w-5 h-5 text-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{item.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-text-muted mt-1">
                      <span className="tag-pill">{item.type}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {date}
                      </span>
                      {bm && (
                        <span className="flex items-center gap-1 text-atlas-400">
                          <Clock className="w-3 h-3" />
                          {formatTime(bm.time)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Progress bar for bookmarked items */}
                {bm && progress > 0 && (
                  <div className="h-0.5 bg-border">
                    <div
                      className="h-full bg-atlas-500 opacity-60 transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
