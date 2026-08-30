import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Loader2, ListPlus, Headphones } from 'lucide-react'
import {
  fetchLibrary, LibraryItem, Bookmark, readAllBookmarks, typeLabel,
} from '../lib/library'
import { formatClock, monthKey, formatMonthHeading } from '../lib/format'
import { useAudioQueue } from '../contexts/AudioQueueContext'
import ArchiveRow from '../components/ArchiveRow'
import DownloadButton from '../components/DownloadButton'

export default function Audio() {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [bookmarks, setBookmarks] = useState<Record<string, Bookmark>>({})
  const [loading, setLoading] = useState(true)

  const { currentTrack, isPlaying, playTrack, playAll, togglePlay, addToQueue, queue } =
    useAudioQueue()

  useEffect(() => {
    let cancelled = false
    fetchLibrary()
      .then((all) => {
        if (cancelled) return
        const withAudio = all.filter((item) => item.audio_url && item.type !== 'song')
        setItems(withAudio)
        setBookmarks(readAllBookmarks(withAudio))
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const inProgress = useMemo(
    () =>
      items
        .filter((item) => {
          const bm = bookmarks[item.id]
          return bm && bm.duration > 1 && bm.time / bm.duration < 0.97
        })
        .sort((a, b) => (bookmarks[b.id]?.updatedAt ?? 0) - (bookmarks[a.id]?.updatedAt ?? 0))
        .slice(0, 4),
    [items, bookmarks]
  )

  const months = useMemo(() => {
    const groups: { key: string; heading: string; rows: LibraryItem[] }[] = []
    for (const item of items) {
      const key = monthKey(item.created_at)
      const last = groups[groups.length - 1]
      if (last && last.key === key) last.rows.push(item)
      else groups.push({ key, heading: formatMonthHeading(item.created_at), rows: [item] })
    }
    return groups
  }, [items])

  const toTrack = (item: LibraryItem) => ({
    id: item.id,
    title: item.title,
    audio_url: item.audio_url as string,
    type: item.type,
    image_url: item.image_url,
  })

  const handlePlay = (item: LibraryItem) => {
    if (currentTrack?.id === item.id) togglePlay()
    else playTrack(toTrack(item))
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-amber" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-shell px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl leading-tight sm:text-4xl">Audio</h1>
          <p className="timecode mt-1">
            {items.length} recordings — briefs, essays and readings
          </p>
        </div>
        {items.length > 0 && (
          <div className="flex gap-2">
            <button onClick={() => playAll(items.map(toTrack))} className="btn-primary">
              <Play className="h-4 w-4" />
              Play all
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-hairline py-20 text-center">
          <Headphones className="mx-auto mb-3 h-6 w-6 text-ink-mute" />
          <p className="font-serif text-lg">No recordings yet.</p>
          <p className="mt-1 text-sm text-ink-dim">
            Open any essay or brief and generate narration to start the shelf.
          </p>
        </div>
      ) : (
        <>
          {inProgress.length > 0 && (
            <section className="mb-10">
              <div className="eyebrow-rule mb-4">
                <span className="eyebrow">Half-listened</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {inProgress.map((item) => {
                  const bm = bookmarks[item.id]
                  const pct = Math.round((bm.time / bm.duration) * 100)
                  return (
                    <div
                      key={item.id}
                      className="group relative overflow-hidden rounded-lg border border-hairline bg-panel p-4"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handlePlay(item)}
                          className="btn h-10 w-10 flex-shrink-0 rounded-full bg-amber text-ground hover:brightness-110"
                          aria-label={`Resume ${item.title}`}
                        >
                          <Play className="ml-0.5 h-4 w-4" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/read/${item.id}`}
                            className="line-clamp-2 font-serif text-[1.02rem] leading-snug hover:text-amber"
                          >
                            {item.title}
                          </Link>
                          <p className="timecode mt-1">
                            {formatClock(bm.time)} of {formatClock(bm.duration)} — {pct}%
                          </p>
                        </div>
                        <DownloadButton id={item.id} title={item.title} />
                      </div>
                      <span
                        className="absolute bottom-0 left-0 h-0.5 bg-amber"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          <section>
            <div className="eyebrow-rule mb-4">
              <span className="eyebrow">Everything</span>
              <button
                onClick={() => items.forEach((item) => addToQueue(toTrack(item)))}
                className="eyebrow inline-flex items-center gap-1.5 hover:text-amber"
              >
                <ListPlus className="h-3 w-3" />
                Queue all
              </button>
            </div>

            <div className="border-t border-hairline">
              {months.map((group) => (
                <div key={group.key}>
                  <div className="sticky top-14 z-10 flex items-center justify-between border-b border-hairline bg-ground px-2 py-2 sm:px-3">
                    <span className="eyebrow">{group.heading}</span>
                    <span className="timecode">
                      {group.rows.length} {typeLabel('audio').toLowerCase()}
                      {group.rows.length === 1 ? '' : 's'}
                    </span>
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
                      onQueue={(i) => addToQueue(toTrack(i))}
                    />
                  ))}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
