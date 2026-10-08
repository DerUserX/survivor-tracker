import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, Calendar, Check, ChevronRight, Clock, ExternalLink, Eye, Gavel, Gem, Link2, Lock, MapPin,
  MessageSquare, Shield, Skull, Sparkles, Star, Users,
} from 'lucide-react'
import { formatDate, googleThreadUrl, isReunion, redditSearchUrl, shortName, useSeason } from '../lib/data'
import { computeStateAt } from '../lib/spoilerState'
import { epKey, horizonOf, useUserStore } from '../store/useUserStore'
import { RatingInput, ScoreBadge } from '../components/RatingInput'
import {
  AdvantagesPanel, CastGallery, ChallengesPanel, EliminatedList, EpisodeRecap, JuryPanel, SectionTitle, TribalHistory, TribeBoard,
} from '../components/SeasonPanels'
import { Progress } from './Home'
import type { Castaway, EpisodeInfo, SeasonData } from '../types'
import { CastContext } from '../components/CastContext'
import { CastawayModal } from '../components/CastawayModal'

type Tab = 'overview' | 'tribals' | 'advantages' | 'challenges' | 'cast'

export function SeasonPage() {
  const n = Number(useParams().n)
  const season = useSeason(n)
  if (!season) return <div className="py-32 text-center text-stone-500">Lade Staffel {n} …</div>
  return <SeasonView key={n} season={season} />
}

