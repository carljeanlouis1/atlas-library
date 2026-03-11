import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Pause, SkipBack, SkipForward, Clock, Loader2, Music as MusicIcon, User, Tag, FileText, X } from 'lucide-react'

interface SongItem {
  id: string
  title: string
  audio_url?: string
  image_url?: string
  type: string
  metadata?: {
    artist_style?: string
    genre?: string
    duration?: string
    lyrics?: string
    source?: string
  }
  tags?: string[]
  created_at: string
}

function formatTime(time: number) {
  const mins = Math.floor(time / 60)
  const secs = Math.floor(time % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function Music() {
  const navigate = useNavigate()
  const [songs, setSongs] = useState<SongItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showLyrics, setShowLyrics] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    fetch('/api/content?type=song&limit=100')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const parsed = data.content.map((item: SongItem) => {
            if (item.metadata && typeof item.metadata === 'string') {
              try { item.metadata = JSON.parse(item.metadata as unknown as string) } catch {}
            }
            return item
          })
          setSongs(parsed)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const activeSong = songs.find(s => s.id === activeId)

  const playSong = (song: SongItem) => {
    if (!song.audio_url) {
      navigate(`/read/${song.id}`)
      return
    }
    if (activeId === song.id && isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
    } else if (activeId === song.id && !isPlaying) {
      audioRef.current?.play()
      setIsPlaying(true)
    } else {
      setActiveId(song.id)
      setShowLyrics(false)
      if (audioRef.current) {
        audioRef.current.src = song.audio_url
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const skip = (seconds: number) => {
    if (audioRef.current) {
      const d = audioRef.current.duration || 0
      if (d > 0) {
        audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.currentTime + seconds, d))
      }
    }
  }

  const handleTimeUpdate = useCallback(() => {
    setCurrentTime(audioRef.current?.currentTime || 0)
  }, [])

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current && audioRef.current.duration > 0) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-40">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <MusicIcon className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Music</h1>
          <p className="text-sm text-text-muted">{songs.length} songs</p>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onDurationChange={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setIsPlaying(false)}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-atlas-400" />
        </div>
      ) : songs.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <MusicIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No songs yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {songs.map((song) => {
            const isActive = activeId === song.id
            const meta = song.metadata
            return (
              <div
                key={song.id}
                onClick={() => playSong(song)}
                className={`bg-surface border rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${
                  isActive ? 'border-purple-500 shadow-purple-500/10' : 'border-border'
                }`}
              >
                <div className="relative aspect-square bg-gradient-to-br from-purple-600/30 to-atlas-600/30 flex items-center justify-center">
                  {song.image_url ? (
                    <img src={song.image_url} alt={song.title} className="w-full h-full object-cover" />
                  ) : (
                    <MusicIcon className="w-10 h-10 text-purple-400/40" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors group">
                    <div className={`w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center shadow-lg transition-transform ${
                      isActive ? 'scale-100' : 'scale-0 group-hover:scale-100'
                    }`}>
                      {isActive && isPlaying ? (
                        <Pause className="w-5 h-5 text-white" />
                      ) : (
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      )}
                    </div>
                  </div>
                  {meta?.duration && (
                    <span className="absolute bottom-2 right-2 text-xs bg-black/70 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {meta.duration}
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <h3 className="font-semibold text-sm truncate mb-1">{song.title}</h3>
                  {meta?.artist_style && (
                    <span className="inline-flex items-center gap-1 text-xs text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-full">
                      <User className="w-3 h-3" />
                      {meta.artist_style}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Lyrics overlay — slides up from bottom */}
      {showLyrics && activeSong?.metadata?.lyrics && (
        <div className="fixed inset-0 z-[55] flex flex-col">
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setShowLyrics(false)} />
          <div className="bg-surface border-t border-border rounded-t-2xl max-h-[70vh] overflow-y-auto px-5 pt-4 pb-28 animate-slideUp">
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-surface py-2 z-10">
              <div>
                <h3 className="text-lg font-semibold text-purple-400">{activeSong.title}</h3>
                {activeSong.metadata?.artist_style && (
                  <span className="text-sm text-text-muted">{activeSong.metadata.artist_style} style</span>
                )}
              </div>
              <button
                onClick={() => setShowLyrics(false)}
                className="p-2 hover:bg-surface-hover rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-text-secondary whitespace-pre-line leading-relaxed text-[15px] pb-4">
              {activeSong.metadata.lyrics.split('\n').map((line: string, i: number) => (
                <div key={i} className={
                  line.startsWith('[') ? 'text-purple-400 font-bold mt-5 mb-1 text-base' :
                  line.trim() === '' ? 'h-3' : 'py-0.5'
                }>
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sticky bottom player */}
      {activeSong && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur border-t border-border">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-text-muted w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="audio-slider flex-1"
              />
              <span className="text-xs text-text-muted w-10 tabular-nums">{formatTime(duration)}</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => skip(-10)} className="p-2 hover:bg-surface-hover rounded-lg">
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={() => playSong(activeSong)}
                className="w-10 h-10 rounded-full bg-purple-500 hover:bg-purple-600 flex items-center justify-center flex-shrink-0"
              >
                {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
              </button>
              <button onClick={() => skip(10)} className="p-2 hover:bg-surface-hover rounded-lg">
                <SkipForward className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{activeSong.title}</div>
                {activeSong.metadata?.artist_style && (
                  <div className="text-xs text-text-muted truncate">{activeSong.metadata.artist_style}</div>
                )}
              </div>
              {/* LYRICS BUTTON — right in the player bar */}
              {activeSong.metadata?.lyrics && (
                <button
                  onClick={() => setShowLyrics(!showLyrics)}
                  className={`p-2.5 rounded-lg transition-colors flex-shrink-0 ${
                    showLyrics ? 'bg-purple-500/30 text-purple-300' : 'hover:bg-surface-hover text-text-muted'
                  }`}
                  title="Lyrics"
                >
                  <FileText className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
