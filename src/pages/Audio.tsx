import { Play, Pause, Clock, Calendar } from 'lucide-react'

const audioContent = [
  {
    id: '1',
    title: 'The AI Civilization Video: A Deep Dive',
    duration: '12:34',
    date: '2026-02-01',
    type: 'analysis',
  },
  {
    id: '2',
    title: 'Morning Brief: AI News Roundup',
    duration: '5:20',
    date: '2026-02-01',
    type: 'brief',
  },
  {
    id: '3',
    title: 'The Acceleration Gap Debate',
    duration: '18:45',
    date: '2026-01-31',
    type: 'debate',
  },
]

export default function Audio() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Audio Archive</h1>

      <div className="space-y-3">
        {audioContent.map((item) => (
          <div
            key={item.id}
            className="bg-surface border border-border rounded-xl p-4 content-card flex items-center gap-4"
          >
            <button className="w-12 h-12 rounded-full bg-atlas-500 hover:bg-atlas-600 flex items-center justify-center flex-shrink-0 transition-colors">
              <Play className="w-5 h-5 text-white ml-0.5" />
            </button>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{item.title}</h3>
              <div className="flex items-center gap-3 text-sm text-text-muted mt-1">
                <span className="tag-pill">{item.type}</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {item.duration}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {item.date}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
