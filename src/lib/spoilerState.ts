import type { Advantage, AdvantageEvent, Castaway, Challenge, GameEvent, SeasonData, Tribal } from '../types'

export type Status = 'in' | 'outside' | 'out' | 'winner'

export interface CastawayState {
  c: Castaway
  tribe: string
  tribeStatus: string
  status: Status
  /** e.g. "Edge of Extinction" while status === 'outside' */
  location?: string
  exit?: GameEvent
  exitLabel?: string
  isJuror: boolean
  heldAdvantages: Advantage[]
}

export interface AdvantageState {
  adv: Advantage
  events: AdvantageEvent[]
  holder: string | null
  active: boolean
}

export interface SeasonState {
  ep: number
  cast: CastawayState[]
  byId: Map<string, CastawayState>
  tribes: { name: string; color: string; status: string; members: CastawayState[] }[]
  outside: { name: string; members: CastawayState[] }[]
  eliminated: CastawayState[]
  exitsThisEpisode: GameEvent[]
  returnsThisEpisode: GameEvent[]
  tribals: Tribal[]
  advantages: AdvantageState[]
  challenges: Challenge[]
  merged: boolean
  mergeEp: number | null
  jury: CastawayState[]
  finished: boolean
  winner: CastawayState | null
}

const HOLD_EVENTS = new Set(['Found', 'Received', 'Activated', 'Found (beware)', 'Banked', 'Became steal a vote', 'Became hidden immunity idol'])

/** Events that make the advantage leave the game. */
const GONE_EVENTS = new Set([
  'Played', 'Expired', 'Voted out with advantage', 'Discarded', 'Quit with advantage',
  'Medically evacuated with advantage', 'Destroyed', 'Absorbed', 'Left game with advantage',
])

export const TRIBE_STATUS_DE: Record<string, string> = {
  Original: 'Start-Tribe',
  Swapped: 'Tribe-Swap',
  Swapped_2: '2. Swap',
  Merged: 'Merge',
  Mergatory: 'Mergatory',
  'Exile Island': 'Exile Island',
  'Edge of Extinction': 'Edge of Extinction',
  'Redemption Island': 'Redemption Island',
}

export function exitLabel(e: GameEvent): string {
  if (e.type === 'sent') return `Rausgewählt → ${e.to}`
  if (e.result) return e.result
  if (e.by === 'duel') return `Raus von ${e.from ?? 'Duell'}`
  if (e.by === 'vote') return 'Rausgewählt'
  return 'Ausgeschieden'
}

export function computeStateAt(s: SeasonData, ep: number): SeasonState {
  const lastEp = Math.max(...s.episodes.filter(e => !/reunion/i.test(e.label)).map(e => e.n))
  const events = s.events.filter(e => e.ep <= ep)

  // advantages
  const advantages: AdvantageState[] = s.advantages
    .map(adv => {
      const evs = adv.events.filter(e => e.ep <= ep)
      if (!evs.length) return null
      const last = evs[evs.length - 1]
      const active = !GONE_EVENTS.has(last.event)
      const holder = active ? ([...evs].reverse().find(e => HOLD_EVENTS.has(e.event))?.who ?? last.who) : null
      return { adv, events: evs, holder, active }
    })
    .filter((x): x is AdvantageState => !!x)

  const statusById = new Map<string, { status: Status; location?: string; exit?: GameEvent }>()
  for (const e of events) {
    if (e.type === 'sent') statusById.set(e.id, { status: 'outside', location: e.to ?? undefined, exit: e })
    else if (e.type === 'out') statusById.set(e.id, { status: 'out', exit: e })
    else if (e.type === 'return') statusById.set(e.id, { status: 'in' })
  }

  const merges = Object.values(s.tribeTimeline).flat().filter(t => t[3] === 'Merged').map(t => t[0])
  const mergeEp = merges.length ? Math.min(...merges) : null
  const merged = mergeEp !== null && mergeEp <= ep
  const finished = ep >= lastEp

  const cast: CastawayState[] = s.castaways.map(c => {
    const all = s.tribeTimeline[c.id] ?? []
    // before episode 1 only the very first (starting) tribe is known
    const tl = ep === 0 ? all.slice(0, 1) : all.filter(t => t[0] <= ep)
    const cur = tl[tl.length - 1]
    const st = statusById.get(c.id) ?? { status: 'in' as Status }
    const status: Status = finished && c.winner ? 'winner' : st.status
    return {
      c,
      tribe: cur?.[2] ?? c.originalTribe ?? '–',
      tribeStatus: cur?.[3] ?? 'Original',
      status,
      location: st.location,
      exit: st.exit,
      exitLabel: st.exit ? exitLabel(st.exit) : undefined,
      isJuror: c.jury && status === 'out',
      heldAdvantages: advantages.filter(a => a.active && a.holder === c.id).map(a => a.adv),
    }
  })
  const byId = new Map(cast.map(x => [x.c.id, x]))

  const inGame = cast.filter(x => x.status === 'in' || x.status === 'winner')
  const tribeNames = [...new Set(inGame.map(x => x.tribe))]
  const tribes = tribeNames
    .map(name => ({
      name,
      color: s.tribes[name] ?? s.tribes[inGame.find(x => x.tribe === name)?.tribeStatus ?? ''] ?? '#78716c',
      status: inGame.find(x => x.tribe === name)?.tribeStatus ?? '',
      members: inGame.filter(x => x.tribe === name).sort((a, b) => a.c.name.localeCompare(b.c.name)),
    }))
    .sort((a, b) => b.members.length - a.members.length || a.name.localeCompare(b.name))

  const outsideNames = [...new Set(cast.filter(x => x.status === 'outside').map(x => x.location ?? 'Außerhalb'))]
  const outside = outsideNames.map(name => ({ name, members: cast.filter(x => x.status === 'outside' && (x.location ?? 'Außerhalb') === name) }))

  const eliminated = cast
    .filter(x => x.status === 'out' || x.status === 'outside')
    .sort((a, b) => (b.exit!.ep - a.exit!.ep) || (b.exit!.order - a.exit!.order))

  return {
    ep,
    cast,
    byId,
    tribes,
    outside,
    eliminated,
    exitsThisEpisode: events.filter(e => e.ep === ep && e.type !== 'return'),
    returnsThisEpisode: events.filter(e => e.ep === ep && e.type === 'return'),
    tribals: s.tribals.filter(t => t.ep <= ep),
    advantages,
    challenges: s.challenges.filter(c => c.ep <= ep),
    merged,
    mergeEp: merged ? mergeEp : null,
    jury: cast.filter(x => x.isJuror).sort((a, b) => (a.exit!.ep - b.exit!.ep) || (a.exit!.order - b.exit!.order)),
    finished,
    winner: finished ? cast.find(x => x.c.winner) ?? null : null,
  }
}
