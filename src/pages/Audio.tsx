import { useEffect, useState, useCallback } from 'react'
import { Play, Pause, Clock, Calendar, Loader2, ListPlus, Check } from 'lucide-react'
import { useAudioQueue } from '../contexts/AudioQueueContext'

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

function formatTime(time: number) {
  const mins = Math.floor(time / 60)
  const secs = Math.floor(time % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function Audio() {
  const [audioContent, setAudioContent] = useState<AudioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [bookmarks, setBookmarks] = useState<Record<string, BookmarkData>>({})
  const [justQueued, setJustQueued] = useState<Set<string>>(new Set())

  const { currentTrack, isPlaying, playTrack, togglePlay, addToQueue } = useAudioQueue()

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
          const withAudio = data.content.filter((item: AudioItem) => item.audio_url && item.type !== 'song')
          setAudioContent(withAudio)
          refreshBookmarks(withAudio)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [refreshBookmarks])

  const handlePlay = (item: AudioItem) => {
    if (currentTrack?.id === item.id) {
      togglePlay()
    } else {
      playTrack({ id: item.id, title: item.title, audio_url: item.audio_url, type: item.type })
    }
  }

  const handleAddToQueue = (e: React.MouseEvent, item: AudioItem) => {
    e.stopPropagation()
    addToQueue({ id: item.id, title: item.title, audio_url: item.audio_url, type: item.type })
    setJustQueued(prev => new Set(prev).add(item.id))
    setTimeout(() => {
      setJustQueued(prev => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }, 2000)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Audio Archive</h1>
        {currentTrack && (
          <div className="text-sm text-text-muted hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-atlas-400 animate-pulse" />
            Now playing via global player
          </div>
        )}
      </div>

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
            const isActive = currentTrack?.id === item.id
            const isCurrentlyPlaying = isActive && isPlaying
            const bm = bookmarks[item.id]
            const progress = bm && bm.duration > 0 ? (bm.time / bm.duration) * 100 : 0
            const queued = justQueued.has(item.id)

            return (
              <div
                key={item.id}
                className={`bg-surface border rounded-xl overflow-hidden content-card cursor-pointer ${
                  isActive ? 'border-atlas-500' : 'border-border'
                }`}
                onClick={() => handlePlay(item)}
              >
                <div className="p-4 flex items-center gap-4">
                  <button className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    isActive ? 'bg-atlas-600' : 'bg-atlas-500 hover:bg-atlas-600'
                  }`}>
                    {isCurrentlyPlaying ? (
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
                  {/* Add to queue button */}
                  <button
                    onClick={(e) => handleAddToQueue(e, item)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-colors ${
                      queued
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-surface-hover hover:bg-atlas-500/20 hover:text-atlas-400 text-text-muted'
                    }`}
                    title={queued ? 'Added to queue' : 'Add to queue'}
                  >
                    {queued ? (
                      <><Check className="w-3.5 h-3.5" /> Added</>
                    ) : (
                      <><ListPlus className="w-3.5 h-3.5" /> Queue</>
                    )}
                  </button>
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
