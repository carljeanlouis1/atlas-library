import { estimateSpokenSeconds } from './format'

export interface LibraryItem {
  id: string
  type: string
  title: string
  content?: string
  excerpt?: string
  content_length?: number
  audio_url?: string | null
  image_url?: string | null
  metadata?: Record<string, unknown> | string | null
  created_at: string
}

export interface Bookmark {
  time: number
  duration: number
  updatedAt?: number
}

/** Display names for the kinds of things in the archive. */
export const TYPE_LABELS: Record<string, string> = {
  brief: 'Brief',
  audio: 'Recording',
  text: 'Essay',
  article: 'Essay',
  story: 'Visual',
  song: 'Song',
  debate: 'Debate',
}

export function typeLabel(type: string): string {
  return TYPE_LABELS[type] || type
}

/** D1 hands metadata back as a JSON string; normalise it once on arrival. */
export function parseMetadata(item: LibraryItem): Record<string, unknown> {
  const raw = item.metadata
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  return raw
}

export function normaliseItem<T extends LibraryItem>(item: T): T {
  return { ...item, metadata: parseMetadata(item) }
}

// Every page wants the same archive. Fetch it once and let navigation reuse
// it; five minutes is well inside how often anything new is filed.
const CACHE_TTL = 5 * 60 * 1000
const cache = new Map<string, { at: number; promise: Promise<LibraryItem[]> }>()

/** Fetch the whole archive in slim form, paging until the server runs dry. */
export function fetchLibrary(params: { type?: string; limit?: number } = {}): Promise<LibraryItem[]> {
  const key = params.type ?? 'all'
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.promise

  const promise = loadLibrary(params).catch((err) => {
    cache.delete(key)
    throw err
  })
  cache.set(key, { at: Date.now(), promise })
  return promise
}

/** Drop the cache so the next read hits the network (after publishing, say). */
export function invalidateLibrary() {
  cache.clear()
}

async function loadLibrary(params: { type?: string; limit?: number }): Promise<LibraryItem[]> {
  const pageSize = params.limit ?? 500
  const collected: LibraryItem[] = []
  let offset = 0

  // Two pages covers 1000 items; the archive is a few hundred today.
  for (let page = 0; page < 4; page++) {
    const query = new URLSearchParams({ list: '1', limit: String(pageSize), offset: String(offset) })
    if (params.type) query.set('type', params.type)

    const res = await fetch(`/api/content?${query.toString()}`)
    if (!res.ok) break
    const data = (await res.json()) as { success?: boolean; content?: LibraryItem[] }
    const batch = data.content ?? []
    collected.push(...batch.map(normaliseItem))
    if (batch.length < pageSize) break
    offset += pageSize
  }

  return collected
}

/* ------------------------------------------------------------------ *
 * Listening position. Key shape is unchanged so positions saved by
 * earlier versions still resume.
 * ------------------------------------------------------------------ */

const posKey = (id: string) => `atlas-audio-pos-${id}`

export function getBookmark(id: string): Bookmark | null {
  try {
    const raw = localStorage.getItem(posKey(id))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Bookmark
    return typeof parsed?.time === 'number' ? parsed : null
  } catch {
    return null
  }
}

export function saveBookmark(id: string, time: number, duration: number) {
  if (time < 2 || duration < 1) return
  try {
    localStorage.setItem(posKey(id), JSON.stringify({ time, duration, updatedAt: Date.now() }))
  } catch {
    /* storage full or blocked - listening still works, we just forget the spot */
  }
}

export function clearBookmark(id: string) {
  try {
    localStorage.removeItem(posKey(id))
  } catch {
    /* no-op */
  }
}

export function readAllBookmarks(items: { id: string }[]): Record<string, Bookmark> {
  const out: Record<string, Bookmark> = {}
  for (const item of items) {
    const bm = getBookmark(item.id)
    if (bm) out[item.id] = bm
  }
  return out
}

/**
 * How long this item runs, and how sure we are.
 * Exact once it has been played (the position record stores the real
 * duration); otherwise estimated from the length of the text.
 */
export function runLength(
  item: LibraryItem,
  bookmark?: Bookmark | null
): { seconds: number; exact: boolean } | null {
  if (bookmark?.duration && bookmark.duration > 1) {
    return { seconds: bookmark.duration, exact: true }
  }

  const meta = parseMetadata(item)
  const metaDuration = meta.duration
  if (typeof metaDuration === 'string' && /^\d{1,2}:\d{2}$/.test(metaDuration)) {
    const [m, s] = metaDuration.split(':').map(Number)
    return { seconds: m * 60 + s, exact: true }
  }
  if (typeof metaDuration === 'number' && metaDuration > 1) {
    return { seconds: metaDuration, exact: true }
  }

  const estimated = estimateSpokenSeconds(item.content_length ?? item.content?.length)
  return estimated ? { seconds: estimated, exact: false } : null
}

/** The save-to-device URL for any item that has audio. */
export function downloadUrl(id: string): string {
  return `/api/download/${id}`
}
