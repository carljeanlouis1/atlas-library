import { useCallback, useEffect, useState } from 'react'

export type Theme = 'night' | 'daylight'

const KEY = 'atlas-theme'
const GROUND: Record<Theme, string> = { night: '#171310', daylight: '#efeae1' }

export function readTheme(): Theme {
  const attr = document.documentElement.getAttribute('data-theme')
  if (attr === 'daylight' || attr === 'night') return attr
  return 'night'
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', GROUND[theme])
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* no-op */
  }
}

/** Night by default; Daylight for reading in a lit room. */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof document === 'undefined' ? 'night' : readTheme()
  )

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggle = useCallback(() => {
    setThemeState((prev) => (prev === 'night' ? 'daylight' : 'night'))
  }, [])

  return { theme, toggle }
}
