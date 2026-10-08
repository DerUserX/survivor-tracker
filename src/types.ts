export interface EpisodeInfo {
  n: number
  title: string
  label: string
  date: string
  length?: number | null
}

export interface SeasonIndexEntry {
  season: number
  name: string
  location: string
  country: string
  premiered: string
  nCast: number
  episodes: EpisodeInfo[]
  palette: string[]
  cover: string[]
}

export interface Castaway {
  id: string
  name: string
  fullName: string
  age: number | null
  hometown: string
  occupation: string | null
  originalTribe: string | null
  image: string | null
  result: string | null
  place: number | null
  exitEpisode: number | null
  jury: boolean
  finalist: boolean
  winner: boolean
  juryStatus: string | null
  birthDate: string | null
  deathDate: string | null
  previousSeasons: { season: number; name: string }[]
}

/** [episode, day, tribe, tribe_status] */
export type TribeEntry = [number, number, string, string]

export interface Vote {
  voter: string
  target: string | null
  targetName: string | null
  nullified: boolean
  event: string | null
}

export interface Tribal {
  ep: number
  day: number
  order: number
  voteOrder: number
  tribe: string
  tribeStatus: string
  votedOut: string[]
  tie: boolean
  votes: Vote[]
}

export interface GameEvent {
  type: 'out' | 'sent' | 'return'
  id: string
  ep: number
  order: number
  to?: string | null
  from?: string
  by?: 'vote' | 'duel' | 'final' | null
  result?: string | null
  place?: number | null
}

export interface AdvantageEvent {
  ep: number
  day: number
  who: string
  event: string
  playedFor: string | null
  success: string | null
  nullified: number | null
}

export interface Advantage {
  id: number
  type: string
  clue: string | null
  location: string | null
  conditions: string | null
  events: AdvantageEvent[]
}

export interface Challenge {
  ep: number
  id: number
  type: string
  outcome: string
  winnerTribes: string[]
  winners: string[]
  notes: string[]
}

export interface JuryVote {
  juror: string
  finalist: string
  vote: number
}

export interface SeasonData {
  season: number
  name: string
  location: string
  country: string
  premiered: string
  tribeSetup: string
  description: string | null
  nCast: number
  palette: string[]
  tribes: Record<string, string>
  episodes: EpisodeInfo[]
  castaways: Castaway[]
  tribeTimeline: Record<string, TribeEntry[]>
  tribals: Tribal[]
  events: GameEvent[]
  advantages: Advantage[]
  challenges: Challenge[]
  juryVotes: JuryVote[]
}
