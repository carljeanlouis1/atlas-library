import { useEffect, useState, useRef } from 'react'
import { Play, Pause, Clock, Calendar, SkipBack, SkipForward, Loader2 } from 'lucide-react'

interface AudioItem {
  id: string
  title: string
  audio_url: string
  type: string
  created_at: string
}

export default function Audio() {
  const [audioContent, setAudioContent] = useState<AudioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    fetch('/api/content?limit=50')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Filter to only items with audio
          const withAudio = data.content.filter((item: AudioItem) => item.audio_url)
          setAudioContent(withAudio)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const playAudio = (item: AudioItem) => {
    if (activeId === item.id && isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
    } else {
      setActiveId(item.id)
      if (audioRef.current) {
        audioRef.current.src = item.audio_url
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const skip = (seconds: number) => {
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration || 0
      if (audioDuration > 0) {
        audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.currentTime + seconds, audioDuration))
      }
    }
  }

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const activeItem = audioContent.find(a => a.id === activeId)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Audio Archive</h1>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onDurationChange={() => setDuration(audioRef.current?.duration || 0)}
        onCanPlay={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setIsPlaying(false)}
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
              <div className="text-sm text-text-muted">{formatTime(currentTime)} / {formatTime(duration)}</div>
            </div>
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
            return (
              <div
                key={item.id}
                className={`bg-surface border rounded-xl p-4 content-card flex items-center gap-4 cursor-pointer ${
                  isActive ? 'border-atlas-500' : 'border-border'
                }`}
                onClick={() => playAudio(item)}
              >
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
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
