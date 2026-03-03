import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Headphones, MessageCircle, Share, Bookmark, Loader2, SkipBack, SkipForward, Play, Pause, Volume2, ChevronLeft, ChevronRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import ChatPanel from '../components/ChatPanel'

function getAudioBookmark(id: string): { time: number; duration: number } | null {
  try {
    const raw = localStorage.getItem(`atlas-audio-pos-${id}`)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveAudioBookmark(id: string, time: number, duration: number) {
  if (time < 2 || duration < 1) return
  localStorage.setItem(`atlas-audio-pos-${id}`, JSON.stringify({
    time,
    duration,
    updatedAt: Date.now()
  }))
}

function clearAudioBookmark(id: string) {
  localStorage.removeItem(`atlas-audio-pos-${id}`)
}

function formatAudioTime(time: number) {
  const mins = Math.floor(time / 60)
  const secs = Math.floor(time % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  message: string
  created_at?: string
}

interface StoryPage {
  id: string
  page_number: number
  image_url?: string
  image_base64?: string
  narration_text?: string
  narration_segments?: { segment_id: number; narration_text: string }[]
}

interface ContentItem {
  id: string
  type: string
  title: string
  content?: string
  audio_url?: string
  image_url?: string
  metadata?: Record<string, unknown>
  tags?: string[]
  chat?: ChatMessage[]
  pages?: StoryPage[]
  created_at: string
}

export default function Reader() {
  const { id } = useParams()
  const [content, setContent] = useState<ContentItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatingArtwork, setGeneratingArtwork] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [showChat, setShowChat] = useState(false)
  
  // Audio player state
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [resumeMessage, setResumeMessage] = useState<string | null>(null)
  const [bookmarkSaved, setBookmarkSaved] = useState(false)
  const lastSaveRef = useRef(0)
  const pendingRestoreRef = useRef(false)

  // Story viewer state
  const [currentPage, setCurrentPage] = useState(0)

  // Apply font size setting on load
  useEffect(() => {
    const fontSize = localStorage.getItem('atlas-font-size') || 'md'
    document.documentElement.classList.remove('font-size-sm', 'font-size-md', 'font-size-lg')
    document.documentElement.classList.add(`font-size-${fontSize}`)
  }, [])

  useEffect(() => {
    fetch(`/api/content/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setContent(data.content)
          if (data.content.audio_url) {
            setAudioUrl(data.content.audio_url)
            // Check for bookmark to restore
            const bm = getAudioBookmark(data.content.id)
            if (bm && bm.time > 2) {
              pendingRestoreRef.current = true
            }
          }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  // Save position on beforeunload
  useEffect(() => {
    const handleUnload = () => {
      if (id && audioRef.current && audioRef.current.currentTime > 2) {
        saveAudioBookmark(id, audioRef.current.currentTime, audioRef.current.duration || 0)
      }
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
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

  // Throttled auto-save on timeupdate
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
      if (id) {
        const now = Date.now()
        if (now - lastSaveRef.current >= 5000) {
          lastSaveRef.current = now
          saveAudioBookmark(id, audioRef.current.currentTime, audioRef.current.duration || 0)
        }
      }
    }
  }, [id])

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  // Restore position when audio is ready
  const handleCanPlay = useCallback(() => {
    if (audioRef.current && audioRef.current.duration) {
      setDuration(audioRef.current.duration)
    }
    if (pendingRestoreRef.current && audioRef.current && id) {
      const bm = getAudioBookmark(id)
      if (bm && bm.time > 2) {
        audioRef.current.currentTime = bm.time
        setCurrentTime(bm.time)
        setResumeMessage(`Resuming from ${formatAudioTime(bm.time)}`)
        setTimeout(() => setResumeMessage(null), 3000)
      }
      pendingRestoreRef.current = false
    }
  }, [id])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    if (id) clearAudioBookmark(id)
  }, [id])

  const handlePause = useCallback(() => {
    if (id && audioRef.current && audioRef.current.currentTime > 2) {
      saveAudioBookmark(id, audioRef.current.currentTime, audioRef.current.duration || 0)
    }
  }, [id])

  const handleManualBookmark = () => {
    if (id && audioRef.current) {
      saveAudioBookmark(id, audioRef.current.currentTime, audioRef.current.duration || 0)
      setBookmarkSaved(true)
      setTimeout(() => setBookmarkSaved(false), 2000)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration || 0
      if (audioDuration > 0 && time >= 0 && time <= audioDuration) {
        audioRef.current.currentTime = time
        setCurrentTime(time)
      }
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

  // Generate artwork using Nano Banana Pro (Gemini)
  const generateArtwork = async () => {
    if (!content) return
    setGeneratingArtwork(true)
    
    try {
      const response = await fetch(`/api/content/${id}/artwork`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (data.success && data.imageUrl) {
        // Update content with new image
        setContent(prev => prev ? { ...prev, image_url: data.imageUrl } : null)
      }
    } catch (err) {
      console.error('Artwork generation failed:', err)
    }
    setGeneratingArtwork(false)
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
      {/* Hero Image */}
      {content.image_url && (
        <div className="mb-8 -mx-4 md:mx-0 md:rounded-xl overflow-hidden">
          <img 
            src={content.image_url} 
            alt={content.title}
            className="w-full h-64 md:h-80 object-cover"
          />
        </div>
      )}

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
            preload="metadata"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onDurationChange={() => {
              if (audioRef.current && audioRef.current.duration) {
                setDuration(audioRef.current.duration)
              }
            }}
            onCanPlay={handleCanPlay}
            onEnded={handleEnded}
            onPause={handlePause}
          />
          
          <div className="space-y-2">
            {/* Seek slider — full width, own row */}
            <div className="flex items-center gap-2">
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
            {/* Controls row */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => skip(-10)}
                className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
                title="Back 10 seconds"
              >
                <SkipBack className="w-5 h-5" />
              </button>
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
              <button
                onClick={() => skip(10)}
                className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
                title="Forward 10 seconds"
              >
                <SkipForward className="w-5 h-5" />
              </button>
              <button
                onClick={handleManualBookmark}
                className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
                title="Save position"
              >
                <Bookmark className={`w-5 h-5 ${bookmarkSaved ? 'text-atlas-400 fill-atlas-400' : 'text-text-muted'}`} />
              </button>
              <Volume2 className="w-5 h-5 text-text-muted" />
            </div>
            {/* Resume / bookmark feedback */}
            {(resumeMessage || bookmarkSaved) && (
              <div className="text-center text-xs text-atlas-400">
                {resumeMessage && <span className="animate-pulse">{resumeMessage}</span>}
                {bookmarkSaved && <span>Position saved!</span>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mb-8 pb-8 border-b border-border">
        {!content.image_url && content.content && (
          <button
            onClick={generateArtwork}
            disabled={generatingArtwork}
            className="flex items-center gap-2 px-4 py-2 bg-atlas-500 hover:bg-atlas-600 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {generatingArtwork ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>🎨</span>
            )}
            {generatingArtwork ? 'Generating Artwork...' : 'Generate Artwork'}
          </button>
        )}
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
        <button 
          onClick={() => setShowChat(true)}
          className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg transition-colors"
        >
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

      {/* Content - Story Viewer or Text */}
      {content.type === 'story' && content.pages && content.pages.length > 0 ? (
        <div className="story-viewer">
          {/* Page Display */}
          <div className="relative bg-surface border border-border rounded-xl overflow-hidden mb-4">
            {content.pages[currentPage]?.image_url ? (
              <img 
                src={content.pages[currentPage].image_url}
                alt={`Page ${currentPage + 1}`}
                className="w-full h-auto"
              />
            ) : content.pages[currentPage]?.image_base64 ? (
              <img 
                src={`data:image/png;base64,${content.pages[currentPage].image_base64}`}
                alt={`Page ${currentPage + 1}`}
                className="w-full h-auto"
              />
            ) : (
              <div className="h-96 flex items-center justify-center text-text-muted">
                No image for this page
              </div>
            )}
          </div>

          {/* Page Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-hover disabled:opacity-50 border border-border rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            
            <span className="text-sm text-text-muted">
              Page {currentPage + 1} of {content.pages.length}
            </span>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(content.pages!.length - 1, p + 1))}
              disabled={currentPage === content.pages.length - 1}
              className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-hover disabled:opacity-50 border border-border rounded-lg transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Page Narration */}
          {content.pages[currentPage]?.narration_text && (
            <div className="bg-surface border border-border rounded-xl p-4 mb-4">
              <h4 className="text-sm font-medium text-atlas-400 mb-2">Narration</h4>
              <p className="text-text-secondary">{content.pages[currentPage].narration_text}</p>
            </div>
          )}

          {/* Page Thumbnails */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {content.pages.map((page, idx) => (
              <button
                key={page.id}
                onClick={() => setCurrentPage(idx)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                  idx === currentPage ? 'border-atlas-400' : 'border-transparent hover:border-border'
                }`}
              >
                {page.image_url ? (
                  <img src={page.image_url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                ) : page.image_base64 ? (
                  <img src={`data:image/png;base64,${page.image_base64}`} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-surface-hover flex items-center justify-center text-xs text-text-muted">
                    {idx + 1}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <article className="prose-reading prose prose-invert max-w-none" style={{ fontFamily: "'Times New Roman', Times, Georgia, serif" }}>
          <ReactMarkdown>{content.content || ''}</ReactMarkdown>
        </article>
      )}

      {/* Chat Panel */}
      {showChat && (
        <ChatPanel
          contentId={content.id}
          contentTitle={content.title}
          onClose={() => setShowChat(false)}
          initialMessages={content.chat || []}
        />
      )}
    </div>
  )
}
