import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Rating {
  score: number
  text: string
  updatedAt: string
}

/** Everything that is synced between devices. */
export interface UserData {
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
  /**
   * Last-modified time per entry ("w:40", "r:40-3", "sr:40", "tl:40-3", "rank", "opt:hide").
   * Lets the sync merge two devices entry by entry; a stamp without a value is a deletion.
   */
  stamps: Record<string, number>
}

interface UserState extends UserData {
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

const stamp = (s: UserData, ...keys: string[]) => {
  const now = Date.now()
  return { ...s.stamps, ...Object.fromEntries(keys.map(k => [k, now])) }
}

export const DATA_KEYS = ['watched', 'ratings', 'seasonRatings', 'seasonRanking', 'threadLinks', 'hideUnwatchedTitles', 'stamps'] as const

export function pickData(s: UserData): UserData {
  return Object.fromEntries(DATA_KEYS.map(k => [k, s[k]])) as unknown as UserData
}

/** All stamp keys a document has data for (older data may have no stamps yet). */
export function entryKeys(d: UserData) {
  return [
    ...Object.keys(d.watched).map(s => `w:${s}`),
    ...Object.keys(d.ratings).map(k => `r:${k}`),
    ...Object.keys(d.seasonRatings).map(s => `sr:${s}`),
    ...Object.keys(d.threadLinks).map(k => `tl:${k}`),
    ...(d.seasonRanking.length ? ['rank'] : []),
    'opt:hide',
  ]
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      watched: {},
      ratings: {},
      seasonRatings: {},
      seasonRanking: [],
      threadLinks: {},
      hideUnwatchedTitles: true,
      stamps: {},

      watchUpTo: (season, ep, allEps) => set(s => ({
        watched: { ...s.watched, [season]: allEps.filter(e => e <= ep) },
        stamps: stamp(s, `w:${season}`),
      })),
      // checking an episode marks all earlier ones too; unchecking removes it and all later ones
      toggleWatched: (season, ep) => set(s => {
        const cur = s.watched[season] ?? []
        const next = cur.includes(ep)
          ? cur.filter(e => e < ep)
          : [...new Set([...cur, ...Array.from({ length: ep }, (_, i) => i + 1)])].sort((a, b) => a - b)
        return { watched: { ...s.watched, [season]: next }, stamps: stamp(s, `w:${season}`) }
      }),
      rate: (season, ep, score, text) => set(s => {
        const k = epKey(season, ep)
        const alreadyWatched = (s.watched[season] ?? []).includes(ep)
        return {
          ratings: { ...s.ratings, [k]: { score, text, updatedAt: new Date().toISOString() } },
          watched: alreadyWatched ? s.watched : { ...s.watched, [season]: [...(s.watched[season] ?? []), ep].sort((a, b) => a - b) },
          stamps: alreadyWatched ? stamp(s, `r:${k}`) : stamp(s, `r:${k}`, `w:${season}`),
        }
      }),
      clearRating: (season, ep) => set(s => {
        const ratings = { ...s.ratings }
        delete ratings[epKey(season, ep)]
        return { ratings, stamps: stamp(s, `r:${epKey(season, ep)}`) }
      }),
      rateSeason: (season, score, text) => set(s => ({
        seasonRatings: { ...s.seasonRatings, [season]: { score, text, updatedAt: new Date().toISOString() } },
        stamps: stamp(s, `sr:${season}`),
      })),
      setRanking: seasonRanking => set(s => ({ seasonRanking, stamps: stamp(s, 'rank') })),
      setThreadLink: (season, ep, url) => set(s => {
        const threadLinks = { ...s.threadLinks }
        if (url.trim()) threadLinks[epKey(season, ep)] = url.trim()
        else delete threadLinks[epKey(season, ep)]
        return { threadLinks, stamps: stamp(s, `tl:${epKey(season, ep)}`) }
      }),
      setHideUnwatchedTitles: hideUnwatchedTitles => set(s => ({ hideUnwatchedTitles, stamps: stamp(s, 'opt:hide') })),
      importData: data => {
        const d = data as Partial<UserData>
        if (!d || typeof d !== 'object' || !('ratings' in d)) throw new Error('Ungültige Datei')
        const next: UserData = {
          watched: d.watched ?? {},
          ratings: d.ratings ?? {},
          seasonRatings: d.seasonRatings ?? {},
          seasonRanking: d.seasonRanking ?? [],
          threadLinks: d.threadLinks ?? {},
          hideUnwatchedTitles: d.hideUnwatchedTitles ?? true,
          stamps: {},
        }
        // an import is a deliberate overwrite: it wins against every other device
        set(s => ({ ...next, stamps: stamp(s, ...new Set([...entryKeys(next), ...Object.keys(s.stamps)])) }))
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
