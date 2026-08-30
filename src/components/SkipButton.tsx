import { RotateCcw, RotateCw } from 'lucide-react'
import { SKIP_SECONDS } from '../contexts/AudioQueueContext'

interface SkipButtonProps {
  direction: 'back' | 'forward'
  onClick: () => void
  seconds?: number
  className?: string
}

/**
 * Jump the transport. The number sits inside the arrow so the button says
 * how far it goes, rather than making you find out by pressing it.
 */
export default function SkipButton({
  direction,
  onClick,
  seconds = SKIP_SECONDS,
  className = '',
}: SkipButtonProps) {
  const Icon = direction === 'back' ? RotateCcw : RotateCw
  const label = direction === 'back' ? `Back ${seconds} seconds` : `Forward ${seconds} seconds`

  return (
    <button
      onClick={onClick}
      className={`btn-icon relative flex-shrink-0 ${className}`}
      aria-label={label}
      title={label}
    >
      <Icon className="h-[19px] w-[19px]" strokeWidth={1.5} />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[8px] font-bold leading-none">
        {seconds}
      </span>
    </button>
  )
}
