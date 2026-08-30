import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Pause, Loader2, Search, X, BookOpen } from 'lucide-react'
import {
  fetchLibrary, LibraryItem, Bookmark, readAllBookmarks, typeLabel, runLength,
} from '../lib/library'
import {
  formatFullDate, formatClock, monthKey, formatMonthHeading, dayKey, estimateReadMinutes, formatApprox,
} from '../lib/format'
import { useAudioQueue } from '../contexts/AudioQueueContext'
import ArchiveDial from '../components/ArchiveDial'
import ArchiveRow from '../components/ArchiveRow'
import DownloadButton from '../components/DownloadButton'

const FILTERS: { id: string; label: string; types: string[] }[] = [
  { id: 'brief', label: 'Briefs', types: ['brief'] },
  { id: 'audio', label: 'Recordings', types: ['audio'] },
  { id: 'text', label: 'Essays', types: ['text', 'article'] },
  { id: 'song', label: 'Songs', types: ['song'] },
  { id: 'story', label: 'Visual', types: ['story'] },
]

export default function Home() {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [bookmarks, setBookmarks] = useState<Record<string, Bookmark>>({})
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [filter, setFilter] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeDay, setActiveDay] = useState<string | null>(null)

  const { currentTrack, isPlaying, playTrack, togglePlay, addToQueue, queue } = useAudioQueue()

  useEffect(() => {
    let cancelled = false
    fetchLibrary()
      .then((all) => {
        if (cancelled) return
        setItems(all)
        setBookmarks(readAllBookmarks(all))
      })
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const counts = useMemo(() => {
    const out: Record<string, number> = {}
    for (const item of items) out[item.type] = (out[item.type] ?? 0) + 1
    return out
  }, [items])

  const latest = items[0]

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const types = FILTERS.find((f) => f.id === filter)?.types
    return items.filter((item) => {
      if (latest && item.id === latest.id && !filter && !q && !activeDay) return false
      if (types && !types.includes(item.type)) return false
      if (activeDay && dayKey(item.created_at) !== activeDay) return false
      if (q && !item.title.toLowerCase().includes(q)) return false
      return true
    })
  }, [items, filter, query, activeDay, latest])

  const months = useMemo(() => {
    const groups: { key: string; heading: string; rows: LibraryItem[] }[] = []
    for (const item of visible) {
      const key = monthKey(item.created_at)
      const last = groups[groups.length - 1]
      if (last && last.key === key) last.rows.push(item)
      else groups.push({ key, heading: formatMonthHeading(item.created_at), rows: [item] })
    }
    return groups
  }, [visible])

  const handlePlay = (item: LibraryItem) => {
    if (!item.audio_url) return
    if (currentTrack?.id === item.id) {
      togglePlay()
      return
    }
    playTrack({
      id: item.id,
      title: item.title,
      audio_url: item.audio_url,
      type: item.type,
      image_url: item.image_url,
    })
  }

  const handleQueue = (item: LibraryItem) => {
    if (!item.audio_url) return
    addToQueue({
      id: item.id,
      title: item.title,
      audio_url: item.audio_url,
      type: item.type,
      image_url: item.image_url,
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-amber" />
      </div>
    )
  }

  if (failed) {
    return (
      <div className="mx-auto max-w-shell px-4 py-16 text-center">
        <p className="font-serif text-xl">The archive did not load.</p>
        <button onClick={() => window.location.reload()} className="btn-quiet mt-4">
          Try again
        </button>
      </div>
    )
  }

  const latestLength = latest ? runLength(latest, bookmarks[latest.id]) : null
  const latestRead = latest ? estimateReadMinutes(latest.content_length ?? latest.content?.length) : null
  const latestActive = latest && currentTrack?.id === latest.id
  const latestBlurb = (() => {
    const source = latest?.excerpt || latest?.content
    if (!source) return null
    const cleaned = source.replace(/^#+\s*/gm, '').replace(/\s+/g, ' ').trim()
    return cleaned.length > 190 ? `${cleaned.slice(0, 190)}...` : cleaned
  })()

  return (
    <div className="mx-auto max-w-shell px-4 py-8 sm:px-6 sm:py-10">
      {/* Latest */}
      {latest && (
        <section className="mb-10 animate-rise-in">
          <div className="eyebrow-rule mb-4">
            <span className="eyebrow">Latest</span>
            <span className="timecode">{formatFullDate(latest.created_at)}</span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="min-w-0">
              <Link to={`/read/${latest.id}`}>
                <h1 className="max-w-3xl text-balance font-serif text-3xl leading-[1.12] transition-colors hover:text-amber sm:text-[2.6rem]">
                  {latest.title}
                </h1>
              </Link>
              {latestBlurb && (
                <p className="mt-3 max-w-2xl font-serif text-[1.05rem] leading-relaxed text-ink-dim">
                  {latestBlurb}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="eyebrow">{typeLabel(latest.type)}</span>
                {latestLength && (
                  <span className="timecode">
                    {latestLength.exact
                      ? formatClock(latestLength.seconds)
                      : `${formatApprox(latestLength.seconds)} listen`}
                  </span>
                )}
                {latestRead && <span className="timecode">{latestRead} min read</span>}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {latest.audio_url ? (
                <>
                  <button onClick={() => handlePlay(latest)} className="btn-primary">
                    {latestActive && isPlaying ? (
                      <><Pause className="h-4 w-4" /> Pause</>
                    ) : (
                      <><Play className="h-4 w-4" /> Listen</>
                    )}
                  </button>
                  <DownloadButton id={latest.id} title={latest.title} variant="inline" />
                </>
              ) : null}
              <Link to={`/read/${latest.id}`} className="btn-quiet">
                <BookOpen className="h-4 w-4" />
                Read
              </Link>
            </div>
          </div>
        </section>
      )}

      <ArchiveDial items={items} activeDay={activeDay} onSelectDay={setActiveDay} />

      {/* Archive */}
      <section>
        <div className="eyebrow-rule mb-4">
          <span className="eyebrow">Archive</span>
          <span className="timecode">
            {visible.length} of {items.length}
          </span>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-mute" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by title"
              className="w-full rounded-md border border-hairline bg-panel py-2 pl-9 pr-9 font-serif text-[0.95rem] placeholder:text-ink-mute focus:border-amber focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon h-6 w-6"
                aria-label="Clear filter"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="hide-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {FILTERS.filter((f) => f.types.some((t) => counts[t])).map((f) => {
              const total = f.types.reduce((sum, t) => sum + (counts[t] ?? 0), 0)
              const on = filter === f.id
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(on ? null : f.id)}
                  className={`chip flex-shrink-0 ${on ? 'chip-on' : ''}`}
                >
                  {f.label}
                  <span className={on ? 'text-amber/70' : 'text-ink-mute'}>{total}</span>
                </button>
              )
            })}
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="py-16 text-center font-serif text-ink-dim">
            Nothing here yet. Clear the filters to see the whole archive.
          </p>
        ) : (
          <div className="border-t border-hairline">
            {months.map((group) => (
              <div key={group.key}>
                <div className="sticky top-14 z-10 flex items-center justify-between border-b border-hairline bg-ground px-2 py-2 sm:px-3">
                  <span className="eyebrow">{group.heading}</span>
                  <span className="timecode">{group.rows.length}</span>
                </div>
                {group.rows.map((item) => (
                  <ArchiveRow
                    key={item.id}
                    item={item}
                    bookmark={bookmarks[item.id]}
                    isActive={currentTrack?.id === item.id}
                    isPlaying={isPlaying}
                    queued={queue.some((q) => q.id === item.id)}
                    onPlay={handlePlay}
                    onQueue={handleQueue}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
