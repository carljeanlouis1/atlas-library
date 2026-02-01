import { useState, useRef, useEffect } from 'react'
import { X, Send, Loader2 } from 'lucide-react'

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

export default function ChatPanel({ contentId, contentTitle, onClose, initialMessages = [] }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      message: input.trim()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch(`/api/chat/${contentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.message })
      })

      const data = await response.json()

      if (data.success && data.message) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          message: data.message
        }
        setMessages(prev => [...prev, assistantMessage])
      }
    } catch (err) {
      console.error('Chat error:', err)
    }

    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl h-[80vh] bg-background border border-border rounded-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-semibold">Discuss with Atlas</h3>
            <p className="text-sm text-text-muted truncate max-w-md">{contentTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-text-muted py-8">
              <p>Ask me anything about this content!</p>
              <p className="text-sm mt-2">I'll discuss, explain, or analyze it with you.</p>
            </div>
          )}
          
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-atlas-500 text-white'
                    : 'bg-surface border border-border'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.message}</p>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-surface border border-border rounded-2xl px-4 py-2">
                <Loader2 className="w-5 h-5 animate-spin text-atlas-400" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this content..."
              rows={1}
              className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-atlas-500 transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="px-4 bg-atlas-500 hover:bg-atlas-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
