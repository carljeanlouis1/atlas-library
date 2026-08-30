import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Pause, Loader2 } from 'lucide-react'
import { fetchLibrary, LibraryItem, typeLabel } from '../lib/library'
import { formatFullDate, formatTimeOfDay, dayKey } from '../lib/format'
import { useAudioQueue } from '../contexts/AudioQueueContext'
import DownloadButton from '../components/DownloadButton'

/** Everything in the archive, day by day, in the order it arrived. */
export default function Timeline() {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudioQueue()

  useEffect(() => {
    let cancelled = false
    fetchLibrary()
      .then((all) => !cancelled && setItems(all))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const grouped = useMemo(() => {
    const groups: { key: string; heading: string; rows: LibraryItem[] }[] = []
    for (const item of items) {
      const key = dayKey(item.created_at)
      const last = groups[groups.length - 1]
      if (last && last.key === key) last.rows.push(item)
      else groups.push({ key, heading: formatFullDate(item.created_at), rows: [item] })
    }
    return groups
  }, [items])

  const handlePlay = (item: LibraryItem) => {
    if (!item.audio_url) return
    if (currentTrack?.id === item.id) togglePlay()
    else
      playTrack({
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

  const shown = grouped.slice(0, days)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <h1 className="font-serif text-3xl leading-tight sm:text-4xl">Log</h1>
        <p className="timecode mt-1">
          {items.length} entries across {grouped.length} days
        </p>
      </div>

      <div className="relative">
        {/* The spine */}
        <span className="absolute bottom-2 left-[4.25rem] top-2 hidden w-px bg-hairline sm:block" />

        {shown.map((day) => (
          <section key={day.key} className="mb-8">
            <div className="eyebrow-rule mb-3">
              <span className="eyebrow">{day.heading}</span>
            </div>

            <div className="space-y-1">
              {day.rows.map((item) => {
                const isActive = currentTrack?.id === item.id
                return (
                  <div
                    key={item.id}
                    className={`group relative flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors sm:gap-4 ${
                      isActive ? 'bg-amber/[0.06]' : 'hover:bg-panel'
                    }`}
                  >
                    <span className={`timecode w-11 flex-shrink-0 ${isActive ? 'text-amber' : ''}`}>
                      {formatTimeOfDay(item.created_at)}
                    </span>

                    <span
                      className={`hidden h-1.5 w-1.5 flex-shrink-0 rounded-full sm:block ${
                        isActive ? 'bg-amber' : 'bg-hairline group-hover:bg-ink-mute'
                      }`}
                    />

                    <Link to={`/read/${item.id}`} className="min-w-0 flex-1">
                      <h3 className="truncate font-serif text-[1.02rem] leading-snug group-hover:text-amber">
                        {item.title}
                      </h3>
                      <span className="eyebrow">{typeLabel(item.type)}</span>
                    </Link>

                    {item.audio_url && (
                      <div className="flex flex-shrink-0 items-center gap-0.5">
                        <button
                          onClick={() => handlePlay(item)}
                          className={`btn-icon ${isActive ? 'text-amber' : ''}`}
                          aria-label={isActive && isPlaying ? 'Pause' : `Play ${item.title}`}
                        >
                          {isActive && isPlaying ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="ml-0.5 h-4 w-4" />
                          )}
                        </button>
                        <DownloadButton id={item.id} title={item.title} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {days < grouped.length && (
        <button onClick={() => setDays((d) => d + 30)} className="btn-quiet mx-auto mt-4 flex">
          Show earlier days
        </button>
      )}
    </div>
  )
}
