import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Play, Pause, MessageCircle, Loader2, ListPlus, Check,
  ChevronLeft, ChevronRight, Headphones, Palette, ArrowLeft,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import ChatPanel from '../components/ChatPanel'
import DownloadButton from '../components/DownloadButton'
import SkipButton from '../components/SkipButton'
import { useAudioQueue, SKIP_SECONDS } from '../contexts/AudioQueueContext'
import { getBookmark, parseMetadata, typeLabel } from '../lib/library'
import { formatClock, formatFullDate, estimateReadMinutes } from '../lib/format'

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
}

interface ContentItem {
  id: string
  type: string
  title: string
  content?: string
  audio_url?: string | null
  image_url?: string | null
  metadata?: Record<string, unknown> | string | null
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
  const [error, setError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [justQueued, setJustQueued] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [scrolled, setScrolled] = useState(0)

  const {
    currentTrack, isPlaying, currentTime, duration,
    playTrack, togglePlay, skip, seek, addToQueue,
  } = useAudioQueue()

  const isCurrent = !!content && currentTrack?.id === content.id

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/content/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          setError('That item is not in the archive.')
          return
        }
        const item = data.content as ContentItem
        item.metadata = parseMetadata(item as never)
        setContent(item)
        setAudioUrl(item.audio_url ?? null)
      })
      .catch(() => setError('The archive did not answer. Try again in a moment.'))
      .finally(() => setLoading(false))
  }, [id])

  // Reading progress across the article.
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setScrolled(max > 0 ? Math.min(window.scrollY / max, 1) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [content])

  const meta = useMemo(
    () => (content ? (parseMetadata(content as never) as Record<string, unknown>) : {}),
    [content]
  )

  const handleListen = useCallback(() => {
    if (!content || !audioUrl) return
    if (isCurrent) {
      togglePlay()
      return
    }
    playTrack({
      id: content.id,
      title: content.title,
      audio_url: audioUrl,
      type: content.type,
      image_url: content.image_url,
    })
  }, [content, audioUrl, isCurrent, playTrack, togglePlay])

  const handleQueue = () => {
    if (!content || !audioUrl) return
    addToQueue({
      id: content.id,
      title: content.title,
      audio_url: audioUrl,
      type: content.type,
      image_url: content.image_url,
    })
    setJustQueued(true)
    setTimeout(() => setJustQueued(false), 2000)
  }

  const generateSpeech = async () => {
    if (!content?.content) return
    setGenerating(true)
    setError(null)
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: content.content,
          contentId: id,
          voice: localStorage.getItem('atlas-voice') || 'nova',
        }),
      })
      const data = await response.json()
      if (data.audioUrl) setAudioUrl(data.audioUrl)
      else setError(data.error || 'Speech generation did not return audio.')
    } catch {
      setError('Speech generation failed. Try again.')
    }
    setGenerating(false)
  }

  const generateArtwork = async () => {
    if (!content) return
    setGeneratingArtwork(true)
    try {
      const response = await fetch(`/api/content/${id}/artwork`, { method: 'POST' })
      const data = await response.json()
      if (data.success && data.imageUrl) {
        setContent((prev) => (prev ? { ...prev, image_url: data.imageUrl } : prev))
      } else {
        setError(data.error || 'Artwork generation did not return an image.')
      }
    } catch {
      setError('Artwork generation failed. Try again.')
    }
    setGeneratingArtwork(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-amber" />
      </div>
    )
  }

  if (!content) {
    return (
      <div className="mx-auto max-w-reading px-4 py-20 text-center">
        <p className="font-serif text-2xl">{error || 'Not found'}</p>
        <Link to="/" className="btn-quiet mt-6">
          <ArrowLeft className="h-4 w-4" />
          Back to the library
        </Link>
      </div>
    )
  }

  const readMinutes = estimateReadMinutes(content.content?.length)
  const resume = getBookmark(content.id)
  const lyrics = typeof meta.lyrics === 'string' ? meta.lyrics : null
  const fill = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <>
      {/* Reading progress */}
      <div
        className="fixed left-0 top-14 z-30 h-px bg-amber transition-[width] duration-150"
        style={{ width: `${scrolled * 100}%` }}
        aria-hidden
      />

      <article className="mx-auto max-w-reading px-4 py-8 sm:py-12">
        <Link to="/" className="eyebrow mb-8 inline-flex items-center gap-1.5 hover:text-amber">
          <ArrowLeft className="h-3 w-3" />
          Library
        </Link>

        <header className="mb-8">
          <div className="eyebrow-rule mb-4">
            <span className="eyebrow">{typeLabel(content.type)}</span>
            <span className="timecode">{formatFullDate(content.created_at)}</span>
          </div>

          <h1 className="text-balance font-serif text-[2.1rem] leading-[1.12] sm:text-[2.7rem]">
            {content.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
            {readMinutes && <span className="timecode">{readMinutes} min read</span>}
            {typeof meta.artist_style === 'string' && (
              <span className="timecode">In the style of {meta.artist_style}</span>
            )}
            {typeof meta.genre === 'string' && <span className="timecode">{meta.genre}</span>}
            {content.tags?.slice(0, 5).map((tag) => (
              <span key={tag} className="eyebrow">
                {tag}
              </span>
            ))}
            {content.tags && content.tags.length > 5 && (
              <span className="eyebrow">+{content.tags.length - 5}</span>
            )}
          </div>
        </header>

        {content.image_url && content.type !== 'story' && (
          <img
            src={content.image_url}
            alt=""
            className="mb-8 aspect-[3/2] w-full rounded-lg border border-hairline object-cover"
          />
        )}

        {/* Audio */}
        {audioUrl ? (
          <section className="mb-8 rounded-lg border border-hairline bg-panel p-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleListen}
                className="btn h-11 w-11 flex-shrink-0 rounded-full bg-amber text-ground hover:brightness-110"
                aria-label={isCurrent && isPlaying ? 'Pause' : 'Listen'}
              >
                {isCurrent && isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="ml-0.5 h-4 w-4" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                {isCurrent ? (
                  <>
                    <input
                      type="range"
                      className="transport"
                      min={0}
                      max={duration || 100}
                      step={0.5}
                      value={currentTime}
                      onChange={(e) => seek(parseFloat(e.target.value))}
                      style={{ ['--fill' as string]: `${fill}%` }}
                      aria-label="Seek"
                    />
                    <div className="flex items-center justify-between">
                      <span className="timecode">{formatClock(currentTime)}</span>
                      <span className="timecode">{formatClock(duration)}</span>
                    </div>
                  </>
                ) : (
                  <div>
                    <p className="eyebrow">Narration</p>
                    <p className="timecode mt-0.5">
                      {resume ? `Paused at ${formatClock(resume.time)}` : 'Ready to play'}
                    </p>
                  </div>
                )}
              </div>

              {isCurrent && (
                <div className="flex flex-shrink-0 items-center gap-0.5">
                  <SkipButton direction="back" onClick={() => skip(-SKIP_SECONDS)} />
                  <SkipButton direction="forward" onClick={() => skip(SKIP_SECONDS)} />
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-hairline pt-4">
              <DownloadButton
                id={content.id}
                title={content.title}
                variant="primary"
                label="Download audio"
              />
              <button
                onClick={handleQueue}
                className={`btn-quiet ${justQueued ? 'border-amber/50 text-amber' : ''}`}
              >
                {justQueued ? <Check className="h-4 w-4" /> : <ListPlus className="h-4 w-4" />}
                {justQueued ? 'Queued' : 'Add to queue'}
              </button>
            </div>
          </section>
        ) : (
          content.content && (
            <section className="mb-8 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-hairline p-4">
              <p className="mr-auto text-sm text-ink-dim">
                No narration yet. Generate it once and it stays in the archive.
              </p>
              <button onClick={generateSpeech} disabled={generating} className="btn-primary">
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Headphones className="h-4 w-4" />
                )}
                {generating ? 'Generating narration' : 'Generate narration'}
              </button>
            </section>
          )
        )}

        <div className="mb-10 flex flex-wrap items-center gap-2">
          <button onClick={() => setShowChat(true)} className="btn-quiet">
            <MessageCircle className="h-4 w-4" />
            Discuss
          </button>
          {!content.image_url && content.content && (
            <button onClick={generateArtwork} disabled={generatingArtwork} className="btn-quiet">
              {generatingArtwork ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Palette className="h-4 w-4" />
              )}
              {generatingArtwork ? 'Making artwork' : 'Generate artwork'}
            </button>
          )}
        </div>

        {error && (
          <p className="mb-8 rounded-md border border-rust/40 bg-rust/10 px-4 py-3 text-sm text-rust">
            {error}
          </p>
        )}

        {/* Body */}
        {content.type === 'story' && content.pages?.length ? (
          <StoryViewer pages={content.pages} page={currentPage} onPage={setCurrentPage} />
        ) : (
          <>
            {lyrics && (
              <section className="mb-10 rounded-lg border border-hairline bg-panel p-5">
                <p className="eyebrow mb-4">Lyrics</p>
                <div className="font-serif text-[1.02rem] leading-relaxed">
                  {lyrics.split('\n').map((line, i) => (
                    <div
                      key={i}
                      className={
                        line.startsWith('[')
                          ? 'eyebrow mb-1 mt-5 first:mt-0'
                          : line.trim() === ''
                            ? 'h-3'
                            : 'text-ink-dim'
                      }
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {content.content && (
              <div className="reading">
                <ReactMarkdown>{content.content}</ReactMarkdown>
              </div>
            )}
          </>
        )}
      </article>

      {showChat && (
        <ChatPanel
          contentId={content.id}
          contentTitle={content.title}
          onClose={() => setShowChat(false)}
          initialMessages={content.chat || []}
        />
      )}
    </>
  )
}

function StoryViewer({
  pages,
  page,
  onPage,
}: {
  pages: StoryPage[]
  page: number
  onPage: (n: number) => void
}) {
  const current = pages[page]
  const src = current?.image_url
    ? current.image_url
    : current?.image_base64
      ? `data:image/png;base64,${current.image_base64}`
      : null

  return (
    <div>
      <div className="mb-4 overflow-hidden rounded-lg border border-hairline bg-panel">
        {src ? (
          <img src={src} alt={`Page ${page + 1}`} className="w-full" />
        ) : (
          <div className="flex h-80 items-center justify-center text-sm text-ink-mute">
            No image on this page
          </div>
        )}
      </div>

      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => onPage(Math.max(0, page - 1))} disabled={page === 0} className="btn-quiet">
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        <span className="timecode">
          {page + 1} / {pages.length}
        </span>
        <button
          onClick={() => onPage(Math.min(pages.length - 1, page + 1))}
          disabled={page === pages.length - 1}
          className="btn-quiet"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {current?.narration_text && (
        <div className="mb-6 rounded-lg border border-hairline bg-panel p-4">
          <p className="eyebrow mb-2">Narration</p>
          <p className="font-serif leading-relaxed text-ink-dim">{current.narration_text}</p>
        </div>
      )}

      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-2">
        {pages.map((p, i) => {
          const thumb = p.image_url || (p.image_base64 ? `data:image/png;base64,${p.image_base64}` : null)
          return (
            <button
              key={p.id}
              onClick={() => onPage(i)}
              className={`h-14 w-14 flex-shrink-0 overflow-hidden rounded border-2 transition-colors ${
                i === page ? 'border-amber' : 'border-hairline hover:border-ink-mute'
              }`}
            >
              {thumb ? (
                <img src={thumb} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="timecode">{i + 1}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
