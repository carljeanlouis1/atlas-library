import { BookOpen, Headphones, FileText, Gavel } from 'lucide-react'

const timelineItems = [
  {
    id: '1',
    type: 'text',
    title: 'The Gardener World',
    date: '2026-02-01',
    time: '01:15',
  },
  {
    id: '2',
    type: 'audio',
    title: 'AI Civilization Analysis',
    date: '2026-02-01',
    time: '00:28',
  },
  {
    id: '3',
    type: 'debate',
    title: 'The Acceleration Gap',
    date: '2026-01-31',
    time: '19:12',
  },
  {
    id: '4',
    type: 'brief',
    title: 'Morning Brief',
    date: '2026-01-31',
    time: '08:00',
  },
]

const typeIcons = {
  text: BookOpen,
  audio: Headphones,
  brief: FileText,
  debate: Gavel,
}

export default function Timeline() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Timeline</h1>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

        {/* Items */}
        <div className="space-y-6">
          {timelineItems.map((item) => {
            const Icon = typeIcons[item.type as keyof typeof typeIcons]
            return (
              <div key={item.id} className="flex gap-4">
                <div className="relative z-10 w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center">
                  <Icon className="w-5 h-5 text-atlas-400" />
                </div>
                <div className="flex-1 bg-surface border border-border rounded-xl p-4 content-card">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-atlas-400 uppercase">{item.type}</span>
                    <span className="text-sm text-text-muted">{item.time}</span>
                  </div>
                  <h3 className="font-medium">{item.title}</h3>
                  <div className="text-sm text-text-muted mt-1">{item.date}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
