import { useMemo, useRef, useEffect, useState } from 'react'
import { LibraryItem } from '../lib/library'
import { dayKey, parseDate } from '../lib/format'

interface ArchiveDialProps {
  items: LibraryItem[]
  activeDay: string | null
  onSelectDay: (day: string | null) => void
}

interface Tick {
  day: string
  count: number
  label: string
  monthStart: string | null
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Every day the archive covers, as one tick. Bar height is how much was
 * filed that day; gaps are days when nothing was. Click a day to jump the
 * list to it.
 */
export default function ArchiveDial({ items, activeDay, onSelectDay }: ArchiveDialProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<Tick | null>(null)

  const ticks = useMemo<Tick[]>(() => {
    if (items.length === 0) return []

    const counts = new Map<string, number>()
    let min = Infinity
    let max = -Infinity

    for (const item of items) {
      const key = dayKey(item.created_at)
      counts.set(key, (counts.get(key) ?? 0) + 1)
      const t = parseDate(item.created_at).getTime()
      if (t < min) min = t
      if (t > max) max = t
    }

    const cursor = new Date(min)
    cursor.setHours(12, 0, 0, 0)
    const end = new Date(max)
    end.setHours(12, 0, 0, 0)

    const out: Tick[] = []
    let lastMonth = ''
    // Guard against a bad date making this run away.
    for (let i = 0; cursor <= end && i < 4000; i++) {
      const key = `${cursor.getFullYear()}-${(cursor.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${cursor.getDate().toString().padStart(2, '0')}`
      const monthId = key.slice(0, 7)
      out.push({
        day: key,
        count: counts.get(key) ?? 0,
        label: `${MONTH_SHORT[cursor.getMonth()]} ${cursor.getDate()}`,
        monthStart: monthId !== lastMonth ? MONTH_SHORT[cursor.getMonth()] : null,
      })
      lastMonth = monthId
      cursor.setDate(cursor.getDate() + 1)
    }
    return out
  }, [items])

  // Open on the most recent end of the archive.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [ticks.length])

  if (ticks.length < 2) return null

  const busiest = Math.max(...ticks.map((t) => t.count), 1)
  const shown = hovered ?? ticks.find((t) => t.day === activeDay) ?? null

  return (
    <section className="mb-8">
      <div className="eyebrow-rule mb-2">
        <span className="eyebrow">The dial</span>
        <span className="timecode">
          {shown ? `${shown.label} — ${shown.count} ${shown.count === 1 ? 'entry' : 'entries'}` : `${ticks.length} days`}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="hide-scrollbar overflow-x-auto rounded-lg border border-hairline bg-panel px-3 pt-3"
        onMouseLeave={() => setHovered(null)}
      >
        {/* Each tick's target is the whole column, not the 3px bar. */}
        <div className="flex h-11 items-stretch">
          {ticks.map((tick) => {
            const isActive = tick.day === activeDay
            const height = tick.count === 0 ? 2 : 6 + (tick.count / busiest) * 26
            const strength = tick.count === 0 ? 0 : 0.35 + (tick.count / busiest) * 0.65
            return (
              <button
                key={tick.day}
                onMouseEnter={() => setHovered(tick)}
                onClick={() => onSelectDay(isActive || tick.count === 0 ? null : tick.day)}
                disabled={tick.count === 0}
                aria-label={`${tick.label}, ${tick.count} ${tick.count === 1 ? 'entry' : 'entries'}`}
                className="group flex w-[5px] flex-shrink-0 items-end justify-center disabled:cursor-default"
              >
                <span
                  className="w-[3px] rounded-full transition-[height,background-color] duration-200 group-hover:brightness-125"
                  style={{
                    height: `${height}px`,
                    backgroundColor: isActive
                      ? 'rgb(var(--rust))'
                      : tick.count === 0
                        ? 'rgb(var(--hairline))'
                        : `rgb(var(--amber) / ${strength})`,
                  }}
                />
              </button>
            )
          })}
        </div>

        <div className="mt-1 flex h-5">
          {ticks.map((tick) => (
            <div key={tick.day} className="relative w-[5px] flex-shrink-0">
              {tick.monthStart && (
                <>
                  <span className="absolute left-0 top-0 h-1.5 w-px bg-hairline" />
                  <span className="timecode absolute left-1 top-1.5 whitespace-nowrap">
                    {tick.monthStart}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {activeDay && (
        <button
          onClick={() => onSelectDay(null)}
          className="chip chip-on mt-3"
        >
          Showing {activeDay} — clear
        </button>
      )}
    </section>
  )
}
