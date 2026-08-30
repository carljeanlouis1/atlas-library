import { Link } from 'react-router-dom'
import { Play, Pause, ListPlus, Check, FileText } from 'lucide-react'
import { LibraryItem, Bookmark, typeLabel, runLength } from '../lib/library'
import { formatClock, formatRailDate, estimateReadMinutes, formatApprox } from '../lib/format'
import DownloadButton from './DownloadButton'

interface ArchiveRowProps {
  item: LibraryItem
  bookmark?: Bookmark | null
  isActive: boolean
  isPlaying: boolean
  queued: boolean
  onPlay: (item: LibraryItem) => void
  onQueue: (item: LibraryItem) => void
}

/**
 * One line of the archive. The left rail carries the date, the right the
 * length; a hairline under the row fills in as far as you have listened.
 */
export default function ArchiveRow({
  item,
  bookmark,
  isActive,
  isPlaying,
  queued,
  onPlay,
  onQueue,
}: ArchiveRowProps) {
  const length = runLength(item, bookmark)
  const readMinutes = estimateReadMinutes(item.content_length ?? item.content?.length)
  const progress =
    bookmark && bookmark.duration > 1 ? Math.min((bookmark.time / bookmark.duration) * 100, 100) : 0

  return (
    <div
      className={`group relative flex items-center gap-3 border-b border-hairline px-2 py-3 transition-colors sm:gap-4 sm:px-3 ${
        isActive ? 'bg-amber/[0.06]' : 'hover:bg-panel'
      }`}
    >
      <span className={`timecode w-10 flex-shrink-0 ${isActive ? 'text-amber' : ''}`}>
        {formatRailDate(item.created_at)}
      </span>

      <Link to={`/read/${item.id}`} className="min-w-0 flex-1">
        <h3
          className={`truncate font-serif text-[1.02rem] leading-snug transition-colors ${
            isActive ? 'text-amber' : 'group-hover:text-amber'
          }`}
        >
          {item.title}
        </h3>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="eyebrow">{typeLabel(item.type)}</span>
          {length && (
            <span className="timecode">
              {length.exact ? formatClock(length.seconds) : formatApprox(length.seconds)}
            </span>
          )}
          {!item.audio_url && readMinutes && (
            <span className="timecode flex items-center gap-1">
              <FileText className="h-2.5 w-2.5" />
              {readMinutes}m read
            </span>
          )}
          {progress > 2 && progress < 99 && (
            <span className="timecode text-amber">{Math.round(progress)}%</span>
          )}
        </div>
      </Link>

      <div className="flex flex-shrink-0 items-center gap-0.5">
        {item.audio_url ? (
          <>
            <button
              onClick={() => onPlay(item)}
              className={`btn-icon ${isActive ? 'text-amber' : ''}`}
              aria-label={isActive && isPlaying ? `Pause ${item.title}` : `Play ${item.title}`}
            >
              {isActive && isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="ml-0.5 h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => onQueue(item)}
              className={`btn-icon hidden sm:flex ${queued ? 'text-amber' : ''}`}
              aria-label={queued ? 'Queued' : `Add ${item.title} to queue`}
            >
              {queued ? <Check className="h-4 w-4" /> : <ListPlus className="h-4 w-4" />}
            </button>
            <DownloadButton id={item.id} title={item.title} />
          </>
        ) : (
          <span className="eyebrow px-2 hidden sm:inline">Text only</span>
        )}
      </div>

      {progress > 0 && (
        <span
          className="absolute bottom-0 left-0 h-px bg-amber/70"
          style={{ width: `${progress}%` }}
          aria-hidden
        />
      )}
    </div>
  )
}
