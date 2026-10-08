import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BarChart3, GripVertical, ListOrdered, Medal, Plus, Star, X } from 'lucide-react'
import { shortName, useIndex } from '../lib/data'
import { useUserStore } from '../store/useUserStore'
import { ScoreBadge } from '../components/RatingInput'
import type { SeasonIndexEntry } from '../types'

type Tab = 'episodes' | 'seasons' | 'mine'

export function Rankings() {
  const index = useIndex()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) ?? 'episodes')
  if (!index) return <div className="py-32 text-center text-stone-500">Lade …</div>
  const switchTab = (t: Tab) => { setTab(t); setParams(p => { p.set('tab', t); return p }, { replace: true }) }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-5xl tracking-wide">Rankings</h1>
        <p className="text-stone-400">Deine bestbewerteten Folgen, Staffel-Durchschnitte und dein persönliches All-Time-Ranking.</p>
      </div>
      <div className="flex w-fit gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
        {([['episodes', 'Top-Folgen', <Star size={15} />], ['seasons', 'Staffeln nach Ø', <BarChart3 size={15} />], ['mine', 'Mein Staffel-Ranking', <ListOrdered size={15} />]] as const).map(([k, l, i]) => (
          <button key={k} onClick={() => switchTab(k)} className={`relative flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold ${tab === k ? 'text-stone-950' : 'text-stone-400 hover:text-white'}`}>
            {tab === k && <motion.span layoutId="rtab" className="absolute inset-0 rounded-xl bg-gradient-to-r from-ember to-flame" />}
            <span className="relative flex items-center gap-1.5">{i}{l}</span>
          </button>
        ))}
      </div>
      {tab === 'episodes' && <TopEpisodes index={index} />}
      {tab === 'seasons' && <SeasonAverages index={index} />}
      {tab === 'mine' && <MyRanking index={index} />}
    </div>
  )
}

function medal(i: number) {
  return ['text-flame', 'text-stone-300', 'text-amber-700'][i] ?? 'text-stone-600'
}

