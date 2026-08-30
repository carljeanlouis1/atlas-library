import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Pause, Loader2, Disc3, FileText, X } from 'lucide-react'
import { fetchLibrary, LibraryItem, parseMetadata } from '../lib/library'
import { useAudioQueue } from '../contexts/AudioQueueContext'
import DownloadButton from '../components/DownloadButton'

export default function Music() {
  const [songs, setSongs] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lyricsFor, setLyricsFor] = useState<LibraryItem | null>(null)

  const { currentTrack, isPlaying, playTrack, playAll, togglePlay } = useAudioQueue()

  useEffect(() => {
    let cancelled = false
    fetchLibrary({ type: 'song' })
      .then((all) => !cancelled && setSongs(all))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const playable = useMemo(() => songs.filter((s) => s.audio_url), [songs])

  const toTrack = (song: LibraryItem) => ({
    id: song.id,
    title: song.title,
    audio_url: song.audio_url as string,
    type: song.type,
    image_url: song.image_url,
  })

  const handlePlay = (song: LibraryItem) => {
    if (!song.audio_url) return
    if (currentTrack?.id === song.id) togglePlay()
    else playTrack(toTrack(song))
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
          <h1 className="font-serif text-3xl leading-tight sm:text-4xl">Music</h1>
          <p className="timecode mt-1">{songs.length} songs</p>
        </div>
        {playable.length > 0 && (
          <button onClick={() => playAll(playable.map(toTrack))} className="btn-primary">
            <Play className="h-4 w-4" />
            Play all
          </button>
        )}
      </div>

      {songs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-hairline py-20 text-center">
          <Disc3 className="mx-auto mb-3 h-6 w-6 text-ink-mute" />
          <p className="font-serif text-lg">No songs yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {songs.map((song) => {
            const meta = parseMetadata(song)
            const isActive = currentTrack?.id === song.id
            const artist = typeof meta.artist_style === 'string' ? meta.artist_style : null
            const duration = typeof meta.duration === 'string' ? meta.duration : null
            const hasLyrics = typeof meta.lyrics === 'string' && meta.lyrics.length > 0

            return (
              <div key={song.id} className="group">
                <div
                  className={`relative aspect-square overflow-hidden rounded-lg border transition-colors ${
                    isActive ? 'border-amber' : 'border-hairline'
                  }`}
                >
                  {song.image_url ? (
                    <img
                      src={song.image_url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-raise">
                      <Disc3 className="h-8 w-8 text-ink-mute" />
                    </div>
                  )}

                  <button
                    onClick={() => handlePlay(song)}
                    className="absolute inset-0 flex items-center justify-center bg-ground/0 transition-colors hover:bg-ground/45 focus-visible:bg-ground/45"
                    aria-label={isActive && isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
                  >
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-full bg-amber text-ground transition-transform ${
                        isActive ? 'scale-100' : 'scale-0 group-hover:scale-100'
                      }`}
                    >
                      {isActive && isPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="ml-0.5 h-5 w-5" />
                      )}
                    </span>
                  </button>

                  {duration && (
                    <span className="timecode absolute bottom-2 right-2 rounded bg-ground/80 px-1.5 py-0.5 text-ink">
                      {duration}
                    </span>
                  )}
                </div>

                <div className="mt-2.5 flex items-start gap-1">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/read/${song.id}`}
                      className={`block truncate font-serif text-[1.02rem] hover:text-amber ${
                        isActive ? 'text-amber' : ''
                      }`}
                    >
                      {song.title}
                    </Link>
                    {artist && <p className="eyebrow mt-0.5 truncate">{artist}</p>}
                  </div>
                  <div className="flex flex-shrink-0 items-center">
                    {hasLyrics && (
                      <button
                        onClick={() => setLyricsFor(song)}
                        className="btn-icon h-7 w-7"
                        aria-label={`Lyrics for ${song.title}`}
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {song.audio_url && (
                      <DownloadButton id={song.id} title={song.title} className="h-7 w-7" />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Lyrics sheet */}
      {lyricsFor && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end sm:items-center sm:justify-center sm:p-6">
          <div
            className="absolute inset-0 animate-fade-in bg-ground/80 backdrop-blur-sm"
            onClick={() => setLyricsFor(null)}
          />
          <div className="relative max-h-[78vh] w-full animate-sheet-up overflow-y-auto rounded-t-xl border border-hairline bg-panel p-5 pb-32 sm:max-w-lg sm:rounded-xl sm:pb-6">
            <div className="sticky -top-5 -mx-5 mb-4 flex items-start justify-between gap-4 bg-panel px-5 pb-3 pt-5">
              <div className="min-w-0">
                <h2 className="truncate font-serif text-xl">{lyricsFor.title}</h2>
                <p className="eyebrow mt-0.5">
                  {String(parseMetadata(lyricsFor).artist_style ?? 'Lyrics')}
                </p>
              </div>
              <button onClick={() => setLyricsFor(null)} className="btn-icon" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="font-serif text-[1.02rem] leading-relaxed">
              {String(parseMetadata(lyricsFor).lyrics ?? '')
                .split('\n')
                .map((line, i) => (
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
          </div>
        </div>
      )}
    </div>
  )
}
