// Builds public/data/*.json from the open survivoR dataset (github.com/doehm/survivoR).
// Usage: node scripts/build-data.mjs [--refresh]   (--refresh re-downloads raw files)
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const RAW = path.join(ROOT, 'raw')
const OUT = path.join(ROOT, 'public', 'data')
const BASE = 'https://raw.githubusercontent.com/doehm/survivoR/master/dev/json/'
const FILES = [
  'season_summary', 'episodes', 'castaways', 'castaway_details', 'tribe_mapping', 'vote_history',
  'boot_mapping', 'advantage_movement', 'advantage_details', 'challenge_results', 'jury_votes',
  'tribe_colours', 'season_palettes',
]
const refresh = process.argv.includes('--refresh')

async function download(name) {
  const file = path.join(RAW, name + '.json')
  if (!refresh) {
    try { await fs.access(file); return } catch { /* download */ }
  }
  for (let i = 0; i < 6; i++) {
    try {
      const res = await fetch(BASE + name + '.json')
      if (!res.ok) throw new Error(res.status)
      await fs.writeFile(file, await res.text())
      console.log('downloaded', name)
      return
    } catch (e) {
      console.warn('retry', name, e.message)
      await new Promise(r => setTimeout(r, 1500 * (i + 1)))
    }
  }
  throw new Error('could not download ' + name)
}

async function load(name) {
  const rows = JSON.parse(await fs.readFile(path.join(RAW, name + '.json'), 'utf8'))
  return rows.filter(r => !r.version || r.version === 'US')
}

const groupBy = (rows, key) => {
  const m = new Map()
  for (const r of rows) {
    const k = typeof key === 'function' ? key(r) : r[key]
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(r)
  }
  return m
}

// ---------- images (Survivor Wiki / Fandom) ----------
const IMG_CACHE = path.join(RAW, 'images.json')
async function wikiQuery(params) {
  const url = 'https://survivor.fandom.com/api.php?' + new URLSearchParams({ format: 'json', action: 'query', ...params })
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'SurvivorDashboard/1.0 (personal use)' } })
      if (res.ok) return await res.json()
    } catch { /* retry */ }
    await new Promise(r => setTimeout(r, 1000 * (i + 1)))
  }
  return null
}

async function resolveImages(castaways) {
  let cache = {}
  try { cache = JSON.parse(await fs.readFile(IMG_CACHE, 'utf8')) } catch { /* empty */ }
  const key = c => `${c.season}|${c.full_name}`
  const todo = castaways.filter(c => !(key(c) in cache))
  console.log('images to resolve:', todo.length)
  const fileTitle = (c, ext) => `File:S${c.season}_${c.full_name.replace(/ /g, '_')}.${ext}`

  for (const ext of ['jpg', 'png']) {
    const pending = todo.filter(c => !cache[key(c)])
    for (let i = 0; i < pending.length; i += 50) {
      const batch = pending.slice(i, i + 50)
      const j = await wikiQuery({ prop: 'imageinfo', iiprop: 'url', iiurlwidth: '360', titles: batch.map(c => fileTitle(c, ext)).join('|') })
      const norm = new Map((j?.query?.normalized ?? []).map(n => [n.to, n.from]))
      for (const p of Object.values(j?.query?.pages ?? {})) {
        const info = p.imageinfo?.[0]
        if (!info) continue
        const from = norm.get(p.title) ?? p.title
        const c = batch.find(b => fileTitle(b, ext) === from || fileTitle(b, ext).replace(/_/g, ' ') === p.title)
        if (c) cache[key(c)] = info.thumburl || info.url
      }
    }
  }
  // Fallback: main image of the person's wiki page
  const pending = todo.filter(c => !cache[key(c)])
  for (let i = 0; i < pending.length; i += 50) {
    const batch = pending.slice(i, i + 50)
    const j = await wikiQuery({ prop: 'pageimages', pithumbsize: '360', redirects: '1', titles: batch.map(c => c.full_name).join('|') })
    const alias = new Map()
    for (const n of [...(j?.query?.normalized ?? []), ...(j?.query?.redirects ?? [])]) alias.set(n.to, alias.get(n.from) ?? n.from)
    for (const p of Object.values(j?.query?.pages ?? {})) {
      if (!p.thumbnail) continue
      const orig = alias.get(p.title) ?? p.title
      for (const c of batch.filter(b => b.full_name === orig || b.full_name === p.title)) cache[key(c)] = p.thumbnail.source
    }
  }
  for (const c of todo) if (!(key(c) in cache)) cache[key(c)] = null
  await fs.writeFile(IMG_CACHE, JSON.stringify(cache, null, 1))
  return c => cache[key(c)] ?? null
}

// ---------- main ----------
await fs.mkdir(RAW, { recursive: true })
for (const f of FILES) await download(f)
const D = {}
for (const f of FILES) D[f] = await load(f)

