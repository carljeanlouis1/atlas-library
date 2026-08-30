import { useState, useRef, useEffect } from 'react'
import { X, ArrowUp, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  role: 'user' | 'assistant'
  message: string
  created_at?: string
}

interface ChatPanelProps {
  contentId: string
  contentTitle: string
  onClose: () => void
  initialMessages?: Message[]
}

const OPENERS = [
  'What is the argument here?',
  'What did I miss?',
  'Push back on this.',
]

export default function ChatPanel({
  contentId,
  contentTitle,
  onClose,
  initialMessages = [],
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setMessages((prev) => [...prev, { id: `${Date.now()}`, role: 'user', message: trimmed }])
    setInput('')
    setLoading(true)
    setFailed(false)

    try {
      const response = await fetch(`/api/chat/${contentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      })
      const data = await response.json()
      if (data.success && data.message) {
        setMessages((prev) => [
          ...prev,
          { id: `${Date.now() + 1}`, role: 'assistant', message: data.message },
        ])
      } else {
        setFailed(true)
      }
    } catch {
      setFailed(true)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-ground/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex h-[88vh] w-full animate-sheet-up flex-col overflow-hidden rounded-t-xl border border-hairline bg-panel sm:h-[80vh] sm:max-w-2xl sm:rounded-xl">
        <header className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-3.5">
          <div className="min-w-0">
            <p className="eyebrow">Discuss</p>
            <p className="truncate font-serif text-[1.05rem] leading-tight">{contentTitle}</p>
          </div>
          <button onClick={onClose} className="btn-icon flex-shrink-0" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {messages.length === 0 && (
            <div className="py-10 text-center">
              <p className="font-serif text-lg text-ink-dim">Ask about this piece.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {OPENERS.map((opener) => (
                  <button key={opener} onClick={() => send(opener)} className="chip">
                    {opener}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) =>
            msg.role === 'user' ? (
              <div key={msg.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-lg rounded-br-sm bg-raise px-4 py-2.5 font-serif text-[1rem] leading-relaxed">
                  {msg.message}
                </p>
              </div>
            ) : (
              <div key={msg.id} className="max-w-[92%]">
                <p className="eyebrow mb-1.5">Atlas</p>
                <div className="reading text-[1.02rem] leading-relaxed">
                  <ReactMarkdown>{msg.message}</ReactMarkdown>
                </div>
              </div>
            )
          )}

          {loading && (
            <div className="flex items-center gap-2 text-ink-mute">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber" />
              <span className="eyebrow">Thinking</span>
            </div>
          )}

          {failed && (
            <p className="rounded-md border border-rust/40 bg-rust/10 px-4 py-2.5 text-sm text-rust">
              That did not go through. Send it again.
            </p>
          )}

          <div ref={endRef} />
        </div>

        <div className="border-t border-hairline p-3 pb-6 sm:pb-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(input)
                }
              }}
              placeholder="Ask about this piece"
              rows={1}
              className="max-h-32 flex-1 resize-none rounded-md border border-hairline bg-ground px-3.5 py-2.5 font-serif text-[1rem] placeholder:text-ink-mute focus:border-amber focus:outline-none"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="btn h-10 w-10 flex-shrink-0 rounded-full bg-amber text-ground hover:brightness-110"
              aria-label="Send"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
