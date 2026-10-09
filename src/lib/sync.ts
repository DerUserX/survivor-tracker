import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { entryKeys, pickData, useUserStore, type UserData } from '../store/useUserStore'

// Device sync through a secret GitHub Gist owned by the user. The token (scope "gist") stays in
// this browser's localStorage only and is never part of the synced data or the export.

const FILE = 'survivor-tracker-sync.json'
const API = 'https://api.github.com'

type Status = 'off' | 'idle' | 'syncing' | 'error'

interface SyncState {
  token: string | null
  gistId: string | null
  login: string | null
  status: Status
  error: string | null
  lastSync: number | null
}

export const useSyncStore = create<SyncState>()(
  persist(
    (): SyncState => ({ token: null, gistId: null, login: null, status: 'off', error: null, lastSync: null }),
    { name: 'survivor-sync', partialize: s => ({ token: s.token, gistId: s.gistId, login: s.login, lastSync: s.lastSync }) },
  ),
)

async function gh<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { token } = useSyncStore.getState()
  const res = await fetch(API + path, {
    ...init,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
  })
  if (res.status === 401) throw new Error('Token ungültig oder abgelaufen')
  if (!res.ok) throw new Error(`GitHub ${res.status}`)
  return res.json() as Promise<T>
}

interface Gist { id: string; files: Record<string, { content?: string; truncated?: boolean; raw_url: string }> }

// ---------- merge ----------

/** "r:40-3" -> ["r", "40-3"], "rank" -> ["rank", ""] */
function splitKey(key: string): [string, string] {
  const i = key.indexOf(':')
  return i < 0 ? [key, ''] : [key.slice(0, i), key.slice(i + 1)]
}

function getEntry(d: UserData, key: string): unknown {
  const [kind, id] = splitKey(key)
  switch (kind) {
    case 'w': return d.watched[Number(id)]
    case 'r': return d.ratings[id]
    case 'sr': return d.seasonRatings[Number(id)]
    case 'tl': return d.threadLinks[id]
    case 'rank': return d.seasonRanking.length ? d.seasonRanking : undefined
    case 'opt': return d.hideUnwatchedTitles
  }
}

function setEntry(d: UserData, key: string, value: unknown) {
  const [kind, id] = splitKey(key)
  const put = <V,>(obj: Record<string | number, V>, k: string | number) => {
    if (value === undefined) delete obj[k]
    else obj[k] = value as V
  }
  switch (kind) {
    case 'w': put(d.watched, Number(id)); break
    case 'r': put(d.ratings, id); break
    case 'sr': put(d.seasonRatings, Number(id)); break
    case 'tl': put(d.threadLinks, id); break
    case 'rank': d.seasonRanking = (value as number[] | undefined) ?? []; break
    case 'opt': d.hideUnwatchedTitles = (value as boolean | undefined) ?? true; break
  }
}

const empty = (): UserData => ({ watched: {}, ratings: {}, seasonRatings: {}, seasonRanking: [], threadLinks: {}, hideUnwatchedTitles: true, stamps: {} })

/** Entry-wise last-write-wins merge of two devices' data. */
export function merge(local: UserData, remote: UserData): UserData {
  const out = empty()
  const keys = new Set([...Object.keys(local.stamps), ...Object.keys(remote.stamps), ...entryKeys(local), ...entryKeys(remote)])
  for (const key of keys) {
    const lt = local.stamps[key] ?? 0
    const rt = remote.stamps[key] ?? 0
    const src = rt > lt ? remote : local
    setEntry(out, key, structuredClone(getEntry(src, key)))
    if (lt || rt) out.stamps[key] = Math.max(lt, rt)
  }
  return out
}

/** Key-order independent JSON for change detection. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(',')}}`
  return JSON.stringify(v)
}

// ---------- sync ----------

let applyingRemote = false
let running: Promise<void> | null = null
let again = false

async function readRemote(gistId: string): Promise<UserData> {
  const gist = await gh<Gist>(`/gists/${gistId}`)
  const f = gist.files[FILE]
  if (!f) return empty()
  const text = f.truncated ? await (await fetch(f.raw_url)).text() : f.content ?? ''
  try { return { ...empty(), ...JSON.parse(text) } } catch { return empty() }
}

async function syncOnce() {
  const { token, gistId } = useSyncStore.getState()
  if (!token || !gistId) return
  useSyncStore.setState({ status: 'syncing', error: null })
  try {
    const remote = await readRemote(gistId)
    const local = pickData(useUserStore.getState())
    const merged = merge(local, remote)
    if (stable(merged) !== stable(local)) {
      applyingRemote = true
      useUserStore.setState(merged)
      applyingRemote = false
    }
    if (stable(merged) !== stable(remote)) {
      await gh(`/gists/${gistId}`, { method: 'PATCH', body: JSON.stringify({ files: { [FILE]: { content: JSON.stringify(merged) } } }) })
    }
    useSyncStore.setState({ status: 'idle', lastSync: Date.now() })
  } catch (e) {
    useSyncStore.setState({ status: 'error', error: (e as Error).message })
  }
}

/** Runs a sync; calls during a running sync are coalesced into one follow-up run. */
export function syncNow(): Promise<void> {
  if (running) { again = true; return running }
  running = (async () => {
    do { again = false; await syncOnce() } while (again)
  })().finally(() => { running = null })
  return running
}

/** Connects this device: finds the existing sync gist or creates a new secret one. */
export async function connect(token: string) {
  useSyncStore.setState({ token: token.trim(), status: 'syncing', error: null })
  try {
    const user = await gh<{ login: string }>('/user')
    let gistId: string | null = null
    for (let page = 1; page <= 10 && !gistId; page++) {
      const gists = await gh<Gist[]>(`/gists?per_page=100&page=${page}`)
      gistId = gists.find(g => FILE in g.files)?.id ?? null
      if (gists.length < 100) break
    }
    if (!gistId) {
      const created = await gh<Gist>('/gists', {
        method: 'POST',
        body: JSON.stringify({ description: 'Survivor Tracker – Sync-Daten', public: false, files: { [FILE]: { content: JSON.stringify(empty()) } } }),
      })
      gistId = created.id
    }
    useSyncStore.setState({ gistId, login: user.login })
    await syncNow()
  } catch (e) {
    useSyncStore.setState({ token: null, gistId: null, login: null, status: 'off', error: (e as Error).message })
    throw e
  }
}

export function disconnect() {
  useSyncStore.setState({ token: null, gistId: null, login: null, status: 'off', error: null, lastSync: null })
}

/** Wire up automatic syncing: on start, on focus, periodically and shortly after every change. */
export function startSync() {
  let timer: ReturnType<typeof setTimeout> | undefined
  useUserStore.subscribe(() => {
    if (applyingRemote || !useSyncStore.getState().gistId) return
    clearTimeout(timer)
    timer = setTimeout(syncNow, 1500)
  })
  const onVisible = () => document.visibilityState === 'visible' && syncNow()
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('focus', () => syncNow())
  setInterval(() => document.visibilityState === 'visible' && syncNow(), 60_000)
  if (useSyncStore.getState().gistId) useSyncStore.setState({ status: 'idle' })
  syncNow()
}