function SeasonView({ season }: { season: SeasonData }) {
  const n = season.season
  const watchedList = useUserStore(s => s.watched[n])
  const watched = useMemo(() => watchedList ?? [], [watchedList])
  const ratings = useUserStore(s => s.ratings)
  const seasonRating = useUserStore(s => s.seasonRatings[n])
  const watchUpTo = useUserStore(s => s.watchUpTo)
  const toggleWatched = useUserStore(s => s.toggleWatched)
  const rateSeason = useUserStore(s => s.rateSeason)
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>('overview')
  const [showSeasonRating, setShowSeasonRating] = useState(false)
  const [selected, setSelected] = useState<Castaway | null>(null)

  const horizon = horizonOf(watched)
  const requested = params.get('ep') !== null ? Number(params.get('ep')) : horizon
  const viewEp = Math.min(Math.max(0, requested), horizon)
  const state = useMemo(() => computeStateAt(season, viewEp), [season, viewEp])
  const mainEps = season.episodes.filter(e => !isReunion(e.label))
  const viewEpisode = season.episodes.find(e => e.n === viewEp)
  const seasonAvg = useMemo(() => {
    const s = season.episodes.map(e => ratings[epKey(n, e.n)]?.score).filter((x): x is number => !!x)
    return s.length ? s.reduce((a, b) => a + b, 0) / s.length : null
  }, [ratings, season, n])

  const setView = (ep: number) => setParams(p => { p.set('ep', String(ep)); return p }, { replace: true })
  const markUpTo = (ep: number) => { watchUpTo(n, ep, season.episodes.map(e => e.n)); setView(ep) }

  const [c1, c2, c3] = season.palette.length ? season.palette : ['#7c2d12', '#f97316', '#fbbf24']
  const inGameCount = state.cast.filter(x => x.status === 'in' || x.status === 'winner').length

  const reveal = horizon > 0

  return (
    <CastContext.Provider value={{ reveal, open: setSelected }}>
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10">
        <div className="absolute inset-0 opacity-60" style={{ background: `linear-gradient(120deg, ${c1}, ${c2 ?? c1} 50%, ${c3 ?? c1})` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/85 to-stone-950/30" />
        <div className="absolute inset-y-0 right-0 hidden w-1/2 md:flex">
          {reveal && season.castaways.filter(c => c.image).slice(0, 6).map(c => (
            <img key={c.id} src={c.image!} referrerPolicy="no-referrer" alt="" className="h-full w-1/6 object-cover object-top opacity-40 mix-blend-luminosity" />
          ))}
        </div>
        <div className="relative space-y-4 p-6 md:p-10">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-stone-400 hover:text-white"><ArrowLeft size={16} /> Alle Staffeln</Link>
          <div className="flex flex-wrap items-end gap-4">
            <span className="font-display text-8xl leading-none text-gradient">{n}</span>
            <div className="pb-2">
              <h1 className="font-display text-4xl tracking-wide md:text-5xl">{shortName(season.name)}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-300">
                <span className="flex items-center gap-1"><MapPin size={14} /> {season.location}</span>
                <span className="flex items-center gap-1"><Calendar size={14} /> {formatDate(season.premiered)}</span>
                <span className="flex items-center gap-1"><Users size={14} /> {season.castaways.length} Kandidaten</span>
              </div>
            </div>
          </div>
          <p className="max-w-2xl text-sm text-stone-400">{season.tribeSetup}</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-64">
              <div className="flex justify-between text-xs text-stone-400"><span>Fortschritt</span><span>{watched.filter(w => mainEps.some(e => e.n === w)).length}/{mainEps.length}</span></div>
              <Progress value={watched.filter(w => mainEps.some(e => e.n === w)).length / mainEps.length} />
            </div>
            {seasonAvg !== null && <span className="flex items-center gap-2 text-sm text-stone-300">Ø Folgen <ScoreBadge score={seasonAvg} size="sm" /></span>}
            <button onClick={() => setShowSeasonRating(v => !v)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10">
              <Star size={14} /> {seasonRating ? <>Staffel: <ScoreBadge score={seasonRating.score} size="sm" /></> : 'Staffel bewerten'}
            </button>
          </div>
          <AnimatePresence>
            {showSeasonRating && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass max-w-xl overflow-hidden p-4">
                <div className="mb-2 text-sm font-semibold">Deine Gesamtbewertung für Staffel {n}</div>
                <RatingInput value={seasonRating} onSave={(s, t) => { rateSeason(n, s, t); setShowSeasonRating(false) }} placeholder="Was macht die Staffel für dich aus?" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <EpisodeStrip season={season} watched={watched} viewEp={viewEp} onView={setView} onMarkUpTo={markUpTo} onToggle={ep => toggleWatched(n, ep)} />

      {/* Status bar */}
      <div className="glass flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 text-sm">
        <span className="flex items-center gap-2">
          <Eye size={16} className="text-ember" />
          {viewEp === 0 ? <>Stand <b>vor Folge 1</b></> : <>Stand nach <b>Folge {viewEp}</b>{viewEpisode && <span className="text-stone-400">„{viewEpisode.title}“</span>}</>}
        </span>
        <span className="text-stone-400">Im Spiel: <b className="text-white">{inGameCount}</b></span>
        <span className="text-stone-400">Raus: <b className="text-white">{state.eliminated.length}</b></span>
        <span className="text-stone-400">{state.merged ? <span className="text-ember">Gemerged</span> : `${state.tribes.length} Tribes`}</span>
        {viewEp < horizon && <button onClick={() => setView(horizon)} className="ml-auto text-ember hover:underline">Zum aktuellen Stand (F{horizon}) →</button>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-4">
          <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-1 scrollbar-thin">
            {([
              ['overview', 'Übersicht', <Users size={15} />],
              ['tribals', 'Tribal Councils', <Gavel size={15} />],
              ['advantages', 'Idols & Vorteile', <Gem size={15} />],
              ['challenges', 'Challenges', <Shield size={15} />],
              ['cast', 'Cast', <Sparkles size={15} />],
            ] as const).map(([k, label, icon]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`relative flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === k ? 'text-stone-950' : 'text-stone-400 hover:text-white'}`}>
                {tab === k && <motion.span layoutId="tab" className="absolute inset-0 rounded-xl bg-gradient-to-r from-ember to-flame" />}
                <span className="relative flex items-center gap-1.5">{icon}{label}</span>
              </button>
            ))}
          </div>

          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="glass p-5">
            {tab === 'overview' && (
              <div className="space-y-6">
                {viewEp > 0 && (
                  <div>
                    <SectionTitle icon={<Sparkles size={20} />}>Was in Folge {viewEp} passiert ist</SectionTitle>
                    <EpisodeRecap state={state} />
                  </div>
                )}
                <div>
                  <SectionTitle icon={<Users size={20} />}>{state.merged ? 'Merged Tribe' : 'Tribes'}</SectionTitle>
                  <TribeBoard state={state} season={season} />
                </div>
                {viewEp > 0 && (
                  <div>
                    <SectionTitle icon={<Gavel size={20} />}>Tribal Council{state.tribals.filter(t => t.ep === viewEp).length > 1 ? 's' : ''} dieser Folge</SectionTitle>
                    <TribalHistory state={state} season={season} onlyEp={viewEp} />
                  </div>
                )}
              </div>
            )}
            {tab === 'tribals' && <><SectionTitle icon={<Gavel size={20} />}>Alle Tribal Councils bis Folge {viewEp}</SectionTitle><TribalHistory state={state} season={season} /></>}
            {tab === 'advantages' && <><SectionTitle icon={<Gem size={20} />}>Idols & Vorteile</SectionTitle><AdvantagesPanel state={state} /></>}
            {tab === 'challenges' && <><SectionTitle icon={<Shield size={20} />}>Challenge-Gewinner</SectionTitle><ChallengesPanel state={state} season={season} /></>}
            {tab === 'cast' && <><SectionTitle icon={<Sparkles size={20} />}>Die Kandidaten</SectionTitle><CastGallery state={state} season={season} horizon={horizon} /></>}
          </motion.div>
        </div>

        <aside className="space-y-4">
          {viewEpisode ? <EpisodePanel season={season} ep={viewEpisode} /> : (
            <div className="glass p-5 text-sm text-stone-400">
              <Lock size={18} className="mb-2 text-ember" />
              Du hast noch keine Folge als gesehen markiert. Klicke oben auf eine Folge, um den Stand bis dahin freizuschalten.
              <button onClick={() => markUpTo(1)} className="mt-3 flex items-center gap-1 rounded-xl bg-ember px-3 py-2 font-semibold text-stone-950"><Check size={15} /> Folge 1 gesehen</button>
            </div>
          )}
          <div className="glass p-5">
            <SectionTitle icon={<Gavel size={20} />}>Jury</SectionTitle>
            <JuryPanel state={state} season={season} />
          </div>
          <div className="glass p-5">
            <SectionTitle icon={<Skull size={20} />} right={<span className="text-sm text-stone-500">{state.eliminated.length}</span>}>Ausgeschieden</SectionTitle>
            <EliminatedList state={state} season={season} />
          </div>
        </aside>
      </div>
      <AnimatePresence>
        {selected && <CastawayModal c={selected} season={season} reveal={reveal} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
    </CastContext.Provider>
  )
}

function EpisodeStrip({ season, watched, viewEp, onView, onMarkUpTo, onToggle }: {
  season: SeasonData; watched: number[]; viewEp: number
  onView: (ep: number) => void; onMarkUpTo: (ep: number) => void; onToggle: (ep: number) => void
}) {
  const ratings = useUserStore(s => s.ratings)
  const hideTitles = useUserStore(s => s.hideUnwatchedTitles)
  const [confirm, setConfirm] = useState<number | null>(null)
  const horizon = horizonOf(watched)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>(`[data-ep="${viewEp}"]`)
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [viewEp])

  const next = season.episodes.find(e => e.n === horizon + 1)

  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <h2 className="font-display text-2xl tracking-wide">Folgen</h2>
        <span className="text-xs text-stone-500">Klick = Stand anzeigen · Haken = gesehen</span>
        {next && (
          <button onClick={() => onMarkUpTo(next.n)} className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-ember to-flame px-3 py-1.5 text-sm font-bold text-stone-950 shadow-lg shadow-ember/20">
            <Check size={15} /> {isReunion(next.label) ? "Reunion" : `Folge ${next.n}`} gesehen
          </button>
        )}
      </div>
      <div ref={ref} className="flex gap-2 overflow-x-auto pb-3 scrollbar-thin">
        {season.episodes.map(e => {
          const isWatched = watched.includes(e.n)
          const unlocked = e.n <= horizon
          const r = ratings[epKey(season.season, e.n)]
          const active = e.n === viewEp
          return (
            <div key={e.n} data-ep={e.n}
              className={`group relative w-44 shrink-0 cursor-pointer rounded-2xl border p-3 transition ${active ? 'border-ember bg-ember/10 shadow-lg shadow-ember/10' : unlocked ? 'border-white/10 bg-white/[0.04] hover:border-white/30' : 'border-white/5 bg-white/[0.02] hover:border-white/15'}`}
              onClick={() => (unlocked ? onView(e.n) : setConfirm(e.n))}
            >
              <div className="flex items-center justify-between">
                <span className={`font-display text-xl tracking-wide ${active ? 'text-ember' : ''}`}>{isReunion(e.label) ? 'Reunion' : /finale/i.test(e.label) ? `Finale` : `Folge ${e.n}`}</span>
                <button
                  onClick={ev => { ev.stopPropagation(); onToggle(e.n) }}
                  className={`flex h-6 w-6 items-center justify-center rounded-lg border transition ${isWatched ? 'border-jungle bg-jungle text-stone-950' : 'border-white/20 text-transparent hover:border-white/50 hover:text-stone-500'}`}
                  title={isWatched ? 'Diese und alle späteren Folgen als ungesehen markieren' : 'Bis hier alles als gesehen markieren'}
                >
                  <Check size={14} strokeWidth={3} />
                </button>
              </div>
              <div className={`mt-1 h-9 text-xs leading-tight ${unlocked || !hideTitles ? 'text-stone-300' : 'select-none text-stone-600 blur-[3px]'}`}>
                {unlocked || !hideTitles ? e.title : 'Titel verborgen'}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500">
                <span>{formatDate(e.date)}</span>
                {r ? <ScoreBadge score={r.score} size="sm" /> : !unlocked ? <Lock size={12} /> : null}
              </div>
              <AnimatePresence>
                {confirm === e.n && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 z-10 flex flex-col justify-center gap-2 rounded-2xl bg-stone-900/95 p-3 text-xs" onClick={ev => ev.stopPropagation()}>
                    <span>Bis Folge {e.n} als gesehen markieren?</span>
                    <div className="flex gap-2">
                      <button onClick={() => { onMarkUpTo(e.n); setConfirm(null) }} className="rounded-lg bg-ember px-2 py-1 font-bold text-stone-950">Ja</button>
                      <button onClick={() => setConfirm(null)} className="rounded-lg bg-white/10 px-2 py-1">Abbrechen</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function EpisodePanel({ season, ep }: { season: SeasonData; ep: EpisodeInfo }) {
  const k = epKey(season.season, ep.n)
  const rating = useUserStore(s => s.ratings[k])
  const rate = useUserStore(s => s.rate)
  const clearRating = useUserStore(s => s.clearRating)
  const threadLink = useUserStore(s => s.threadLinks[k])
  const setThreadLink = useUserStore(s => s.setThreadLink)
  const [editLink, setEditLink] = useState(false)
  const [linkDraft, setLinkDraft] = useState(threadLink ?? '')

  useEffect(() => { setLinkDraft(threadLink ?? ''); setEditLink(false) }, [threadLink, k])

  return (
    <div className="glass overflow-hidden">
      <div className="border-b border-white/10 bg-gradient-to-r from-ember/15 to-transparent p-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-ember">{ep.label}</div>
        <div className="font-display text-3xl leading-tight tracking-wide">{ep.title}</div>
        <div className="mt-1 flex gap-3 text-xs text-stone-400">
          <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(ep.date)}</span>
          {ep.length ? <span className="flex items-center gap-1"><Clock size={12} /> {ep.length} min</span> : null}
        </div>
      </div>
      <div className="space-y-5 p-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Star size={15} className="text-flame" /> Deine Bewertung</div>
          <RatingInput value={rating} onSave={(s, t) => rate(season.season, ep.n, s, t)} onClear={() => clearRating(season.season, ep.n)} />
        </div>
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><MessageSquare size={15} className="text-[#ff4500]" /> Reddit Live-Thread</div>
          {threadLink && !editLink ? (
            <div className="flex items-center gap-2">
              <a href={threadLink} target="_blank" rel="noreferrer" className="flex flex-1 items-center gap-2 truncate rounded-xl bg-[#ff4500]/15 px-3 py-2 text-sm font-semibold text-[#ff8c5a] hover:bg-[#ff4500]/25">
                <ExternalLink size={14} /> Thread öffnen
              </a>
              <button onClick={() => setEditLink(true)} className="rounded-xl px-2 py-2 text-xs text-stone-500 hover:text-white">ändern</button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <a href={redditSearchUrl(season.name, ep.n)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-[#ff4500]/15 px-3 py-2 text-xs font-semibold text-[#ff8c5a] hover:bg-[#ff4500]/25">
                  <ExternalLink size={13} /> Reddit-Suche
                </a>
                <a href={googleThreadUrl(season.season, season.name, ep.n)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-stone-300 hover:bg-white/10">
                  <ExternalLink size={13} /> Google
                </a>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-500" />
                  <input value={linkDraft} onChange={e => setLinkDraft(e.target.value)} placeholder="Gefundenen Thread-Link speichern"
                    className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-8 pr-2 text-xs outline-none focus:border-ember/60" />
                </div>
                <button onClick={() => setThreadLink(season.season, ep.n, linkDraft)} className="rounded-xl bg-white/10 px-3 text-xs font-semibold hover:bg-white/20">OK</button>
              </div>
              {season.premiered < '2009' && <p className="text-[11px] text-stone-500">Hinweis: Zu frühen Staffeln gibt es oft keine Live-Threads (r/survivor startete ca. 2008).</p>}
            </div>
          )}
        </div>
        <Link to={`/rankings?season=${season.season}`} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-sm text-stone-400 hover:text-white">
          Folgen-Ranking dieser Staffel <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  )
}

