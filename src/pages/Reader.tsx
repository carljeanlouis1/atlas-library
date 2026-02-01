import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Headphones, MessageCircle, Share, Bookmark, Loader2, SkipBack, SkipForward, Play, Pause, Volume2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface ContentItem {
  id: string
  type: string
  title: string
  content?: string
  audio_url?: string
  metadata?: Record<string, unknown>
  tags?: string[]
  created_at: string
}

export default function Reader() {
  const { id } = useParams()
  const [content, setContent] = useState<ContentItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  
  // Audio player state
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    fetch(`/api/content/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setContent(data.content)
          if (data.content.audio_url) {
            setAudioUrl(data.content.audio_url)
          }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  // Audio controls
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.currentTime + seconds, duration))
    }
  }

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  // Generate TTS for text content
  const generateSpeech = async () => {
    if (!content?.content) return
    setGenerating(true)
    
    // Get voice preference from localStorage
    const selectedVoice = localStorage.getItem('atlas-voice') || 'nova'
    
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: content.content,
          contentId: id,
          voice: selectedVoice
        })
      })
      const data = await response.json()
      if (data.audioUrl) {
        setAudioUrl(data.audioUrl)
      }
    } catch (err) {
      console.error('TTS generation failed:', err)
    }
    setGenerating(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-atlas-400" />
      </div>
    )
  }

  if (!content) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Content not found</h1>
      </div>
    )
  }

  const date = new Date(content.created_at).toLocaleDateString()

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium text-atlas-400 uppercase">{content.type}</span>
          <span className="text-text-muted">•</span>
          <span className="text-sm text-text-muted">{date}</span>
        </div>
        <h1 className="text-3xl font-bold mb-4">{content.title}</h1>
        {content.tags && content.tags.length > 0 && (
          <div className="flex items-center gap-2">
            {content.tags.map((tag) => (
              <span key={tag} className="tag-pill">{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Audio Player */}
      {audioUrl && (
        <div className="bg-surface border border-border rounded-xl p-4 mb-8">
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
          />
          
          <div className="flex items-center gap-4">
            {/* Skip back 10s */}
            <button
              onClick={() => skip(-10)}
              className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
              title="Back 10 seconds"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-atlas-500 hover:bg-atlas-600 flex items-center justify-center transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-0.5" />
              )}
            </button>
            
            {/* Skip forward 10s */}
            <button
              onClick={() => skip(10)}
              className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
              title="Forward 10 seconds"
            >
              <SkipForward className="w-5 h-5" />
            </button>
            
            {/* Progress */}
            <div className="flex-1 flex items-center gap-3">
              <span className="text-sm text-text-muted w-12">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1 bg-border rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-atlas-400"
              />
              <span className="text-sm text-text-muted w-12">{formatTime(duration)}</span>
            </div>
            
            <Volume2 className="w-5 h-5 text-text-muted" />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mb-8 pb-8 border-b border-border">
        {!audioUrl && content.content && (
          <button
            onClick={generateSpeech}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-atlas-500 hover:bg-atlas-600 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Headphones className="w-4 h-4" />
            )}
            {generating ? 'Generating...' : 'Convert to Speech'}
          </button>
        )}
        {audioUrl && !content.audio_url && (
          <span className="text-sm text-green-400 flex items-center gap-2">
            <Headphones className="w-4 h-4" />
            Audio generated!
          </span>
        )}
        <button className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg transition-colors">
          <MessageCircle className="w-4 h-4" />
          Discuss
        </button>
        <button className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
          <Bookmark className="w-4 h-4" />
        </button>
        <button className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
          <Share className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <article className="prose-reading prose prose-invert max-w-none">
        <ReactMarkdown>{content.content || ''}</ReactMarkdown>
      </article>
    </div>
  )
}
