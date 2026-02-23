import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Headphones, FileText, Gavel, Loader2, Image, Search, LayoutGrid, List, X } from 'lucide-react'

interface ContentItem {
  id: string
  type: 'text' | 'audio' | 'debate' | 'brief' | 'story'
  title: string
  content?: string
  audio_url?: string
  image_url?: string
  metadata?: string
  created_at: string
}

const typeIcons = {
  text: BookOpen,
  audio: Headphones,
  brief: FileText,
  debate: Gavel,
  story: Image,
}

const typeLabels: Record<string, string> = {
  text: 'Story',
  audio: 'Audio',
  brief: 'Brief',
  debate: 'Debate',
  story: 'Visual',
}

export default function Home() {
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({ text: 0, audio: 0, brief: 0, debate: 0, story: 0 })
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('atlas-view-mode') as 'grid' | 'list') || 'grid'
  })
  const [searching, setSearching] = useState(false)
  const [allContent, setAllContent] = useState<ContentItem[]>([])

  // Load all content on mount
  useEffect(() => {
    fetch('/api/content?limit=100')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAllContent(data.content)
          setContent(data.content)
          const c = { text: 0, audio: 0, brief: 0, debate: 0, story: 0 }
          data.content.forEach((item: ContentItem) => {
            if (c[item.type as keyof typeof c] !== undefined) c[item.type as keyof typeof c]++
          })
          setCounts(c)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Search effect
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setContent(allContent)
      setSearching(false)
      return
    }
    setSearching(true)
    fetch(`/api/content?limit=100&search=${encodeURIComponent(debouncedSearch)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setContent(data.content)
        setSearching(false)
      })
      .catch(() => setSearching(false))
  }, [debouncedSearch, allContent])

  // Persist view mode
  const toggleView = useCallback((mode: 'grid' | 'list') => {
    setViewMode(mode)
    localStorage.setItem('atlas-view-mode', mode)
  }, [])

  const filtered = content.filter(item => !selectedType || item.type === selectedType)

  const contentTypes = [
    { type: 'text' as const, icon: BookOpen, label: 'Stories', count: counts.text },
    { type: 'audio' as const, icon: Headphones, label: 'Audio', count: counts.audio },
    { type: 'brief' as const, icon: FileText, label: 'Briefs', count: counts.brief },
    { type: 'debate' as const, icon: Gavel, label: 'Debates', count: counts.debate },
    { type: 'story' as const, icon: Image, label: 'Visual', count: counts.story },
  ]

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-1">Library</h1>
        <p className="text-sm text-text-secondary">{allContent.length} items</p>
      </div>

      {/* Search bar */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search titles and content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-3 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:border-atlas-400 focus:ring-1 focus:ring-atlas-400/30 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-atlas-400" />
        )}
      </div>

      {/* Filter chips + view toggle */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {contentTypes.filter(ct => ct.count > 0).map((ct) => {
            const isActive = selectedType === ct.type
            return (
              <button
                key={ct.type}
                onClick={() => setSelectedType(isActive ? null : ct.type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-atlas-400 text-white'
                    : 'bg-surface border border-border text-text-secondary hover:border-atlas-400/50'
                }`}
              >
                <ct.icon className="w-3 h-3" />
                {ct.label}
                <span className={isActive ? 'text-white/70' : 'text-text-muted'}>{ct.count}</span>
              </button>
            )
          })}
        </div>
        <div className="flex items-center border border-border rounded-lg overflow-hidden shrink-0">
          <button
            onClick={() => toggleView('grid')}
            className={`p-1.5 ${viewMode === 'grid' ? 'bg-atlas-400/20 text-atlas-400' : 'text-text-muted hover:text-text-secondary'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => toggleView('list')}
            className={`p-1.5 ${viewMode === 'list' ? 'bg-atlas-400/20 text-atlas-400' : 'text-text-muted hover:text-text-secondary'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-atlas-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          {searchQuery ? `No results for "${searchQuery}"` : 'No content yet.'}
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-surface">
          {filtered.map((item) => {
            const Icon = typeIcons[item.type] || BookOpen
            return (
              <Link
                key={item.id}
                to={`/read/${item.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors active:bg-white/10"
              >
                <Icon className="w-4 h-4 text-atlas-400 shrink-0" />
                <span className="flex-1 min-w-0 text-sm font-medium truncate">{item.title}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {item.audio_url && <Headphones className="w-3 h-3 text-text-muted" />}
                  <span className="text-xs text-text-muted">{formatDate(item.created_at)}</span>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        /* Grid/Card View */
        <div className="space-y-3">
          {filtered.map((item) => {
            const Icon = typeIcons[item.type] || BookOpen
            return (
              <Link
                key={item.id}
                to={`/read/${item.id}`}
                className="block bg-surface border border-border rounded-xl overflow-hidden content-card active:scale-[0.99] transition-transform"
              >
                {item.image_url && (
                  <div className="h-32 md:h-40 w-full overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-4 md:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Icon className="w-3.5 h-3.5 text-atlas-400" />
                        <span className="text-xs font-medium text-atlas-400 uppercase">{typeLabels[item.type] || item.type}</span>
                        {item.audio_url && (
                          <span className="flex items-center gap-1 text-xs text-text-muted">
                            <Headphones className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm md:text-base mb-1">{item.title}</h3>
                      {item.content && (
                        <p className="text-xs md:text-sm text-text-secondary line-clamp-2">
                          {item.content.slice(0, 150)}...
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-text-muted whitespace-nowrap">{formatDate(item.created_at)}</div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
