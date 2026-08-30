import { useState, useRef, useEffect } from 'react'
import { Download, Check } from 'lucide-react'
import { downloadUrl } from '../lib/library'

type Variant = 'icon' | 'inline' | 'primary'

interface DownloadButtonProps {
  id: string
  title: string
  variant?: Variant
  className?: string
  /** Overrides the visible text on the inline and primary variants. */
  label?: string
}

/**
 * Saves an item's audio to the device. The server sends it back with a
 * Content-Disposition filename, so the browser writes
 * "2026-08-28 Morning Brief.mp3" rather than a hashed URL fragment.
 */
export default function DownloadButton({
  id,
  title,
  variant = 'icon',
  className = '',
  label,
}: DownloadButtonProps) {
  const [started, setStarted] = useState(false)
  const timer = useRef<number>()

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const handleClick = (e: React.MouseEvent) => {
    // Rows are clickable; downloading should not also start playback.
    e.stopPropagation()
    setStarted(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setStarted(false), 2200)
  }

  const Icon = started ? Check : Download
  const shared = {
    href: downloadUrl(id),
    download: '',
    onClick: handleClick,
    'aria-label': `Download audio for ${title}`,
    title: started ? 'Download started' : 'Download audio',
  }

  if (variant === 'icon') {
    return (
      <a
        {...shared}
        className={`btn-icon flex-shrink-0 ${started ? 'text-amber' : ''} ${className}`}
      >
        <Icon className="h-4 w-4" />
      </a>
    )
  }

  if (variant === 'primary') {
    return (
      <a {...shared} className={`btn-primary ${className}`}>
        <Icon className="h-4 w-4" />
        {started ? 'Downloading' : label || 'Download audio'}
      </a>
    )
  }

  return (
    <a {...shared} className={`btn-quiet ${started ? 'text-amber border-amber/50' : ''} ${className}`}>
      <Icon className="h-4 w-4" />
      {started ? 'Downloading' : label || 'Download'}
    </a>
  )
}
