import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react'
import { getBookmark, saveBookmark, clearBookmark } from '../lib/library'
import { formatClock } from '../lib/format'

export interface QueueItem {
  id: string
  title: string
  audio_url: string
  type: string
  image_url?: string | null
}

interface AudioQueueContextType {
  currentTrack: QueueItem | null
  isPlaying: boolean
  currentTime: number
  duration: number
  queue: QueueItem[]
  rate: number
  bookmarkSaved: boolean
  resumeMessage: string | null

  playTrack: (item: QueueItem) => void
  playAll: (items: QueueItem[]) => void
  togglePlay: () => void
  skip: (seconds: number) => void
  seek: (time: number) => void
  skipToNext: () => void
  setRate: (rate: number) => void
  stop: () => void

  addToQueue: (item: QueueItem) => void
  isQueued: (id: string) => boolean
  removeFromQueue: (index: number) => void
  moveInQueue: (index: number, direction: 'up' | 'down') => void
  clearQueue: () => void
  saveCurrentBookmark: () => void
}

const AudioQueueContext = createContext<AudioQueueContextType | null>(null)

export function useAudioQueue() {
  const ctx = useContext(AudioQueueContext)
  if (!ctx) throw new Error('useAudioQueue must be used within AudioQueueProvider')
  return ctx
}

const STATE_KEY = 'atlas-player-state'
const RATE_KEY = 'atlas-playback-rate'

/** How far the rewind and fast-forward controls jump. */
export const SKIP_SECONDS = 10

interface PersistedState {
  current: QueueItem | null
  queue: QueueItem[]
}

function loadPersisted(): PersistedState {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (!raw) return { current: null, queue: [] }
    const parsed = JSON.parse(raw) as PersistedState
    return {
      current: parsed.current?.audio_url ? parsed.current : null,
      queue: Array.isArray(parsed.queue) ? parsed.queue.filter((t) => t?.audio_url) : [],
    }
  } catch {
    return { current: null, queue: [] }
  }
}

function loadRate(): number {
  const stored = Number(localStorage.getItem(RATE_KEY))
  return stored >= 0.5 && stored <= 3 ? stored : 1
}

