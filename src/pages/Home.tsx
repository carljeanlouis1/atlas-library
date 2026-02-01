import { BookOpen, Headphones, FileText, Gavel } from 'lucide-react'

const contentTypes = [
  { type: 'text', icon: BookOpen, label: 'Stories & Analyses', count: 3 },
  { type: 'audio', icon: Headphones, label: 'Audio Notes', count: 5 },
  { type: 'brief', icon: FileText, label: 'Morning Briefs', count: 12 },
  { type: 'debate', icon: Gavel, label: 'Tribunal Debates', count: 2 },
]

const recentContent = [
  {
    id: '1',
    type: 'text',
    title: 'The Gardener World: A Story from 2041',
    excerpt: 'Maya Chen hadn\'t worn real clothes in three weeks...',
    date: '2026-02-01',
    tags: ['fiction', 'ai', 'future'],
  },
  {
    id: '2',
    type: 'audio',
    title: 'The AI Civilization Video: A Deep Dive',
    excerpt: 'Analysis of AI agents building civilizations in Minecraft...',
    date: '2026-02-01',
    tags: ['analysis', 'youtube', 'ai-agents'],
    hasAudio: true,
  },
  {
    id: '3',
    type: 'debate',
    title: 'The AI Acceleration Gap',
    excerpt: 'Three models debate whether AI adoption gaps will create permanent advantages...',
    date: '2026-01-31',
    tags: ['tribunal', 'ai', 'society'],
    hasAudio: true,
  },
]

export default function Home() {
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
        <div className="space-y-3">
          {recentContent.map((item) => (
            <div
              key={item.id}
              className="bg-surface border border-border rounded-xl p-5 content-card cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-atlas-400 uppercase">{item.type}</span>
                    {item.hasAudio && (
                      <span className="flex items-center gap-1 text-xs text-text-muted">
                        <Headphones className="w-3 h-3" />
                        Audio
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold mb-2 truncate">{item.title}</h3>
                  <p className="text-sm text-text-secondary line-clamp-2">{item.excerpt}</p>
                  <div className="flex items-center gap-2 mt-3">
                    {item.tags.map((tag) => (
                      <span key={tag} className="tag-pill">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="text-sm text-text-muted whitespace-nowrap">{item.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
