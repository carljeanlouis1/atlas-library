import { useParams } from 'react-router-dom'
import { Headphones, MessageCircle, Share, Bookmark } from 'lucide-react'

export default function Reader() {
  const { id } = useParams()

  // This would fetch from API
  const content = {
    id,
    type: 'text',
    title: 'The Gardener World: A Story from 2041',
    content: `# The Gardener World

## Setting Bible

**Timeline:** 2041 — Seventeen years from now

**The Great Delegation:** Between 2025 and 2035, humanity underwent what historians now call the Great Delegation...`,
    date: '2026-02-01',
    tags: ['fiction', 'ai', 'future'],
    hasAudio: true,
    audioUrl: '/api/audio/gardener-world.mp3',
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium text-atlas-400 uppercase">{content.type}</span>
          <span className="text-text-muted">•</span>
          <span className="text-sm text-text-muted">{content.date}</span>
        </div>
        <h1 className="text-3xl font-bold mb-4">{content.title}</h1>
        <div className="flex items-center gap-2">
          {content.tags.map((tag) => (
            <span key={tag} className="tag-pill">{tag}</span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mb-8 pb-8 border-b border-border">
        {content.hasAudio && (
          <button className="flex items-center gap-2 px-4 py-2 bg-atlas-500 hover:bg-atlas-600 text-white rounded-lg transition-colors">
            <Headphones className="w-4 h-4" />
            Listen
          </button>
        )}
        <button className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg transition-colors">
          <MessageCircle className="w-4 h-4" />
          Discuss
        </button>
        <button className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
          <Bookmark className="w-4 h-4" />
        </button>
        <button className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
          <Share className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <article className="prose-reading">
        <div dangerouslySetInnerHTML={{ __html: content.content.replace(/\n/g, '<br/>') }} />
      </article>
    </div>
  )
}
