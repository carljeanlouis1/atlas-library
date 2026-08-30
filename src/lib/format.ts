/** 754 -> "12:34", 4231 -> "1:10:31" */
export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Estimated length, worn lightly: "~24m", "~1h 53m". */
export function formatApprox(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 90) return `~${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `~${hours}h ${rest}m` : `~${hours}h`
}

/** Rough spoken length of a body of text, in seconds. ~155 words per minute. */
export function estimateSpokenSeconds(charCount?: number | null): number | null {
  if (!charCount || charCount < 200) return null
  const words = charCount / 5.5
  return Math.round((words / 155) * 60)
}

/** Rough silent-reading length, in minutes. ~240 words per minute. */
export function estimateReadMinutes(charCount?: number | null): number | null {
  if (!charCount || charCount < 400) return null
  const words = charCount / 5.5
  return Math.max(1, Math.round(words / 240))
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function parseDate(value: string): Date {
  // D1 hands back "2026-08-28 14:03:11" (UTC, no zone marker).
  const normalised = value.includes('T') ? value : value.replace(' ', 'T') + 'Z'
  const d = new Date(normalised)
  return Number.isNaN(d.getTime()) ? new Date(value) : d
}

/** "08.28" - the archive's left rail. */
export function formatRailDate(value: string): string {
  const d = parseDate(value)
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`
}

/** "Today", "Yesterday", "3d", "Aug 12", "Aug 12 '25" */
export function formatRelativeDay(value: string): string {
  const d = parseDate(value)
  const now = new Date()
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOf(now) - startOf(d)) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7 && days > 0) return `${days}d`
  const label = `${MONTHS[d.getMonth()]} ${d.getDate()}`
  return d.getFullYear() === now.getFullYear() ? label : `${label} '${String(d.getFullYear()).slice(2)}`
}

/** "August 2026" - archive section headings. */
export function formatMonthHeading(value: string): string {
  const d = parseDate(value)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/** "Friday, 28 August 2026" */
export function formatFullDate(value: string): string {
  return parseDate(value).toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** "14:03" */
export function formatTimeOfDay(value: string): string {
  return parseDate(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

/** "2026-08-28" - stable key for grouping by day. */
export function dayKey(value: string): string {
  const d = parseDate(value)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d
    .getDate()
    .toString()
    .padStart(2, '0')}`
}

/** "2026-08" - stable key for grouping by month. */
export function monthKey(value: string): string {
  return dayKey(value).slice(0, 7)
}
