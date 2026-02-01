import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Headphones, FileText, Gavel, Loader2 } from 'lucide-react'

interface ContentItem {
  id: string
  type: 'text' | 'audio' | 'debate' | 'brief'
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
}

export default function Home() {
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({ text: 0, audio: 0, brief: 0, debate: 0 })

  useEffect(() => {
    fetch('/api/content?limit=20')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setContent(data.content)
          // Count by type
          const c = { text: 0, audio: 0, brief: 0, debate: 0 }
          data.content.forEach((item: ContentItem) => {
            if (c[item.type] !== undefined) c[item.type]++
          })
          setCounts(c)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const contentTypes = [
    { type: 'text' as const, icon: BookOpen, label: 'Stories & Analyses', count: counts.text },
    { type: 'audio' as const, icon: Headphones, label: 'Audio Notes', count: counts.audio },
    { type: 'brief' as const, icon: FileText, label: 'Morning Briefs', count: counts.brief },
    { type: 'debate' as const, icon: Gavel, label: 'Tribunal Debates', count: counts.debate },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Welcome */}
      <div className="mb-12">
        <h1 className="text-3xl font-bold mb-2">Welcome back, Carl</h1>
        <p className="text-text-secondary">Your personal library of stories, analyses, and conversations.</p>
      </div>

      {/* Content type cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {contentTypes.map((ct) => {
          const Icon = ct.icon
          return (
            <div
              key={ct.type}
              className="bg-surface border border-border rounded-xl p-4 content-card cursor-pointer"
            >
              <Icon className="w-6 h-6 text-atlas-400 mb-3" />
              <div className="text-2xl font-bold mb-1">{ct.count}</div>
              <div className="text-sm text-text-secondary">{ct.label}</div>
            </div>
          )
        })}
      </div>

      {/* Recent content */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent</h2>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-atlas-400" />
          </div>
        ) : content.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            No content yet. Atlas will push content here.
          </div>
        ) : (
          <div className="space-y-3">
            {content.map((item) => {
              const Icon = typeIcons[item.type] || BookOpen
              const date = new Date(item.created_at).toLocaleDateString()
              return (
                <Link
                  key={item.id}
                  to={`/read/${item.id}`}
                  className="block bg-surface border border-border rounded-xl overflow-hidden content-card"
                >
                  {item.image_url && (
                    <div className="h-40 w-full overflow-hidden">
                      <img 
                        src={item.image_url} 
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="w-4 h-4 text-atlas-400" />
                          <span className="text-xs font-medium text-atlas-400 uppercase">{item.type}</span>
                          {item.audio_url && (
                            <span className="flex items-center gap-1 text-xs text-text-muted">
                              <Headphones className="w-3 h-3" />
                              Audio
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold mb-2">{item.title}</h3>
                        <p className="text-sm text-text-secondary line-clamp-2">
                          {item.content?.slice(0, 200)}...
                        </p>
                      </div>
                      <div className="text-sm text-text-muted whitespace-nowrap">{date}</div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
