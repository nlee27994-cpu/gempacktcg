import { DATA_VERSION } from '../lib/catalog'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

// Tracks which packs of each Gempack Series drop have been opened in this browser,
// so a drop sells down as you rip it. Real launches would track this on a server.
const SeriesContext = createContext(null)
// Keyed to the catalog version so saved ids never point at the wrong products
const STORAGE_KEY = `gempack-series-opened-${DATA_VERSION}`

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return saved && typeof saved === 'object' ? saved : {}
  } catch {
    return {}
  }
}

export function SeriesProvider({ children }) {
  const [opened, setOpened] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(opened))
    } catch {
      // Storage unavailable: progress lasts until refresh.
    }
  }, [opened])

  const value = useMemo(
    () => ({
      openedFor: (seriesId) => opened[seriesId] ?? [],
      // Opens a random sealed pack from the drop; returns its card ids, or null if sold out
      openNext: (series) => {
        const done = new Set(opened[series.id] ?? [])
        const sealed = series.packs.map((_, i) => i).filter((i) => !done.has(i))
        if (sealed.length === 0) return null
        const index = sealed[Math.floor(Math.random() * sealed.length)]
        setOpened((prev) => ({ ...prev, [series.id]: [...(prev[series.id] ?? []), index] }))
        return series.packs[index]
      },
      reset: (seriesId) =>
        setOpened((prev) => {
          const next = { ...prev }
          delete next[seriesId]
          return next
        }),
    }),
    [opened],
  )

  return <SeriesContext.Provider value={value}>{children}</SeriesContext.Provider>
}

export const useSeries = () => useContext(SeriesContext)