const details = new Map(D.castaway_details.map(d => [d.castaway_id, d]))
const seasonNames = new Map(D.season_summary.map(s => [s.season, s.season_name]))
// r/survivor discussion links per episode, collected by scripts/fetch-reddit-threads.mjs
let redditThreads = {}
try { redditThreads = JSON.parse(await fs.readFile(path.join(ROOT, 'scripts', 'reddit-threads.json'), 'utf8')) } catch { /* optional */ }
const imageOf = await resolveImages(D.castaways)

const bySeason = name => groupBy(D[name], 'season')
const S = Object.fromEntries(FILES.map(f => [f, bySeason(f)]))

await fs.mkdir(path.join(OUT, 'seasons'), { recursive: true })
const index = []

for (const ss of D.season_summary.sort((a, b) => a.season - b.season)) {
  const n = ss.season
  const get = f => S[f].get(n) ?? []
  const episodes = get('episodes').sort((a, b) => a.episode - b.episode).map(e => ({
    n: e.episode, title: e.episode_title, label: e.episode_label, date: e.episode_date, length: e.episode_length ?? null,
    threads: redditThreads[n]?.[e.episode] ?? [],
  }))
  if (!episodes.length) continue

  const castRows = get('castaways')
  const castaways = castRows.map(c => {
    const d = details.get(c.castaway_id) ?? {}
    return {
      id: c.castaway_id, name: c.castaway, fullName: c.full_name, age: c.age ?? null,
      hometown: [c.city, c.state].filter(Boolean).join(', '), occupation: d.occupation ?? null,
      originalTribe: c.original_tribe ?? null, image: imageOf(c),
      result: c.result ?? null, place: c.place ?? null, exitEpisode: c.episode ?? null,
      jury: !!c.jury, finalist: !!c.finalist, winner: !!c.winner, juryStatus: c.jury_status ?? null,
      birthDate: d.date_of_birth ?? null, deathDate: d.date_of_death ?? null,
      // earlier appearances only – nothing about this or later seasons
      previousSeasons: D.castaways
        .filter(o => o.castaway_id === c.castaway_id && o.season < n)
        .sort((a, b) => a.season - b.season)
        .map(o => ({ season: o.season, name: seasonNames.get(o.season) ?? `Season ${o.season}` })),
    }
  }).sort((a, b) => (a.originalTribe ?? '').localeCompare(b.originalTribe ?? '') || a.name.localeCompare(b.name))

  const tribes = {}
  for (const t of get('tribe_colours')) tribes[t.tribe ?? t.tribe_status] = t.tribe_colour
  const palette = get('season_palettes').map(p => p.palette).filter(Boolean)

  // tribe membership timeline per castaway (dedupe consecutive identical rows)
  const tribeTimeline = {}
  for (const r of get('tribe_mapping').sort((a, b) => a.episode - b.episode || a.day - b.day)) {
    const arr = (tribeTimeline[r.castaway_id] ??= [])
    const last = arr[arr.length - 1]
    if (last && last[2] === r.tribe && last[3] === r.tribe_status) continue
    arr.push([r.episode, r.day, r.tribe, r.tribe_status])
  }

  // tribal councils with votes
  const votes = get('vote_history')
  const tribals = [...groupBy(votes, r => `${r.episode}|${r.order}|${r.vote_order ?? 1}|${r.tribe}`).values()].map(rows => {
    const r0 = rows[0]
    return {
      ep: r0.episode, day: r0.day, order: r0.order, voteOrder: r0.vote_order ?? 1, tribe: r0.tribe, tribeStatus: r0.tribe_status,
      votedOut: [...new Set(rows.map(r => r.voted_out_id).filter(Boolean))],
      tie: rows.some(r => r.tie),
      votes: rows.map(r => ({ voter: r.castaway_id, target: r.vote_id ?? null, targetName: r.vote ?? null, nullified: !!r.nullified, event: r.vote_event ?? null })),
    }
  }).sort((a, b) => a.ep - b.ep || a.order - b.order || a.voteOrder - b.voteOrder)

  // presence snapshots after each boot: {ep, order, g: {id: game_status}}.
  // boot_mapping lists a state under the *following* episode, so the episode of boot #k
  // is taken from vote_history / castaways where available.
  const orderEp = new Map()
  for (const c of castRows) if (c.order && c.episode) orderEp.set(c.order, c.episode)
  for (const t of tribals) orderEp.set(t.order, t.ep)
  const snaps = [...groupBy(get('boot_mapping'), r => `${r.episode}|${r.order}`).values()]
    .map(rows => ({
      ep: rows[0].order === 0 ? rows[0].episode : (orderEp.get(rows[0].order) ?? rows[0].episode),
      order: rows[0].order, g: Object.fromEntries(rows.map(r => [r.castaway_id, r.game_status])),
    }))
    .sort((a, b) => a.order - b.order || a.ep - b.ep)

  // exits / returns derived from consecutive presence snapshots
  const castById = new Map(castaways.map(c => [c.id, c]))
  const events = []
  const OUTSIDE = new Set(['Edge of Extinction', 'Redemption Island'])
  let prev = null
  for (const s of snaps) {
    if (prev) {
      for (const [id, st] of Object.entries(prev.g)) {
        const now = s.g[id]
        const tribal = tribals.find(t => t.order === s.order && t.votedOut.includes(id))
        if (!OUTSIDE.has(st) && (now === undefined || OUTSIDE.has(now))) {
          events.push({ type: now ? 'sent' : 'out', id, ep: s.ep, order: s.order, to: now ?? null, by: tribal ? 'vote' : null })
        } else if (OUTSIDE.has(st) && now === undefined) {
          events.push({ type: 'out', id, ep: s.ep, order: s.order, to: null, by: 'duel', from: st })
        }
      }
      for (const [id, now] of Object.entries(s.g)) {
        const was = prev.g[id]
        if (was && OUTSIDE.has(was) && !OUTSIDE.has(now)) {
          // tribe_mapping knows the exact episode the castaway re-entered a tribe
          const sentEp = [...events].reverse().find(e => e.id === id && e.type === 'sent')?.ep ?? 0
          const back = (tribeTimeline[id] ?? []).find(t => t[0] > sentEp && !OUTSIDE.has(t[3]))
          events.push({ type: 'return', id, ep: back?.[0] ?? s.ep, order: s.order })
        }
      }
    }
    prev = s
  }
  // final exits from castaways table (finale results, quits not reflected in snapshots)
  for (const c of castaways) {
    const last = [...events].reverse().find(e => e.id === c.id)
    const isOut = last && (last.type === 'out')
    if (!isOut && c.exitEpisode && c.result && !c.winner) {
      events.push({ type: 'out', id: c.id, ep: c.exitEpisode, order: 999, to: null, by: 'final' })
    }
  }
  for (const e of events) {
    const c = castById.get(e.id)
    if (e.type === 'out' && c && c.exitEpisode === e.ep) { e.result = c.result; e.place = c.place }
  }
  events.sort((a, b) => a.ep - b.ep || a.order - b.order)

  // advantages
  const advDetails = new Map(get('advantage_details').map(a => [a.advantage_id, a]))
  const advantages = [...groupBy(get('advantage_movement'), 'advantage_id').entries()].map(([id, rows]) => {
    const d = advDetails.get(id) ?? {}
    return {
      id, type: d.advantage_type ?? 'Advantage', clue: d.clue_details ?? null, location: d.location_found ?? null, conditions: d.conditions ?? null,
      events: rows.sort((a, b) => a.sequence_id - b.sequence_id).map(r => ({
        ep: r.episode, day: r.day, who: r.castaway_id, event: r.event, playedFor: r.played_for_id ?? null,
        success: r.success ?? null, nullified: r.votes_nullified ?? null,
      })),
    }
  })

  // challenges
  const challenges = [...groupBy(get('challenge_results'), r => `${r.episode}|${r.challenge_id}`).values()].map(rows => {
    const r0 = rows[0]
    const winners = rows.filter(r => r.won === 1 || /^Won/.test(r.result ?? ''))
    const tribal = /Tribal/.test(r0.outcome_type ?? '') || /Team/.test(r0.outcome_type ?? '')
    return {
      ep: r0.episode, id: r0.challenge_id, type: r0.challenge_type, outcome: r0.outcome_type,
      winnerTribes: tribal ? [...new Set(winners.map(r => r.team ?? r.tribe).filter(Boolean))] : [],
      winners: [...new Set(winners.map(r => r.castaway_id))],
      notes: [...new Set(winners.map(r => r.result_notes).filter(Boolean))],
    }
  }).sort((a, b) => a.ep - b.ep || a.id - b.id)

  const juryVotes = get('jury_votes').map(j => ({ juror: j.castaway_id, finalist: j.finalist_id, vote: j.vote }))

  const season = {
    season: n, name: ss.season_name, location: ss.location, country: ss.country, premiered: ss.premiered,
    tribeSetup: ss.tribe_setup, description: ss.description ?? null, nCast: ss.n_cast, palette, tribes,
    episodes, castaways, tribeTimeline, snaps, tribals, events, advantages, challenges, juryVotes,
  }
  await fs.writeFile(path.join(OUT, 'seasons', `${n}.json`), JSON.stringify(season))
  index.push({
    season: n, name: ss.season_name, location: ss.location, country: ss.country, premiered: ss.premiered,
    nCast: ss.n_cast, episodes: episodes.map(e => ({ n: e.n, title: e.title, label: e.label, date: e.date })),
    palette, cover: castaways.filter(c => c.image).slice(0, 4).map(c => c.image),
  })
}

await fs.writeFile(path.join(OUT, 'index.json'), JSON.stringify(index))
console.log('wrote', index.length, 'seasons')
