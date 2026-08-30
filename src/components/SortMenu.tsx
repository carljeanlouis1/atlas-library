import { useEffect, useRef, useState } from 'react'
import { ArrowUpDown, Check, ChevronDown } from 'lucide-react'

export interface SortOption {
  id: string
  label: string
  /** Shown under the label in the menu when the order needs a word of explanation. */
  note?: string
}

interface SortMenuProps {
  options: SortOption[]
  value: string
  onChange: (id: string) => void
  className?: string
}

export default function SortMenu({ options, value, onChange, className = '' }: SortMenuProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = options.find((o) => o.id === value) ?? options[0]

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="eyebrow flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-ink"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Sort order: ${current.label}`}
      >
        <ArrowUpDown className="h-3 w-3" />
        {current.label}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-30 mt-1.5 w-52 overflow-hidden rounded-md border border-hairline bg-panel shadow-lift"
        >
          {options.map((option) => {
            const selected = option.id === value
            return (
              <button
                key={option.id}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.id)
                  setOpen(false)
                }}
                className={`flex w-full items-start justify-between gap-3 border-b border-hairline/50 px-3 py-2 text-left last:border-0 transition-colors hover:bg-raise ${
                  selected ? 'text-amber' : 'text-ink-dim'
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-sm leading-tight">{option.label}</span>
                  {option.note && <span className="eyebrow">{option.note}</span>}
                </span>
                {selected && <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