function TopEpisodes({ index }: { index: SeasonIndexEntry[] }) {
  const ratings = useUserStore(s => s.ratings)
  const [params, setParams] = useSearchParams()
  const seasonFilter = params.get('season') ? Number(params.get('season')) : null
  const [sort, setSort] = useState<'best' | 'worst' | 'recent'>('best')
  const byNum = new Map(index.map(s => [s.season, s]))

  const rows = useMemo(() => Object.entries(ratings).map(([k, r]) => {
    const [s, e] = k.split('-').map(Number)
    const season = byNum.get(s)
    return { k, s, e, r, season, ep: season?.episodes.find(x => x.n === e) }
  }).filter(x => x.season && (!seasonFilter || x.s === seasonFilter))
    .sort((a, b) => sort === 'best' ? b.r.score - a.r.score || b.r.updatedAt.localeCompare(a.r.updatedAt)
      : sort === 'worst' ? a.r.score - b.r.score : b.r.updatedAt.localeCompare(a.r.updatedAt)),
  [ratings, seasonFilter, sort, byNum])

  const ratedSeasons = [...new Set(Object.keys(ratings).map(k => Number(k.split('-')[0])))].sort((a, b) => a - b)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={seasonFilter ?? ''} onChange={e => setParams(p => { if (e.target.value) p.set('season', e.target.value); else p.delete('season'); return p })}
          className="rounded-xl border border-white/10 bg-stone-900 px-3 py-2 text-sm outline-none">
          <option value="">Alle Staffeln</option>
          {ratedSeasons.map(s => <option key={s} value={s}>Staffel {s} – {shortName(byNum.get(s)?.name ?? '')}</option>)}
        </select>
        <div className="flex rounded-xl border border-white/10 bg-white/5 p-1 text-sm">
          {([['best', 'Beste'], ['worst', 'Schlechteste'], ['recent', 'Neueste']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setSort(k)} className={`rounded-lg px-3 py-1 ${sort === k ? 'bg-ember font-semibold text-stone-950' : 'text-stone-400'}`}>{l}</button>
          ))}
        </div>
      </div>
      {!rows.length && <Empty text="Noch keine Folgen bewertet. Öffne eine Staffel und bewerte die Folgen, die du gesehen hast." />}
      <div className="space-y-2">
        {rows.map((x, i) => (
          <motion.div key={x.k} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}>
            <Link to={`/season/${x.s}?ep=${x.e}`} className="glass flex items-start gap-4 p-4 transition hover:border-white/25">
              <span className={`w-10 shrink-0 text-center font-display text-3xl ${sort === 'best' ? medal(i) : 'text-stone-600'}`}>{i + 1}</span>
              <ScoreBadge score={x.r.score} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-ember">S{x.s} · {x.ep?.label ?? `Folge ${x.e}`} · {shortName(x.season!.name)}</div>
                <div className="font-display text-2xl leading-tight tracking-wide">{x.ep?.title}</div>
                {x.r.text && <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-stone-400">„{x.r.text}“</p>}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function SeasonAverages({ index }: { index: SeasonIndexEntry[] }) {
  const ratings = useUserStore(s => s.ratings)
  const seasonRatings = useUserStore(s => s.seasonRatings)
  const rows = index.map(s => {
    const scores = Object.entries(ratings).filter(([k]) => k.startsWith(`${s.season}-`)).map(([, r]) => r.score)
    return { s, n: scores.length, avg: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null, best: scores.length ? Math.max(...scores) : null, own: seasonRatings[s.season] }
  }).filter(r => r.avg !== null || r.own).sort((a, b) => (b.own?.score ?? b.avg ?? 0) - (a.own?.score ?? a.avg ?? 0) || (b.avg ?? 0) - (a.avg ?? 0))

  if (!rows.length) return <Empty text="Bewerte Folgen oder ganze Staffeln, um hier eine Auswertung zu sehen." />
  return (
    <div className="glass overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wider text-stone-500">
          <tr><th className="p-3">#</th><th className="p-3">Staffel</th><th className="p-3">Deine Note</th><th className="p-3">Ø Folgen</th><th className="hidden p-3 sm:table-cell">Bewertet</th><th className="hidden p-3 md:table-cell">Verteilung</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.s.season} className="border-t border-white/5 hover:bg-white/[0.03]">
              <td className={`p-3 font-display text-2xl ${medal(i)}`}>{i + 1}</td>
              <td className="p-3"><Link to={`/season/${r.s.season}`} className="font-semibold hover:text-ember">S{r.s.season} · {shortName(r.s.name)}</Link>
                {r.own?.text && <div className="line-clamp-1 text-xs text-stone-500">„{r.own.text}“</div>}</td>
              <td className="p-3">{r.own ? <ScoreBadge score={r.own.score} size="sm" /> : <span className="text-stone-600">–</span>}</td>
              <td className="p-3">{r.avg !== null ? <ScoreBadge score={r.avg} size="sm" /> : <span className="text-stone-600">–</span>}</td>
              <td className="hidden p-3 text-stone-400 sm:table-cell">{r.n} Folgen</td>
              <td className="hidden p-3 md:table-cell"><Histogram season={r.s.season} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Histogram({ season }: { season: number }) {
  const ratings = useUserStore(s => s.ratings)
  const counts = Array(10).fill(0)
  Object.entries(ratings).forEach(([k, r]) => { if (k.startsWith(`${season}-`)) counts[r.score - 1]++ })
  const max = Math.max(1, ...counts)
  return (
    <div className="flex h-6 items-end gap-0.5">
      {counts.map((c, i) => <div key={i} title={`${i + 1}: ${c}`} className="w-2 rounded-sm bg-gradient-to-t from-ember to-flame" style={{ height: `${(c / max) * 100}%`, opacity: c ? 1 : 0.15, minHeight: 2 }} />)}
    </div>
  )
}

function MyRanking({ index }: { index: SeasonIndexEntry[] }) {
  const ranking = useUserStore(s => s.seasonRanking)
  const setRanking = useUserStore(s => s.setRanking)
  const watched = useUserStore(s => s.watched)
  const byNum = new Map(index.map(s => [s.season, s]))
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const pool = index.filter(s => !ranking.includes(s.season))
  const [onlyWatched, setOnlyWatched] = useState(true)
  const shownPool = pool.filter(s => !onlyWatched || (watched[s.season]?.length ?? 0) > 0)

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    setRanking(arrayMove(ranking, ranking.indexOf(Number(e.active.id)), ranking.indexOf(Number(e.over.id))))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="glass p-5">
        <div className="mb-3 flex items-center gap-2"><Medal className="text-flame" /><h2 className="font-display text-2xl tracking-wide">Mein All-Time-Ranking</h2><span className="ml-auto text-xs text-stone-500">Ziehen zum Sortieren</span></div>
        {!ranking.length && <Empty text="Füge rechts Staffeln hinzu und sortiere sie per Drag & Drop." />}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ranking} strategy={verticalListSortingStrategy}>
            <ol className="space-y-2">
              {ranking.map((n, i) => byNum.get(n) && (
                <SortableRow key={n} s={byNum.get(n)!} i={i} onRemove={() => setRanking(ranking.filter(x => x !== n))} />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      </div>
      <div className="glass h-fit p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Staffeln hinzufügen</h3>
          <label className="flex items-center gap-1.5 text-xs text-stone-400"><input type="checkbox" checked={onlyWatched} onChange={e => setOnlyWatched(e.target.checked)} className="accent-orange-500" /> nur angeschaute</label>
        </div>
        <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1 scrollbar-thin">
          {shownPool.map(s => (
            <button key={s.season} onClick={() => setRanking([...ranking, s.season])} className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-white/5">
              <span className="w-8 font-display text-xl text-stone-500">{s.season}</span>
              <span className="flex-1 truncate">{shortName(s.name)}</span>
              <Plus size={15} className="text-ember" />
            </button>
          ))}
          {!shownPool.length && <p className="text-xs text-stone-500">Keine weiteren Staffeln{onlyWatched ? ' mit gesehenen Folgen' : ''}.</p>}
        </div>
      </div>
    </div>
  )
}

function SortableRow({ s, i, onRemove }: { s: SeasonIndexEntry; i: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.season })
  const seasonRating = useUserStore(st => st.seasonRatings[s.season])
  const [c1, c2] = s.palette.length ? s.palette : ['#7c2d12', '#f97316']
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-stone-900 p-2 pr-3 ${isDragging ? 'z-10 shadow-2xl shadow-black ring-2 ring-ember' : ''}`}>
      <button {...attributes} {...listeners} className="cursor-grab touch-none p-1 text-stone-500 active:cursor-grabbing"><GripVertical size={18} /></button>
      <span className={`w-10 text-center font-display text-3xl ${medal(i)}`}>{i + 1}</span>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-display text-2xl text-white" style={{ background: `linear-gradient(135deg, ${c1}, ${c2 ?? c1})` }}>{s.season}</div>
      <div className="min-w-0 flex-1">
        <Link to={`/season/${s.season}`} className="block truncate font-semibold hover:text-ember">{shortName(s.name)}</Link>
        <div className="text-xs text-stone-500">{s.location} · {s.premiered?.slice(0, 4)}</div>
      </div>
      {seasonRating && <ScoreBadge score={seasonRating.score} size="sm" />}
      <button onClick={onRemove} className="rounded-lg p-1 text-stone-600 hover:bg-white/5 hover:text-red-400"><X size={16} /></button>
    </li>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-stone-500">{text}</div>
}
