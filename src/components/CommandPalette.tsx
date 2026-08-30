import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Play, CornerDownLeft, Loader2 } from 'lucide-react'
import { fetchLibrary, LibraryItem, typeLabel } from '../lib/library'
import { formatRelativeDay } from '../lib/format'
import { useAudioQueue } from '../contexts/AudioQueueContext'
import DownloadButton from './DownloadButton'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

// fetchLibrary caches across pages; filtering happens locally so typing
// stays instant.
export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { playTrack } = useAudioQueue()
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setCursor(0)
    window.setTimeout(() => inputRef.current?.focus(), 20)

    let cancelled = false
    fetchLibrary()
      .then((all) => !cancelled && setItems(all))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pool = q
      ? items.filter((item) => item.title.toLowerCase().includes(q))
      : items.slice(0, 40)
    return pool.slice(0, 40)
  }, [items, query])

  useEffect(() => setCursor(0), [query])

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  if (!open) return null

  const openItem = (item: LibraryItem) => {
    navigate(`/read/${item.id}`)
    onClose()
  }

  const play = (item: LibraryItem) => {
    if (!item.audio_url) return
    playTrack({
      id: item.id,
      title: item.title,
      audio_url: item.audio_url,
      type: item.type,
      image_url: item.image_url,
    })
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = results[cursor]
      if (!item) return
      if (e.metaKey || e.ctrlKey) play(item)
      else openItem(item)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[8vh] sm:pt-[12vh]">
      <div className="absolute inset-0 animate-fade-in bg-ground/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-hairline bg-panel shadow-lift">
        <div className="flex items-center gap-3 border-b border-hairline px-4">
          <Search className="h-4 w-4 flex-shrink-0 text-ink-mute" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search the archive"
            className="w-full bg-transparent py-3.5 font-serif text-lg placeholder:text-ink-mute focus:outline-none"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-amber" />}
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-ink-mute">
              {loading ? 'Reading the shelves' : `Nothing matches "${query}"`}
            </p>
          ) : (
            results.map((item, i) => (
              <div
                key={item.id}
                data-active={i === cursor}
                onMouseEnter={() => setCursor(i)}
                onClick={() => openItem(item)}
                className={`flex cursor-pointer items-center gap-3 border-b border-hairline/50 px-4 py-2.5 last:border-0 ${
                  i === cursor ? 'bg-raise' : ''
                }`}
              >
                <span className="eyebrow w-16 flex-shrink-0">{typeLabel(item.type)}</span>
                <span className="min-w-0 flex-1 truncate font-serif text-[0.98rem]">{item.title}</span>
                <span className="timecode flex-shrink-0">{formatRelativeDay(item.created_at)}</span>
                {item.audio_url && (
                  <div className="flex flex-shrink-0 items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        play(item)
                      }}
                      className="btn-icon h-7 w-7"
                      aria-label={`Play ${item.title}`}
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                    <DownloadButton id={item.id} title={item.title} className="h-7 w-7" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-hairline px-4 py-2">
          <span className="timecode flex items-center gap-1.5">
            <CornerDownLeft className="h-3 w-3" /> open
          </span>
          <span className="timecode">cmd + enter play</span>
          <span className="timecode ml-auto">esc close</span>
        </div>
      </div>
    </div>
  )
}
