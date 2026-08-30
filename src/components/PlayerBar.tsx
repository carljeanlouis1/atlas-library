import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Play, Pause, SkipForward, ListMusic, Bookmark,
  X, ChevronUp, ChevronDown, Trash2, Gauge, ChevronRight,
} from 'lucide-react'
import { useAudioQueue, SKIP_SECONDS } from '../contexts/AudioQueueContext'
import { formatClock } from '../lib/format'
import { typeLabel } from '../lib/library'
import DownloadButton from './DownloadButton'
import SkipButton from './SkipButton'

const RATES = [1, 1.25, 1.5, 1.75, 2]

export default function PlayerBar() {
  const [queueOpen, setQueueOpen] = useState(false)
  const [rateOpen, setRateOpen] = useState(false)

  const {
    currentTrack, isPlaying, currentTime, duration, queue, rate,
    bookmarkSaved, resumeMessage,
    togglePlay, skip, seek, skipToNext, setRate, stop,
    removeFromQueue, moveInQueue, clearQueue, saveCurrentBookmark,
  } = useAudioQueue()

  if (!currentTrack) return null

  const fill = duration > 0 ? (currentTime / duration) * 100 : 0
  const cycleRate = () => setRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length] ?? 1)

  return (
    <>
      {/* Up next */}
      {queueOpen && (
        <div className="fixed inset-x-0 bottom-[8.25rem] z-40 px-3 sm:bottom-[5.5rem]">
          <div className="mx-auto max-w-shell">
            <div className="animate-sheet-up overflow-hidden rounded-lg border border-hairline bg-panel shadow-lift">
              <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
                <span className="eyebrow">
                  Up next{queue.length > 0 && ` — ${queue.length}`}
                </span>
                <div className="flex items-center gap-1">
                  {queue.length > 0 && (
                    <button
                      onClick={clearQueue}
                      className="btn text-2xs uppercase tracking-eyebrow text-ink-mute hover:text-rust px-2 py-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Clear
                    </button>
                  )}
                  <button onClick={() => setQueueOpen(false)} className="btn-icon h-7 w-7">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto">
                {queue.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-ink-mute">
                    Nothing queued. Add tracks with the queue button on any recording.
                  </p>
                ) : (
                  queue.map((item, i) => (
                    <div
                      key={`${item.id}-${i}`}
                      className="flex items-center gap-3 border-b border-hairline/60 px-4 py-2.5 last:border-0 hover:bg-raise"
                    >
                      <span className="timecode w-5 text-center">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/read/${item.id}`}
                          className="block truncate font-serif text-[0.95rem] hover:text-amber"
                          onClick={() => setQueueOpen(false)}
                        >
                          {item.title}
                        </Link>
                        <span className="eyebrow">{typeLabel(item.type)}</span>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-0.5">
                        <button
                          onClick={() => moveInQueue(i, 'up')}
                          disabled={i === 0}
                          className="btn-icon h-7 w-7 disabled:opacity-20"
                          aria-label="Move up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveInQueue(i, 'down')}
                          disabled={i === queue.length - 1}
                          className="btn-icon h-7 w-7 disabled:opacity-20"
                          aria-label="Move down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <DownloadButton id={item.id} title={item.title} className="h-7 w-7" />
                        <button
                          onClick={() => removeFromQueue(i)}
                          className="btn-icon h-7 w-7 hover:text-rust"
                          aria-label="Remove from queue"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transport */}
      <div className="fixed inset-x-0 bottom-14 z-50 border-t border-hairline bg-panel sm:bottom-0">
        <div className="mx-auto max-w-shell px-3 pb-2 pt-1 sm:px-5 sm:pb-3">
          <div className="flex items-center gap-2">
            <span className="timecode w-11 flex-shrink-0 text-right">{formatClock(currentTime)}</span>
            <input
              type="range"
              className="transport flex-1"
              min={0}
              max={duration || 100}
              step={0.5}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              style={{ ['--fill' as string]: `${fill}%` }}
              aria-label="Seek"
            />
            <span className="timecode w-11 flex-shrink-0">{formatClock(duration)}</span>
          </div>

          {/* On a phone the title takes its own row so every control keeps a
              real touch target; on a wider screen it all sits in one line. */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            {/* Now playing */}
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {currentTrack.image_url ? (
                <img
                  src={currentTrack.image_url}
                  alt=""
                  className="hidden h-10 w-10 flex-shrink-0 rounded border border-hairline object-cover sm:block"
                />
              ) : null}
              <div className="min-w-0">
                <Link
                  to={`/read/${currentTrack.id}`}
                  className="block truncate font-serif text-[0.95rem] leading-tight hover:text-amber"
                >
                  {currentTrack.title}
                </Link>
                <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                  <span className="eyebrow flex-shrink-0">
                    {isPlaying ? 'Playing' : 'Paused'}
                    <span className="hidden sm:inline"> — {typeLabel(currentTrack.type)}</span>
                  </span>
                  {resumeMessage && <span className="timecode truncate text-amber">{resumeMessage}</span>}
                  {bookmarkSaved && <span className="timecode truncate text-amber">Position saved</span>}
                </div>
              </div>
            </div>

            {/* Transport controls */}
            <div className="flex items-center justify-between gap-0.5 sm:justify-end sm:gap-1.5">
              <SkipButton direction="back" onClick={() => skip(-SKIP_SECONDS)} />
              <button
                onClick={togglePlay}
                className="btn h-11 w-11 flex-shrink-0 rounded-full bg-amber text-ground hover:brightness-110 sm:h-10 sm:w-10"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
              </button>
              <SkipButton direction="forward" onClick={() => skip(SKIP_SECONDS)} />
              {queue.length > 0 && (
                <button onClick={skipToNext} className="btn-icon" aria-label="Next in queue">
                  <SkipForward className="h-4 w-4" />
                </button>
              )}

            {/* Speed */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setRateOpen((v) => !v)}
                onBlur={() => window.setTimeout(() => setRateOpen(false), 150)}
                className={`btn-icon w-auto px-2 ${rate !== 1 ? 'text-amber' : ''}`}
                aria-label="Playback speed"
              >
                <Gauge className="h-4 w-4" />
                <span className="timecode ml-1 text-ink-dim">{rate}x</span>
              </button>
              {rateOpen && (
                <div className="absolute bottom-11 right-0 z-10 w-20 overflow-hidden rounded-md border border-hairline bg-panel shadow-lift">
                  {RATES.map((r) => (
                    <button
                      key={r}
                      onMouseDown={() => setRate(r)}
                      className={`block w-full px-3 py-1.5 text-left font-mono text-2xs hover:bg-raise ${
                        r === rate ? 'text-amber' : 'text-ink-dim'
                      }`}
                    >
                      {r}x
                    </button>
                  ))}
                </div>
              )}
            </div>
              <button
                onClick={cycleRate}
                className={`btn-icon w-auto px-2 sm:hidden ${rate !== 1 ? 'text-amber' : ''}`}
                aria-label="Change playback speed"
              >
                <span className="timecode">{rate}x</span>
              </button>

            <button
              onClick={saveCurrentBookmark}
              className={`btn-icon hidden sm:flex ${bookmarkSaved ? 'text-amber' : ''}`}
              aria-label="Save position"
            >
              <Bookmark className={`h-4 w-4 ${bookmarkSaved ? 'fill-current' : ''}`} />
            </button>

            <DownloadButton id={currentTrack.id} title={currentTrack.title} />

            <button
              onClick={() => setQueueOpen((v) => !v)}
              className={`btn-icon relative ${queueOpen ? 'bg-raise text-amber' : ''}`}
              aria-label="Queue"
            >
              <ListMusic className="h-4 w-4" />
              {queue.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber px-1 font-mono text-[9px] font-bold text-ground">
                  {queue.length > 9 ? '9+' : queue.length}
                </span>
              )}
            </button>

            <button
              onClick={stop}
              className="btn-icon hidden text-ink-mute hover:text-rust lg:flex"
              aria-label="Close player"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
