import { useCallback, useState } from 'react'
import { LibraryItem, Bookmark, runLength } from './library'
import { monthKey, formatMonthHeading, parseDate } from './format'

export type Grouping = 'month' | 'letter' | 'none'

export interface SortSpec {
  id: string
  label: string
  note?: string
  /** How the list is sectioned under this order. Month headings only make
   *  sense while the list is in date order. */
  grouping: Grouping
  compare: (a: LibraryItem, b: LibraryItem, bookmarks: Record<string, Bookmark>) => number
}

const byNewest = (a: LibraryItem, b: LibraryItem) =>
  parseDate(b.created_at).getTime() - parseDate(a.created_at).getTime()

/** Unknown lengths sort to the end rather than pretending to be zero. */
function lengthOf(item: LibraryItem, bookmarks: Record<string, Bookmark>): number | null {
  return runLength(item, bookmarks[item.id])?.seconds ?? null
}

function compareLength(
  a: LibraryItem,
  b: LibraryItem,
  bookmarks: Record<string, Bookmark>,
  direction: 1 | -1
) {
  const la = lengthOf(a, bookmarks)
  const lb = lengthOf(b, bookmarks)
  if (la === null && lb === null) return byNewest(a, b)
  if (la === null) return 1
  if (lb === null) return -1
  return la === lb ? byNewest(a, b) : (lb - la) * direction
}

export const SORTS: SortSpec[] = [
  {
    id: 'newest',
    label: 'Newest first',
    note: 'By date filed',
    grouping: 'month',
    compare: byNewest,
  },
  {
    id: 'oldest',
    label: 'Oldest first',
    note: 'From the beginning',
    grouping: 'month',
    compare: (a, b) => -byNewest(a, b),
  },
  {
    id: 'title',
    label: 'Title A to Z',
    note: 'Grouped by letter',
    grouping: 'letter',
    compare: (a, b) =>
      a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }),
  },
  {
    id: 'title-desc',
    label: 'Title Z to A',
    grouping: 'letter',
    compare: (a, b) =>
      b.title.localeCompare(a.title, undefined, { numeric: true, sensitivity: 'base' }),
  },
  {
    id: 'longest',
    label: 'Longest first',
    note: 'By listening time',
    grouping: 'none',
    compare: (a, b, bookmarks) => compareLength(a, b, bookmarks, 1),
  },
  {
    id: 'shortest',
    label: 'Shortest first',
    note: 'For a short walk',
    grouping: 'none',
    compare: (a, b, bookmarks) => compareLength(a, b, bookmarks, -1),
  },
  {
    id: 'played',
    label: 'Recently played',
    note: 'What you last listened to',
    grouping: 'none',
    compare: (a, b, bookmarks) => {
      const ta = bookmarks[a.id]?.updatedAt ?? 0
      const tb = bookmarks[b.id]?.updatedAt ?? 0
      if (ta === tb) return byNewest(a, b)
      return tb - ta
    },
  },
  {
    id: 'unfinished',
    label: 'Still unfinished',
    note: 'Started but not done',
    grouping: 'none',
    compare: (a, b, bookmarks) => {
      const progress = (item: LibraryItem) => {
        const bm = bookmarks[item.id]
        if (!bm || bm.duration < 1) return -1
        const done = bm.time / bm.duration
        return done > 0.97 ? -1 : done
      }
      const pa = progress(a)
      const pb = progress(b)
      if (pa < 0 && pb < 0) return byNewest(a, b)
      if (pa < 0) return 1
      if (pb < 0) return -1
      return pb - pa
    },
  },
]

export function sortSpec(id: string): SortSpec {
  return SORTS.find((s) => s.id === id) ?? SORTS[0]
}

export interface Section {
  key: string
  heading: string | null
  rows: LibraryItem[]
}

function letterHeading(title: string): { key: string; heading: string } {
  const first = title.trim().charAt(0).toUpperCase()
  return /[A-Z]/.test(first) ? { key: first, heading: first } : { key: '#', heading: '#' }
}

/** Break a sorted list into the sections its order calls for. */
export function sectionise(items: LibraryItem[], grouping: Grouping): Section[] {
  if (grouping === 'none') {
    return items.length ? [{ key: 'all', heading: null, rows: items }] : []
  }

  const sections: Section[] = []
  for (const item of items) {
    const { key, heading } =
      grouping === 'month'
        ? { key: monthKey(item.created_at), heading: formatMonthHeading(item.created_at) }
        : letterHeading(item.title)

    const last = sections[sections.length - 1]
    if (last && last.key === key) last.rows.push(item)
    else sections.push({ key, heading, rows: [item] })
  }
  return sections
}

/** Remembered sort order for one list. Each list keeps its own. */
export function useSortPreference(storageKey: string): [string, (id: string) => void] {
  const [sort, setSort] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved && SORTS.some((s) => s.id === saved) ? saved : 'newest'
    } catch {
      return 'newest'
    }
  })

  const choose = useCallback(
    (id: string) => {
      setSort(id)
      try {
        localStorage.setItem(storageKey, id)
      } catch {
        /* no-op */
      }
    },
    [storageKey]
  )

  return [sort, choose]
}
