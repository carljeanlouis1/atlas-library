import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Headphones, FileText, Gavel, Loader2 } from 'lucide-react'

interface TimelineItem {
  id: string
  type: 'text' | 'audio' | 'debate' | 'brief'
  title: string
  created_at: string
}

const typeIcons = {
  text: BookOpen,
  audio: Headphones,
  brief: FileText,
  debate: Gavel,
}

export default function Timeline() {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/content?limit=50')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setItems(data.content)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Group by date
  const groupedByDate = items.reduce((acc, item) => {
    const date = new Date(item.created_at).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(item)
    return acc
  }, {} as Record<string, TimelineItem[]>)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Timeline</h1>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-atlas-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          No content yet.
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedByDate).map(([date, dateItems]) => (
            <div key={date}>
              <h2 className="text-sm font-medium text-text-muted mb-4">{date}</h2>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

                {/* Items */}
                <div className="space-y-4">
                  {dateItems.map((item) => {
                    const Icon = typeIcons[item.type] || BookOpen
                    const time = new Date(item.created_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit'
                    })
                    return (
                      <Link key={item.id} to={`/read/${item.id}`} className="flex gap-4 group">
                        <div className="relative z-10 w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center group-hover:border-atlas-500 transition-colors">
                          <Icon className="w-5 h-5 text-atlas-400" />
                        </div>
                        <div className="flex-1 bg-surface border border-border rounded-xl p-4 content-card">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-atlas-400 uppercase">{item.type}</span>
                            <span className="text-sm text-text-muted">{time}</span>
                          </div>
                          <h3 className="font-medium">{item.title}</h3>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
