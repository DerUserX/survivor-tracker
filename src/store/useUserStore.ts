import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Rating {
  score: number
  text: string
  updatedAt: string
}

interface UserState {
  /** season -> watched episode numbers */
  watched: Record<number, number[]>
  /** `${season}-${episode}` -> rating */
  ratings: Record<string, Rating>
  /** season -> personal season rating */
  seasonRatings: Record<number, Rating>
  /** personal season ranking (best first) */
  seasonRanking: number[]
  /** `${season}-${episode}` -> saved reddit thread url */
  threadLinks: Record<string, string>
  hideUnwatchedTitles: boolean

  watchUpTo: (season: number, ep: number, allEps: number[]) => void
  toggleWatched: (season: number, ep: number) => void
  rate: (season: number, ep: number, score: number, text: string) => void
  clearRating: (season: number, ep: number) => void
  rateSeason: (season: number, score: number, text: string) => void
  setRanking: (ranking: number[]) => void
  setThreadLink: (season: number, ep: number, url: string) => void
  setHideUnwatchedTitles: (v: boolean) => void
  importData: (data: unknown) => void
}

export const epKey = (season: number, ep: number) => `${season}-${ep}`

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      watched: {},
      ratings: {},
      seasonRatings: {},
      seasonRanking: [],
      threadLinks: {},
      hideUnwatchedTitles: true,

      watchUpTo: (season, ep, allEps) => set(s => ({
        watched: { ...s.watched, [season]: allEps.filter(e => e <= ep) },
      })),
      // checking an episode marks all earlier ones too; unchecking removes it and all later ones
      toggleWatched: (season, ep) => set(s => {
        const cur = s.watched[season] ?? []
        const next = cur.includes(ep)
          ? cur.filter(e => e < ep)
          : [...new Set([...cur, ...Array.from({ length: ep }, (_, i) => i + 1)])].sort((a, b) => a - b)
        return { watched: { ...s.watched, [season]: next } }
      }),
      rate: (season, ep, score, text) => set(s => ({
        ratings: { ...s.ratings, [epKey(season, ep)]: { score, text, updatedAt: new Date().toISOString() } },
        watched: (s.watched[season] ?? []).includes(ep)
          ? s.watched
          : { ...s.watched, [season]: [...(s.watched[season] ?? []), ep].sort((a, b) => a - b) },
      })),
      clearRating: (season, ep) => set(s => {
        const ratings = { ...s.ratings }
        delete ratings[epKey(season, ep)]
        return { ratings }
      }),
      rateSeason: (season, score, text) => set(s => ({
        seasonRatings: { ...s.seasonRatings, [season]: { score, text, updatedAt: new Date().toISOString() } },
      })),
      setRanking: seasonRanking => set({ seasonRanking }),
      setThreadLink: (season, ep, url) => set(s => {
        const threadLinks = { ...s.threadLinks }
        if (url.trim()) threadLinks[epKey(season, ep)] = url.trim()
        else delete threadLinks[epKey(season, ep)]
        return { threadLinks }
      }),
      setHideUnwatchedTitles: hideUnwatchedTitles => set({ hideUnwatchedTitles }),
      importData: data => {
        const d = data as Partial<UserState>
        if (!d || typeof d !== 'object' || !('ratings' in d)) throw new Error('Ungültige Datei')
        set({
          watched: d.watched ?? {},
          ratings: d.ratings ?? {},
          seasonRatings: d.seasonRatings ?? {},
          seasonRanking: d.seasonRanking ?? [],
          threadLinks: d.threadLinks ?? {},
          hideUnwatchedTitles: d.hideUnwatchedTitles ?? true,
        })
      },
    }),
    { name: 'survivor-tracker', version: 1 },
  ),
)

export function exportUserData() {
  const { watched, ratings, seasonRatings, seasonRanking, threadLinks, hideUnwatchedTitles } = useUserStore.getState()
  const blob = new Blob(
    [JSON.stringify({ app: 'survivor-tracker', exportedAt: new Date().toISOString(), watched, ratings, seasonRatings, seasonRanking, threadLinks, hideUnwatchedTitles }, null, 2)],
    { type: 'application/json' },
  )
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `survivor-tracker-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

/** Highest watched episode = spoiler horizon */
export function horizonOf(watched: number[] | undefined) {
  return watched?.length ? Math.max(...watched) : 0
}
