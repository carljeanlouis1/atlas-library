import { useState, useRef, useEffect } from 'react'
import { Volume2, Play, Pause, Check, Loader2 } from 'lucide-react'

interface Voice {
  id: string
  name: string
  gender: 'female' | 'male' | 'neutral'
  description: string
}

const voices: Voice[] = [
  { id: 'nova', name: 'Nova', gender: 'female', description: 'Warm and friendly female voice' },
  { id: 'shimmer', name: 'Shimmer', gender: 'female', description: 'Soft and expressive female voice' },
  { id: 'alloy', name: 'Alloy', gender: 'neutral', description: 'Neutral, balanced voice' },
  { id: 'echo', name: 'Echo', gender: 'male', description: 'Clear male voice' },
  { id: 'fable', name: 'Fable', gender: 'male', description: 'British-accented male voice' },
  { id: 'onyx', name: 'Onyx', gender: 'male', description: 'Deep, authoritative male voice' },
]

const fontSizes = [
  { id: 'sm', label: 'Small' },
  { id: 'md', label: 'Medium' },
  { id: 'lg', label: 'Large' },
]

export default function Settings() {
  const [selectedVoice, setSelectedVoice] = useState(() => 
    localStorage.getItem('atlas-voice') || 'nova'
  )
  const [fontSize, setFontSize] = useState(() =>
    localStorage.getItem('atlas-font-size') || 'md'
  )
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Apply font size to document
  useEffect(() => {
    document.documentElement.classList.remove('font-size-sm', 'font-size-md', 'font-size-lg')
    document.documentElement.classList.add(`font-size-${fontSize}`)
    localStorage.setItem('atlas-font-size', fontSize)
  }, [fontSize])

  const saveVoice = (voiceId: string) => {
    setSelectedVoice(voiceId)
    localStorage.setItem('atlas-voice', voiceId)
  }

  const previewVoice = async (voiceId: string) => {
    if (previewingVoice === voiceId) {
      audioRef.current?.pause()
      setPreviewingVoice(null)
      return
    }

    setLoadingPreview(true)
    setPreviewingVoice(voiceId)

    try {
      // Generate a short preview
      const response = await fetch('/api/voice-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: voiceId,
          text: 'Hello! This is how I sound when reading your content in the Atlas Library.'
        })
      })

      const data = await response.json()
      if (data.audioUrl && audioRef.current) {
        audioRef.current.src = data.audioUrl
        audioRef.current.play()
      }
    } catch (err) {
      console.error('Preview failed:', err)
    }
    setLoadingPreview(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Settings</h1>

      {/* Hidden audio element for previews */}
      <audio ref={audioRef} onEnded={() => setPreviewingVoice(null)} />

      {/* Voice Selection */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-2">Text-to-Speech Voice</h2>
        <p className="text-text-secondary text-sm mb-4">
          Choose the default voice for converting text to speech.
        </p>

        <div className="space-y-2">
          {voices.map((voice) => (
            <div
              key={voice.id}
              onClick={() => saveVoice(voice.id)}
              className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                selectedVoice === voice.id
                  ? 'bg-atlas-500/10 border-atlas-500'
                  : 'bg-surface border-border hover:border-atlas-700/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedVoice === voice.id ? 'border-atlas-500 bg-atlas-500' : 'border-border'
                }`}>
                  {selectedVoice === voice.id && <Check className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {voice.name}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      voice.gender === 'female' ? 'bg-pink-500/20 text-pink-400' :
                      voice.gender === 'male' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {voice.gender}
                    </span>
                  </div>
                  <div className="text-sm text-text-muted">{voice.description}</div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  previewVoice(voice.id)
                }}
                className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
                title="Preview voice"
              >
                {loadingPreview && previewingVoice === voice.id ? (
                  <Loader2 className="w-5 h-5 animate-spin text-atlas-400" />
                ) : previewingVoice === voice.id ? (
                  <Pause className="w-5 h-5 text-atlas-400" />
                ) : (
                  <Play className="w-5 h-5 text-text-muted" />
                )}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Font Size */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-2">Reading Font Size</h2>
        <p className="text-text-secondary text-sm mb-4">
          Adjust the text size for reading content.
        </p>

        <div className="flex gap-2">
          {fontSizes.map((size) => (
            <button
              key={size.id}
              onClick={() => setFontSize(size.id)}
              className={`flex-1 py-3 px-4 rounded-xl border transition-all ${
                fontSize === size.id
                  ? 'bg-atlas-500/10 border-atlas-500 text-atlas-400'
                  : 'bg-surface border-border hover:border-atlas-700/50'
              }`}
            >
              {size.label}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="mt-4 p-4 bg-surface border border-border rounded-xl">
          <p className="text-text-muted text-sm mb-2">Preview:</p>
          <p className={`prose-reading font-size-${fontSize}`}>
            The agents in Minecraft didn't know they were in a simulation. Maya Chen hadn't worn real clothes in three weeks.
          </p>
        </div>
      </section>

      {/* Save confirmation */}
      <div className="text-center text-sm text-text-muted">
        Settings are saved automatically.
      </div>
    </div>
  )
}
