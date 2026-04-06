import { createContext, useContext, useRef, useState, useCallback, useEffect, ReactNode } from 'react'

export interface QueueItem {
  id: string
  title: string
  audio_url: string
  type: string
}

interface AudioQueueContextType {
  currentTrack: QueueItem | null
  isPlaying: boolean
  currentTime: number
  duration: number
  queue: QueueItem[]
  bookmarkSaved: boolean
  resumeMessage: string | null

  playTrack: (item: QueueItem) => void
  togglePlay: () => void
  skip: (seconds: number) => void
  seek: (time: number) => void
  skipToNext: () => void

  addToQueue: (item: QueueItem) => void
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

function getBookmark(id: string): { time: number; duration: number } | null {
  try {
    const raw = localStorage.getItem(`atlas-audio-pos-${id}`)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveBookmarkData(id: string, time: number, duration: number) {
  if (time < 2 || duration < 1) return
  localStorage.setItem(`atlas-audio-pos-${id}`, JSON.stringify({ time, duration, updatedAt: Date.now() }))
}

function clearBookmark(id: string) {
  localStorage.removeItem(`atlas-audio-pos-${id}`)
}

function fmtTime(time: number) {
  const mins = Math.floor(time / 60)
  const secs = Math.floor(time % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function AudioQueueProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentTrack, setCurrentTrack] = useState<QueueItem | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [bookmarkSaved, setBookmarkSaved] = useState(false)
  const [resumeMessage, setResumeMessage] = useState<string | null>(null)
  const [trackEnded, setTrackEnded] = useState(false)

  const lastSaveRef = useRef(0)
  const pendingRestoreRef = useRef<string | null>(null)
  // Keep a ref for use inside event handlers without stale closure issues
  const currentTrackRef = useRef<QueueItem | null>(null)

  useEffect(() => {
    currentTrackRef.current = currentTrack
  }, [currentTrack])

  const startTrack = useCallback((item: QueueItem) => {
    if (!audioRef.current) return
    const bm = getBookmark(item.id)
    if (bm && bm.time > 2) {
      pendingRestoreRef.current = item.id
    }
    audioRef.current.src = item.audio_url
    audioRef.current.play().catch(() => {})
    setCurrentTrack(item)
    setIsPlaying(true)
    setCurrentTime(0)
    setDuration(0)
  }, [])

  const playTrack = useCallback((item: QueueItem) => {
    const track = currentTrackRef.current
    if (track && audioRef.current && audioRef.current.currentTime > 2) {
      saveBookmarkData(track.id, audioRef.current.currentTime, audioRef.current.duration || 0)
    }
    startTrack(item)
  }, [startTrack])

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
    }
  }, [isPlaying])

  const skip = useCallback((seconds: number) => {
    if (!audioRef.current) return
    const dur = audioRef.current.duration || 0
    if (dur > 0) {
      audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.currentTime + seconds, dur))
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

  const skipToNext = useCallback(() => {
    setQueue(prev => {
      if (prev.length === 0) return prev
      const [next, ...rest] = prev
      startTrack(next)
      return rest
    })
  }, [startTrack])

  const addToQueue = useCallback((item: QueueItem) => {
    setQueue(prev => [...prev, item])
  }, [])

  const removeFromQueue = useCallback((index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index))
  }, [])

  const moveInQueue = useCallback((index: number, direction: 'up' | 'down') => {
    setQueue(prev => {
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
    saveBookmarkData(track.id, audioRef.current.currentTime, audioRef.current.duration || 0)
    setBookmarkSaved(true)
    setTimeout(() => setBookmarkSaved(false), 2000)
  }, [])

  // Auto-advance when track ends
  useEffect(() => {
    if (!trackEnded) return
    setTrackEnded(false)
    setQueue(prev => {
      if (prev.length === 0) return prev
      const [next, ...rest] = prev
      startTrack(next)
      return rest
    })
  }, [trackEnded, startTrack])

  // Audio event handlers
  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return
    const time = audioRef.current.currentTime
    setCurrentTime(time)
    const track = currentTrackRef.current
    if (!track) return
    const now = Date.now()
    if (now - lastSaveRef.current >= 5000) {
      lastSaveRef.current = now
      saveBookmarkData(track.id, time, audioRef.current.duration || 0)
    }
  }, [])

  const handleCanPlay = useCallback(() => {
    if (!audioRef.current) return
    setDuration(audioRef.current.duration || 0)
    if (pendingRestoreRef.current) {
      const bm = getBookmark(pendingRestoreRef.current)
      if (bm && bm.time > 2) {
        audioRef.current.currentTime = bm.time
        setCurrentTime(bm.time)
        setResumeMessage(`Resuming from ${fmtTime(bm.time)}`)
        setTimeout(() => setResumeMessage(null), 3000)
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
    const track = currentTrackRef.current
    if (!track || !audioRef.current || audioRef.current.currentTime <= 2) return
    saveBookmarkData(track.id, audioRef.current.currentTime, audioRef.current.duration || 0)
  }, [])

  useEffect(() => {
    const handleUnload = () => {
      const track = currentTrackRef.current
      if (track && audioRef.current) {
        saveBookmarkData(track.id, audioRef.current.currentTime, audioRef.current.duration || 0)
      }
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [])

  return (
    <AudioQueueContext.Provider value={{
      currentTrack, isPlaying, currentTime, duration, queue,
      bookmarkSaved, resumeMessage,
      playTrack, togglePlay, skip, seek, skipToNext,
      addToQueue, removeFromQueue, moveInQueue, clearQueue, saveCurrentBookmark,
    }}>
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleDurationChange}
        onDurationChange={handleDurationChange}
        onCanPlay={handleCanPlay}
        onEnded={handleEnded}
        onPause={handlePause}
      />
      {children}
    </AudioQueueContext.Provider>
  )
}
