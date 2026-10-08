import { motion } from 'framer-motion'
import { Gem, Shield, Skull, Swords, Trophy, Undo2, Users } from 'lucide-react'
import type { SeasonData, Tribal } from '../types'
import type { CastawayState, SeasonState } from '../lib/spoilerState'
import { TRIBE_STATUS_DE } from '../lib/spoilerState'
import { contrastText } from '../lib/data'
import { Avatar, Mystery } from './Avatar'
import { useCast } from './CastContext'

const ADV_DE: Record<string, string> = {
  Found: 'gefunden', Received: 'erhalten', Played: 'gespielt', Expired: 'abgelaufen', Activated: 'aktiviert',
  'Voted out with advantage': 'mit Vorteil rausgewählt', Discarded: 'weggeworfen', 'Quit with advantage': 'mit Vorteil aufgegeben',
  'Medically evacuated with advantage': 'mit Vorteil evakuiert', Destroyed: 'zerstört', Absorbed: 'absorbiert',
  'Found (beware)': 'gefunden (Beware)', 'Became steal a vote': 'wurde zu Steal a Vote', 'Became hidden immunity idol': 'wurde zum Idol',
  Banked: 'gebankt', 'Left game with advantage': 'hat Spiel mit Vorteil verlassen',
}

export function SectionTitle({ icon, children, right }: { icon: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="text-ember">{icon}</span>
      <h3 className="font-display text-2xl tracking-wide">{children}</h3>
      <div className="ml-auto">{right}</div>
    </div>
  )
}

function tribeColor(season: SeasonData, tribe: string) {
  return season.tribes[tribe] ?? '#78716c'
}

export function CastChip({ x, season, showAdv = true }: { x: CastawayState; season: SeasonData; showAdv?: boolean }) {
  const color = tribeColor(season, x.tribe)
  return (
    <motion.div layout className="group flex flex-col items-center gap-1.5 text-center" title={x.c.fullName}>
      <div className="relative">
        <Avatar c={x.c} size={64} color={color} dim={x.status === 'out' || x.status === 'outside'} />
        {showAdv && x.heldAdvantages.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-flame px-1 text-[11px] font-bold text-stone-950 shadow-lg shadow-flame/40" title={x.heldAdvantages.map(a => a.type).join(', ')}>
            <Gem size={12} />{x.heldAdvantages.length > 1 ? x.heldAdvantages.length : ''}
          </span>
        )}
        {x.status === 'winner' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-flame px-1.5 text-[10px] font-bold text-stone-950">SIEGER</span>}
      </div>
      <span className="max-w-20 truncate text-xs font-medium text-stone-200">{x.c.name}</span>
    </motion.div>
  )
}

