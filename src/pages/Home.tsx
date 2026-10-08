import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, Search, Star } from 'lucide-react'
import { isReunion, shortName, useIndex } from '../lib/data'
import { horizonOf, useUserStore } from '../store/useUserStore'
import { ScoreBadge } from '../components/RatingInput'

type Filter = 'all' | 'started' | 'done' | 'new'

export function Home() {
  const index = useIndex()
  const watched = useUserStore(s => s.watched)
  const ratings = useUserStore(s => s.ratings)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [desc, setDesc] = useState(false)

  const seasons = useMemo(() => {
    if (!index) return []
    return index.map(s => {
      const eps = s.episodes.filter(e => !isReunion(e.label))
      const w = (watched[s.season] ?? []).filter(n => eps.some(e => e.n === n)).length
      const scores = Object.entries(ratings).filter(([k]) => k.startsWith(s.season + '-')).map(([, r]) => r.score)
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
      return { ...s, total: eps.length, w, avg, horizon: horizonOf(watched[s.season]) }
    })
  }, [index, watched, ratings])

  const shown = seasons
    .filter(s => !q || `${s.season} ${s.name} ${s.location} ${s.country}`.toLowerCase().includes(q.toLowerCase()))
    .filter(s => filter === 'all' || (filter === 'started' && s.w > 0 && s.w < s.total) || (filter === 'done' && s.w >= s.total) || (filter === 'new' && s.w === 0))
    .sort((a, b) => (desc ? b.season - a.season : a.season - b.season))

  const totalWatched = seasons.reduce((a, s) => a + s.w, 0)
  const allScores = Object.values(ratings).map(r => r.score)
  const globalAvg = allScores.length ? allScores.reduce((a, b) => a + b, 0) / allScores.length : null
  const continueWatching = seasons.filter(s => s.w > 0 && s.w < s.total)

  if (!index) return <div className="py-32 text-center text-stone-500">Lade Staffeln …</div>

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-orange-950/60 via-stone-950 to-emerald-950/40 p-8 md:p-12">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-ember/20 blur-3xl" />
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-ember">Outwit · Outplay · Outlast</p>
        <h1 className="mt-2 font-display text-5xl tracking-wide md:text-7xl">Dein Survivor-Logbuch</h1>
        <p className="mt-3 max-w-2xl text-stone-400">
          Hake gesehene Folgen ab und sieh den Stand des Spiels – Tribes, Idols, Tribal Councils – exakt bis zum Ende deiner letzten Folge. Kein Spoiler mehr.
        </p>
        <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
          <Stat label="Folgen gesehen" value={totalWatched} />
          <Stat label="Bewertungen" value={allScores.length} />
          <Stat label="Ø Bewertung" value={globalAvg ? globalAvg.toFixed(1) : '–'} />
        </div>
      </section>

      {continueWatching.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-3xl tracking-wide">Weiterschauen</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {continueWatching.map(s => (
              <Link key={s.season} to={`/season/${s.season}`} className="glass group flex min-w-72 items-center gap-4 p-4 transition hover:border-ember/50">
                <span className="font-display text-4xl text-gradient">{s.season}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{shortName(s.name)}</div>
                  <div className="text-xs text-stone-400">Nächste: Folge {s.horizon + 1} von {s.total}</div>
                  <Progress value={s.w / s.total} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="mr-auto font-display text-3xl tracking-wide">Alle Staffeln</h2>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Staffel, Ort …"
              className="w-56 rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm outline-none focus:border-ember/60"
            />
          </div>
          <div className="flex rounded-xl border border-white/10 bg-white/5 p-1 text-sm">
            {([['all', 'Alle'], ['started', 'Laufend'], ['done', 'Fertig'], ['new', 'Neu']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className={`rounded-lg px-3 py-1 font-medium ${filter === k ? 'bg-ember text-stone-950' : 'text-stone-400 hover:text-white'}`}>{l}</button>
            ))}
          </div>
          <button onClick={() => setDesc(d => !d)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-stone-300 hover:text-white">
            {desc ? 'Neueste zuerst' : 'Älteste zuerst'}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((s, i) => {
            const [c1, c2, c3] = s.palette.length ? s.palette : ['#7c2d12', '#f97316', '#fbbf24']
            return (
              <motion.div key={s.season} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.4) }}>
                <Link
                  to={`/season/${s.season}`}
                  className="group relative block h-full overflow-hidden rounded-2xl border border-white/10 bg-stone-900 transition duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-2xl hover:shadow-black/50"
                >
                  <div className="relative h-36 overflow-hidden" style={{ background: `linear-gradient(135deg, ${c1}, ${c2 ?? c1} 55%, ${c3 ?? c2 ?? c1})` }}>
                    <div className="absolute inset-0 flex justify-end">
                      {s.w > 0 && s.cover.slice(0, 4).map((img, j) => (
                        <img key={j} src={img} referrerPolicy="no-referrer" loading="lazy" alt="" className="h-full w-1/4 object-cover object-top opacity-70 mix-blend-luminosity transition duration-500 group-hover:opacity-90 group-hover:mix-blend-normal" />
                      ))}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/40 to-transparent" />
                    <span className="absolute bottom-1 left-4 font-display text-6xl leading-none text-white drop-shadow-lg">{s.season}</span>
                    {s.avg !== null && <span className="absolute right-3 top-3"><ScoreBadge score={s.avg} size="sm" /></span>}
                    {s.w >= s.total && <span className="chip absolute left-3 top-3 bg-jungle text-stone-950">✓ Gesehen</span>}
                  </div>
                  <div className="space-y-2 p-4">
                    <div className="font-semibold leading-tight">{shortName(s.name)}</div>
                    <div className="flex items-center gap-1 text-xs text-stone-400"><MapPin size={12} /> {s.location} · {s.premiered?.slice(0, 4)}</div>
                    <div className="flex items-center justify-between text-xs text-stone-400">
                      <span>{s.w}/{s.total} Folgen</span>
                      {s.avg !== null && <span className="flex items-center gap-1"><Star size={12} /> Ø {s.avg.toFixed(1)}</span>}
                    </div>
                    <Progress value={s.total ? s.w / s.total : 0} />
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass p-4">
      <div className="font-display text-4xl tracking-wide">{value}</div>
      <div className="text-xs uppercase tracking-wider text-stone-400">{label}</div>
    </div>
  )
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-gradient-to-r from-ember to-flame transition-all duration-500" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  )
}
