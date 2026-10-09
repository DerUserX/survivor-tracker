import { useEffect, useState } from 'react'
import type { SeasonData, SeasonIndexEntry } from '../types'

let indexPromise: Promise<SeasonIndexEntry[]> | null = null
const seasonCache = new Map<number, Promise<SeasonData>>()

export function loadIndex() {
  indexPromise ??= fetch(`${import.meta.env.BASE_URL}data/index.json`).then(r => r.json())
  return indexPromise
}

export function loadSeason(n: number) {
  if (!seasonCache.has(n)) seasonCache.set(n, fetch(`${import.meta.env.BASE_URL}data/seasons/${n}.json`).then(r => r.json()))
  return seasonCache.get(n)!
}

export function useIndex() {
  const [data, setData] = useState<SeasonIndexEntry[] | null>(null)
  useEffect(() => { loadIndex().then(setData) }, [])
  return data
}

export function useSeason(n: number) {
  const [data, setData] = useState<SeasonData | null>(null)
  useEffect(() => {
    let alive = true
    setData(null)
    loadSeason(n).then(d => alive && setData(d))
    return () => { alive = false }
  }, [n])
  return data
}

export const isReunion = (label: string) => /reunion/i.test(label)

export function shortName(name: string) {
  return name.replace(/^Survivor:\s*/, '')
}

export function formatDate(d: string | null | undefined) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Readable text color for a tribe background color. */
export function contrastText(hex: string) {
  const h = hex.replace('#', '')
  if (h.length < 6) return '#fff'
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16))
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#0c0a09' : '#fff'
}