export function TribeBoard({ state, season }: { state: SeasonState; season: SeasonData }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {state.tribes.map(t => (
          <motion.div layout key={t.name} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]" style={{ boxShadow: `inset 0 3px 0 ${t.color}` }}>
            <div className="flex items-center gap-2 px-4 py-3">
              <span className="rounded-lg px-2.5 py-1 font-display text-xl tracking-wider" style={{ background: t.color, color: contrastText(t.color) }}>{t.name}</span>
              <span className="text-xs text-stone-400">{TRIBE_STATUS_DE[t.status] ?? t.status}</span>
              <span className="ml-auto flex items-center gap-1 text-sm text-stone-400"><Users size={14} /> {t.members.length}</span>
            </div>
            <div className="grid grid-cols-4 gap-3 px-4 pb-4 sm:grid-cols-5">
              {t.members.map(m => <CastChip key={m.c.id} x={m} season={season} />)}
            </div>
          </motion.div>
        ))}
      </div>
      {state.outside.map(o => (
        <div key={o.name} className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-300"><Skull size={15} /> {o.name} <span className="text-stone-500">({o.members.length})</span></div>
          <div className="grid grid-cols-5 gap-3 sm:grid-cols-8">
            {o.members.map(m => <CastChip key={m.c.id} x={m} season={season} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

export function EliminatedList({ state, season }: { state: SeasonState; season: SeasonData }) {
  if (!state.eliminated.length) return <p className="text-sm text-stone-500">Noch niemand ausgeschieden.</p>
  return (
    <ul className="space-y-2">
      {state.eliminated.map(x => (
        <li key={x.c.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-2">
          <Avatar c={x.c} size={40} color={tribeColor(season, x.tribe)} dim />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{x.c.name} {x.isJuror && <span className="chip ml-1 bg-violet-500/20 text-violet-300">Jury</span>}</div>
            <div className="truncate text-xs text-stone-400">{x.status === 'outside' ? `auf ${x.location}` : x.exitLabel} · Folge {x.exit!.ep}</div>
          </div>
          {x.exit?.place && <span className="font-display text-2xl text-stone-500">#{x.exit.place}</span>}
        </li>
      ))}
    </ul>
  )
}

export function TribalCard({ t, state, season }: { t: Tribal; state: SeasonState; season: SeasonData }) {
  const name = (id: string | null) => (id ? state.byId.get(id)?.c.name : null)
  const tally = new Map<string, { name: string; count: number; nullified: number }>()
  for (const v of t.votes) {
    if (!v.target && !v.targetName) continue
    const k = v.target ?? v.targetName!
    const cur = tally.get(k) ?? { name: name(v.target) ?? v.targetName ?? '?', count: 0, nullified: 0 }
    if (v.nullified) cur.nullified++
    else cur.count++
    tally.set(k, cur)
  }
  const sorted = [...tally.entries()].sort((a, b) => b[1].count - a[1].count)
  const max = Math.max(1, ...sorted.map(([, v]) => v.count + v.nullified))
  const color = tribeColor(season, t.tribe)
  const specials = [...new Set(t.votes.map(v => v.event).filter(Boolean))]
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="chip" style={{ background: color, color: contrastText(color) }}>{t.tribe}</span>
        <span className="text-xs text-stone-400">Folge {t.ep} · Tag {t.day}{t.voteOrder > 1 ? ` · Revote ${t.voteOrder - 1}` : ''}{t.tie ? ' · Gleichstand' : ''}</span>
        <span className="ml-auto text-sm">raus: <b className="text-red-400">{t.votedOut.map(name).join(', ') || '–'}</b></span>
      </div>
      <div className="space-y-1.5">
        {sorted.map(([k, v]) => {
          const voters = t.votes.filter(x => (x.target ?? x.targetName) === k)
          return (
            <div key={k} className="grid grid-cols-[6rem_1fr] items-center gap-3 text-sm">
              <span className={`truncate font-semibold ${t.votedOut.includes(k) ? 'text-red-400' : ''}`}>{v.name}</span>
              <div className="flex items-center gap-2">
                <div className="h-6 overflow-hidden rounded-md bg-white/5" style={{ width: `${((v.count + v.nullified) / max) * 100}%`, minWidth: '1.5rem' }}>
                  <div className="flex h-full items-center bg-gradient-to-r from-red-600/80 to-ember/80 px-2 text-xs font-bold" style={{ width: `${(v.count / Math.max(1, v.count + v.nullified)) * 100}%` }}>{v.count}</div>
                </div>
                <span className="truncate text-xs text-stone-500">{voters.map(x => name(x.voter) + (x.nullified ? ' ✕' : '')).join(', ')}</span>
              </div>
            </div>
          )
        })}
      </div>
      {specials.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{specials.map(s => <span key={s} className="chip bg-flame/15 text-flame">{s}</span>)}</div>}
    </div>
  )
}

export function TribalHistory({ state, season, onlyEp }: { state: SeasonState; season: SeasonData; onlyEp?: number }) {
  const list = state.tribals.filter(t => onlyEp === undefined || t.ep === onlyEp)
  if (!list.length) return <p className="text-sm text-stone-500">{onlyEp !== undefined ? 'Kein Tribal Council in dieser Folge.' : 'Noch keine Tribal Councils.'}</p>
  return (
    <div className="space-y-3">
      {[...list].reverse().map(t => <TribalCard key={`${t.ep}-${t.order}-${t.voteOrder}-${t.tribe}`} t={t} state={state} season={season} />)}
    </div>
  )
}

export function AdvantagesPanel({ state }: { state: SeasonState }) {
  const name = (id: string | null) => (id ? state.byId.get(id)?.c.name ?? '?' : '')
  if (!state.advantages.length) return <p className="text-sm text-stone-500">Bisher keine Idols oder Vorteile im Spiel.</p>
  const active = state.advantages.filter(a => a.active)
  const gone = state.advantages.filter(a => !a.active)
  const Card = ({ a }: { a: (typeof active)[number] }) => (
    <div className={`rounded-2xl border p-4 ${a.active ? 'border-flame/40 bg-flame/[0.06]' : 'border-white/10 bg-white/[0.03] opacity-80'}`}>
      <div className="flex items-start gap-3">
        {a.holder && state.byId.get(a.holder) ? <Avatar c={state.byId.get(a.holder)!.c} size={44} color="#fbbf24" /> : <Gem className="mt-1 text-stone-500" />}
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{a.adv.type}</div>
          <div className="text-xs text-stone-400">{a.active ? <>Im Besitz von <b className="text-flame">{name(a.holder)}</b></> : 'Nicht mehr im Spiel'}</div>
          {a.adv.conditions && <div className="mt-1 text-xs text-stone-500">{a.adv.conditions}</div>}
        </div>
      </div>
      <ol className="mt-3 space-y-1 border-l border-white/10 pl-3 text-xs text-stone-300">
        {a.events.map((e, i) => (
          <li key={i}>
            <span className="text-stone-500">F{e.ep} · Tag {e.day}:</span> {name(e.who)} – {ADV_DE[e.event] ?? e.event}
            {e.event === 'Played' && e.playedFor && <> für {name(e.playedFor)}</>}
            {e.event === 'Played' && e.success && <span className={e.success === 'Yes' ? 'text-jungle' : 'text-red-400'}> ({e.success === 'Yes' ? 'erfolgreich' : 'umsonst'}{e.nullified ? `, ${e.nullified} Stimmen annulliert` : ''})</span>}
          </li>
        ))}
      </ol>
    </div>
  )
  return (
    <div className="space-y-5">
      {active.length > 0 && <div><div className="mb-2 text-sm font-semibold text-flame">Aktiv im Spiel ({active.length})</div><div className="grid gap-3 md:grid-cols-2">{active.map(a => <Card key={a.adv.id} a={a} />)}</div></div>}
      {gone.length > 0 && <div><div className="mb-2 text-sm font-semibold text-stone-400">Verbraucht / weg ({gone.length})</div><div className="grid gap-3 md:grid-cols-2">{gone.map(a => <Card key={a.adv.id} a={a} />)}</div></div>}
    </div>
  )
}

export function ChallengesPanel({ state, season, onlyEp }: { state: SeasonState; season: SeasonData; onlyEp?: number }) {
  const list = state.challenges.filter(c => onlyEp === undefined || c.ep === onlyEp)
  if (!list.length) return <p className="text-sm text-stone-500">Keine Challenges erfasst.</p>
  const byEp = new Map<number, typeof list>()
  for (const c of list) byEp.set(c.ep, [...(byEp.get(c.ep) ?? []), c])
  return (
    <div className="space-y-4">
      {[...byEp.entries()].reverse().map(([ep, cs]) => (
        <div key={ep}>
          {onlyEp === undefined && <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">Folge {ep}</div>}
          <div className="space-y-2">
            {cs.map(c => {
              const isImmunity = /Immunity/.test(c.type)
              return (
                <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white/[0.03] p-3">
                  <span className={`chip ${isImmunity ? 'bg-sky-500/15 text-sky-300' : c.type === 'Duel' ? 'bg-red-500/15 text-red-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                    {isImmunity ? <Shield size={12} /> : c.type === 'Duel' ? <Swords size={12} /> : <Trophy size={12} />} {c.type.replace('Immunity and Reward', 'Immunity + Reward')}
                  </span>
                  {c.winnerTribes.length > 0 ? (
                    c.winnerTribes.map(t => <span key={t} className="chip" style={{ background: tribeColor(season, t), color: contrastText(tribeColor(season, t)) }}>{t}</span>)
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {c.winners.map(id => state.byId.get(id)).filter(Boolean).map(x => (
                        <span key={x!.c.id} className="flex items-center gap-1.5 text-sm font-semibold">
                          <Avatar c={x!.c} size={26} color={tribeColor(season, x!.tribe)} /> {x!.c.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <span className="ml-auto text-xs text-stone-500">{c.outcome}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function JuryPanel({ state, season }: { state: SeasonState; season: SeasonData }) {
  if (!state.merged && !state.jury.length) return <p className="text-sm text-stone-500">Noch kein Merge – noch keine Jury.</p>
  const finalVotes = state.finished ? season.juryVotes.filter(v => v.vote === 1) : []
  return (
    <div className="space-y-3">
      {state.mergeEp && <div className="chip bg-ember/15 text-ember">Merge in Folge {state.mergeEp}</div>}
      {state.jury.length ? (
        <div className="flex flex-wrap gap-3">
          {state.jury.map(x => (
            <div key={x.c.id} className="flex flex-col items-center gap-1 text-center">
              <Avatar c={x.c} size={48} color="#8b5cf6" />
              <span className="max-w-16 truncate text-xs">{x.c.name}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-stone-500">Noch keine Jurymitglieder.</p>}
      {finalVotes.length > 0 && (
        <div className="rounded-xl bg-flame/10 p-3 text-sm">
          <div className="mb-1 font-semibold text-flame">Finale Jury-Abstimmung</div>
          {[...new Set(season.juryVotes.map(v => v.finalist))].map(f => {
            const n = finalVotes.filter(v => v.finalist === f).length
            return <div key={f} className="flex justify-between"><span>{state.byId.get(f)?.c.name}</span><b>{n}</b></div>
          })}
        </div>
      )}
    </div>
  )
}

export function EpisodeRecap({ state }: { state: SeasonState }) {
  const name = (id: string) => state.byId.get(id)
  const items: { icon: React.ReactNode; text: React.ReactNode; tone: string }[] = []
  for (const e of state.exitsThisEpisode) {
    const x = name(e.id)
    if (x) items.push({ icon: <Skull size={16} />, text: <><b>{x.c.name}</b> – {x.exitLabel ?? 'ausgeschieden'}</>, tone: 'text-red-300 bg-red-500/10' })
  }
  for (const e of state.returnsThisEpisode) {
    const x = name(e.id)
    if (x) items.push({ icon: <Undo2 size={16} />, text: <><b>{x.c.name}</b> ist zurück im Spiel!</>, tone: 'text-emerald-300 bg-emerald-500/10' })
  }
  if (state.mergeEp === state.ep) items.push({ icon: <Users size={16} />, text: <>Die Tribes haben gemerged!</>, tone: 'text-ember bg-ember/10' })
  for (const a of state.advantages) {
    for (const e of a.events.filter(e => e.ep === state.ep && ['Found', 'Played', 'Received', 'Found (beware)'].includes(e.event))) {
      items.push({ icon: <Gem size={16} />, text: <><b>{name(e.who)?.c.name}</b> – {a.adv.type} {ADV_DE[e.event] ?? e.event}</>, tone: 'text-flame bg-flame/10' })
    }
  }
  const imm = state.challenges.filter(c => c.ep === state.ep && /Immunity/.test(c.type))
  for (const c of imm) {
    const who = c.winnerTribes.length ? c.winnerTribes.join(', ') : c.winners.map(id => name(id)?.c.name).join(', ')
    if (who) items.push({ icon: <Shield size={16} />, text: <>Immunity: <b>{who}</b></>, tone: 'text-sky-300 bg-sky-500/10' })
  }
  if (state.winner) items.push({ icon: <Trophy size={16} />, text: <><b>{state.winner.c.fullName}</b> ist Sole Survivor!</>, tone: 'text-flame bg-flame/15' })
  if (!items.length) return <p className="text-sm text-stone-500">Keine besonderen Ereignisse erfasst.</p>
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${it.tone}`}>{it.icon}<span className="text-stone-100">{it.text}</span></li>
      ))}
    </ul>
  )
}

export function CastGallery({ state, season, horizon }: { state: SeasonState; season: SeasonData; horizon: number }) {
  const { reveal, open } = useCast()
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {state.cast.map(x => {
        const color = tribeColor(season, x.c.originalTribe ?? x.tribe)
        const known = x.status !== 'in'
        return (
          <button type="button" onClick={() => open(x.c)} key={x.c.id} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition hover:border-white/30">
            <div className="relative aspect-[4/5] overflow-hidden" style={{ background: color }}>
              {!reveal ? <Mystery /> : x.c.image ? (
                <img src={x.c.image} alt={x.c.fullName} loading="lazy" referrerPolicy="no-referrer"
                  className={`h-full w-full object-cover object-top transition duration-500 group-hover:scale-105 ${x.status === 'out' ? 'grayscale' : ''}`} />
              ) : (
                <div className="flex h-full items-center justify-center font-display text-6xl" style={{ color: contrastText(color) }}>{x.c.name.slice(0, 2)}</div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-10">
                <div className="font-display text-2xl leading-none tracking-wide">{x.c.name}</div>
                <div className="truncate text-xs text-stone-300">{x.c.fullName}</div>
              </div>
              <span className="chip absolute left-2 top-2" style={{ background: color, color: contrastText(color) }}>{x.c.originalTribe}</span>
              {known && horizon > 0 && (
                <span className={`chip absolute right-2 top-2 ${x.status === 'winner' ? 'bg-flame text-stone-950' : x.status === 'outside' ? 'bg-stone-800 text-stone-200' : 'bg-red-600 text-white'}`}>
                  {x.status === 'winner' ? '🏆 Sieger' : x.status === 'outside' ? x.location : x.exit?.place ? `#${x.exit.place}` : 'raus'}
                </span>
              )}
            </div>
            <div className="space-y-0.5 p-3 text-xs text-stone-400">
              <div>{[x.c.age && `${x.c.age} J.`, x.c.occupation].filter(Boolean).join(' · ')}</div>
              <div className="truncate">{x.c.hometown}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}