export function AudioQueueProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentTrack, setCurrentTrack] = useState<QueueItem | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [rate, setRateState] = useState(1)
  const [bookmarkSaved, setBookmarkSaved] = useState(false)
  const [resumeMessage, setResumeMessage] = useState<string | null>(null)
  const [trackEnded, setTrackEnded] = useState(false)

  const lastSaveRef = useRef(0)
  const pendingRestoreRef = useRef<string | null>(null)
  const currentTrackRef = useRef<QueueItem | null>(null)
  const restoredRef = useRef(false)

  useEffect(() => {
    currentTrackRef.current = currentTrack
  }, [currentTrack])

  /* ---------------- restore last session ---------------- */
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true

    setRateState(loadRate())

    const { current, queue: savedQueue } = loadPersisted()
    if (savedQueue.length) setQueue(savedQueue)
    if (current && audioRef.current) {
      // Cue it up paused, at the saved position - never autoplay on load.
      audioRef.current.src = current.audio_url
      pendingRestoreRef.current = current.id
      setCurrentTrack(current)
    }
  }, [])

  /* ---------------- persist ---------------- */
  useEffect(() => {
    try {
      // A "play all" over the whole archive can run to hundreds of entries;
      // only the next stretch is worth carrying across a reload.
      localStorage.setItem(
        STATE_KEY,
        JSON.stringify({ current: currentTrack, queue: queue.slice(0, 200) })
      )
    } catch {
      /* no-op */
    }
  }, [currentTrack, queue])

  const startTrack = useCallback((item: QueueItem) => {
    if (!audioRef.current) return
    const bm = getBookmark(item.id)
    if (bm && bm.time > 2) pendingRestoreRef.current = item.id
    audioRef.current.src = item.audio_url
    audioRef.current.playbackRate = loadRate()
    audioRef.current.play().catch(() => {})
    setCurrentTrack(item)
    setIsPlaying(true)
    setCurrentTime(0)
    setDuration(0)
  }, [])

  const playTrack = useCallback(
    (item: QueueItem) => {
      const track = currentTrackRef.current
      if (track && audioRef.current && audioRef.current.currentTime > 2) {
        saveBookmark(track.id, audioRef.current.currentTime, audioRef.current.duration || 0)
      }
      startTrack(item)
    },
    [startTrack]
  )

  /** Play the first item and line the rest up behind it. */
  const playAll = useCallback(
    (items: QueueItem[]) => {
      if (!items.length) return
      const [first, ...rest] = items
      setQueue(rest)
      startTrack(first)
    },
    [startTrack]
  )

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentTrackRef.current) return
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
    } else {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }, [])

  const stop = useCallback(() => {
    const track = currentTrackRef.current
    if (track && audioRef.current && audioRef.current.currentTime > 2) {
      saveBookmark(track.id, audioRef.current.currentTime, audioRef.current.duration || 0)
    }
    audioRef.current?.pause()
    setIsPlaying(false)
    setCurrentTrack(null)
    setCurrentTime(0)
    setDuration(0)
  }, [])

  const skip = useCallback((seconds: number) => {
    if (!audioRef.current) return
    const dur = audioRef.current.duration || 0
    if (dur > 0) {
      audioRef.current.currentTime = Math.max(
        0,
        Math.min(audioRef.current.currentTime + seconds, dur)
      )
    }
  }, [])

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return
    const dur = audioRef.current.duration || 0
    if (dur > 0 && time >= 0 && time <= dur) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  const setRate = useCallback((next: number) => {
    setRateState(next)
    try {
      localStorage.setItem(RATE_KEY, String(next))
    } catch {
      /* no-op */
    }
    if (audioRef.current) audioRef.current.playbackRate = next
  }, [])

  const skipToNext = useCallback(() => {
    setQueue((prev) => {
      if (prev.length === 0) return prev
      const [next, ...rest] = prev
      startTrack(next)
      return rest
    })
  }, [startTrack])

  const addToQueue = useCallback((item: QueueItem) => {
    setQueue((prev) => (prev.some((t) => t.id === item.id) ? prev : [...prev, item]))
  }, [])

  const isQueued = useCallback((id: string) => queue.some((t) => t.id === id), [queue])

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const moveInQueue = useCallback((index: number, direction: 'up' | 'down') => {
    setQueue((prev) => {
      const next = [...prev]
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }, [])

  const clearQueue = useCallback(() => setQueue([]), [])

  const saveCurrentBookmark = useCallback(() => {
    const track = currentTrackRef.current
    if (!track || !audioRef.current) return
    saveBookmark(track.id, audioRef.current.currentTime, audioRef.current.duration || 0)
    setBookmarkSaved(true)
    setTimeout(() => setBookmarkSaved(false), 2000)
  }, [])

  /* Auto-advance once a track finishes. */
  useEffect(() => {
    if (!trackEnded) return
    setTrackEnded(false)
    setQueue((prev) => {
      if (prev.length === 0) return prev
      const [next, ...rest] = prev
      startTrack(next)
      return rest
    })
  }, [trackEnded, startTrack])

  /* ---------------- element events ---------------- */
  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return
    const time = audioRef.current.currentTime
    setCurrentTime(time)
    const track = currentTrackRef.current
    if (!track) return
    const now = Date.now()
    if (now - lastSaveRef.current >= 5000) {
      lastSaveRef.current = now
      saveBookmark(track.id, time, audioRef.current.duration || 0)
    }
  }, [])

  const handleCanPlay = useCallback(() => {
    if (!audioRef.current) return
    setDuration(audioRef.current.duration || 0)
    audioRef.current.playbackRate = loadRate()
    if (pendingRestoreRef.current) {
      const bm = getBookmark(pendingRestoreRef.current)
      if (bm && bm.time > 2) {
        audioRef.current.currentTime = bm.time
        setCurrentTime(bm.time)
        setResumeMessage(`Picking up at ${formatClock(bm.time)}`)
        setTimeout(() => setResumeMessage(null), 3500)
      }
      pendingRestoreRef.current = null
    }
  }, [])

  const handleEnded = useCallback(() => {
    const track = currentTrackRef.current
    if (track) clearBookmark(track.id)
    setIsPlaying(false)
    setTrackEnded(true)
  }, [])

  const handleDurationChange = useCallback(() => {
    if (audioRef.current) setDuration(audioRef.current.duration || 0)
  }, [])

  const handlePause = useCallback(() => {
    setIsPlaying(false)
    const track = currentTrackRef.current
    if (!track || !audioRef.current || audioRef.current.currentTime <= 2) return
    saveBookmark(track.id, audioRef.current.currentTime, audioRef.current.duration || 0)
  }, [])

  const handlePlay = useCallback(() => setIsPlaying(true), [])

  useEffect(() => {
    const handleUnload = () => {
      const track = currentTrackRef.current
      if (track && audioRef.current) {
        saveBookmark(track.id, audioRef.current.currentTime, audioRef.current.duration || 0)
      }
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [])

  /* ---------------- lock screen / headphone controls ---------------- */
  useEffect(() => {
    const ms = navigator.mediaSession
    if (!ms) return

    if (!currentTrack) {
      ms.metadata = null
      ms.playbackState = 'none'
      return
    }

    ms.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: 'Atlas Library',
      album: currentTrack.type === 'song' ? 'Records' : 'Archive',
      artwork: currentTrack.image_url
        ? [{ src: currentTrack.image_url, sizes: '512x512', type: 'image/png' }]
        : [],
    })
    ms.playbackState = isPlaying ? 'playing' : 'paused'

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => { audioRef.current?.play().catch(() => {}); setIsPlaying(true) }],
      ['pause', () => { audioRef.current?.pause(); setIsPlaying(false) }],
      // Some platforms hand us their own offset; honour it when they do.
      ['seekbackward', (details) => skip(-(details.seekOffset || SKIP_SECONDS))],
      ['seekforward', (details) => skip(details.seekOffset || SKIP_SECONDS)],
      ['nexttrack', () => skipToNext()],
      ['seekto', (details) => { if (details.seekTime != null) seek(details.seekTime) }],
    ]

    for (const [action, handler] of handlers) {
      try {
        ms.setActionHandler(action, handler)
      } catch {
        /* the browser does not support this action */
      }
    }
  }, [currentTrack, isPlaying, skip, seek, skipToNext])

  useEffect(() => {
    if (navigator.mediaSession && duration > 0 && Number.isFinite(duration)) {
      try {
        navigator.mediaSession.setPositionState({
          duration,
          position: Math.min(currentTime, duration),
          playbackRate: rate,
        })
      } catch {
        /* ignore - position state is a nicety */
      }
    }
  }, [currentTime, duration, rate])

  return (
    <AudioQueueContext.Provider
      value={{
        currentTrack, isPlaying, currentTime, duration, queue, rate,
        bookmarkSaved, resumeMessage,
        playTrack, playAll, togglePlay, skip, seek, skipToNext, setRate, stop,
        addToQueue, isQueued, removeFromQueue, moveInQueue, clearQueue, saveCurrentBookmark,
      }}
    >
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleDurationChange}
        onDurationChange={handleDurationChange}
        onCanPlay={handleCanPlay}
        onEnded={handleEnded}
        onPause={handlePause}
        onPlay={handlePlay}
      />
      {children}
    </AudioQueueContext.Provider>
  )
}
