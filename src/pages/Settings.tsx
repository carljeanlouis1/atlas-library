import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Check, Loader2, Sun, Moon } from 'lucide-react'
import { useTheme } from '../lib/theme'
import { useAudioQueue } from '../contexts/AudioQueueContext'

const VOICES = [
  { id: 'nova', name: 'Nova', note: 'Warm, even-tempered' },
  { id: 'shimmer', name: 'Shimmer', note: 'Soft, expressive' },
  { id: 'alloy', name: 'Alloy', note: 'Neutral and level' },
  { id: 'echo', name: 'Echo', note: 'Clear, unhurried' },
  { id: 'fable', name: 'Fable', note: 'British, storytelling' },
  { id: 'onyx', name: 'Onyx', note: 'Deep, authoritative' },
]

const FONT_SIZES = [
  { id: 'sm', label: 'Small' },
  { id: 'md', label: 'Medium' },
  { id: 'lg', label: 'Large' },
]

const RATES = [1, 1.25, 1.5, 1.75, 2]

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-10">
      <div className="eyebrow-rule mb-1">
        <span className="eyebrow">{title}</span>
      </div>
      <p className="mb-4 text-sm text-ink-dim">{hint}</p>
      {children}
    </section>
  )
}

export default function Settings() {
  const { theme, toggle } = useTheme()
  const { rate, setRate } = useAudioQueue()
  const [voice, setVoice] = useState(() => localStorage.getItem('atlas-voice') || 'nova')
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('atlas-font-size') || 'md')
  const [previewing, setPreviewing] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    document.documentElement.classList.remove('font-size-sm', 'font-size-md', 'font-size-lg')
    document.documentElement.classList.add(`font-size-${fontSize}`)
    localStorage.setItem('atlas-font-size', fontSize)
  }, [fontSize])

  const chooseVoice = (id: string) => {
    setVoice(id)
    localStorage.setItem('atlas-voice', id)
  }

  const previewVoice = async (id: string) => {
    if (previewing === id) {
      audioRef.current?.pause()
      setPreviewing(null)
      return
    }
    setLoadingPreview(true)
    setPreviewing(id)
    try {
      const response = await fetch('/api/voice-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: id,
          text: 'This is how I sound reading the morning brief.',
        }),
      })
      const data = await response.json()
      if (data.audioUrl && audioRef.current) {
        audioRef.current.src = data.audioUrl
        audioRef.current.play().catch(() => {})
      } else {
        setPreviewing(null)
      }
    } catch {
      setPreviewing(null)
    }
    setLoadingPreview(false)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-8 font-serif text-3xl leading-tight sm:text-4xl">Settings</h1>

      <audio ref={audioRef} onEnded={() => setPreviewing(null)} />

      <Section title="Appearance" hint="Night for the small hours, Daylight for reading in a lit room.">
        <button
          onClick={toggle}
          className="flex w-full items-center justify-between rounded-lg border border-hairline bg-panel p-4 text-left transition-colors hover:border-ink-mute"
        >
          <span className="flex items-center gap-3">
            {theme === 'night' ? <Moon className="h-4 w-4 text-amber" /> : <Sun className="h-4 w-4 text-amber" />}
            <span className="font-serif text-lg capitalize">{theme}</span>
          </span>
          <span className="eyebrow">Switch to {theme === 'night' ? 'daylight' : 'night'}</span>
        </button>
      </Section>

      <Section title="Playback speed" hint="Applies to everything the player plays, and it sticks.">
        <div className="flex gap-2">
          {RATES.map((r) => (
            <button
              key={r}
              onClick={() => setRate(r)}
              className={`chip flex-1 justify-center py-2 ${rate === r ? 'chip-on' : ''}`}
            >
              {r}x
            </button>
          ))}
        </div>
      </Section>

      <Section title="Narration voice" hint="Used when you generate narration for something new.">
        <div className="overflow-hidden rounded-lg border border-hairline">
          {VOICES.map((v) => (
            <div
              key={v.id}
              onClick={() => chooseVoice(v.id)}
              className={`flex cursor-pointer items-center gap-3 border-b border-hairline p-4 last:border-0 transition-colors ${
                voice === v.id ? 'bg-amber/[0.07]' : 'bg-panel hover:bg-raise'
              }`}
            >
              <span
                className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${
                  voice === v.id ? 'border-amber bg-amber' : 'border-hairline'
                }`}
              >
                {voice === v.id && <Check className="h-2.5 w-2.5 text-ground" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-serif text-lg leading-tight">{v.name}</span>
                <span className="eyebrow">{v.note}</span>
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  previewVoice(v.id)
                }}
                className="btn-icon"
                aria-label={`Preview ${v.name}`}
              >
                {loadingPreview && previewing === v.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-amber" />
                ) : previewing === v.id ? (
                  <Pause className="h-4 w-4 text-amber" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Reading size" hint="Changes the body text on every article.">
        <div className="flex gap-2">
          {FONT_SIZES.map((size) => (
            <button
              key={size.id}
              onClick={() => setFontSize(size.id)}
              className={`chip flex-1 justify-center py-2 ${fontSize === size.id ? 'chip-on' : ''}`}
            >
              {size.label}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-hairline bg-panel p-4">
          <p className="reading mb-0">
            The agents did not know they were in a simulation. Maya Chen had not worn real clothes in
            three weeks.
          </p>
        </div>
      </Section>

      <Section title="Keyboard" hint="Anywhere in the library.">
        <div className="overflow-hidden rounded-lg border border-hairline bg-panel">
          {[
            ['/  or  cmd K', 'Search the archive'],
            ['space', 'Play or pause'],
            ['enter', 'Open the highlighted result'],
            ['cmd enter', 'Play the highlighted result'],
          ].map(([key, what]) => (
            <div
              key={key}
              className="flex items-center justify-between border-b border-hairline px-4 py-2.5 last:border-0"
            >
              <span className="timecode">{key}</span>
              <span className="text-sm text-ink-dim">{what}</span>
            </div>
          ))}
        </div>
      </Section>

      <p className="timecode text-center">Saved as you go</p>
    </div>
  )
}
