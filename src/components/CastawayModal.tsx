import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Briefcase, Cake, Calendar, History, MapPin, X } from 'lucide-react'
import type { Castaway, SeasonData } from '../types'
import { contrastText, formatDate, shortName } from '../lib/data'
import { Mystery } from './Avatar'

function yearsBetween(from: string, to: Date) {
  const b = new Date(from + 'T12:00:00')
  let age = to.getFullYear() - b.getFullYear()
  if (to.getMonth() < b.getMonth() || (to.getMonth() === b.getMonth() && to.getDate() < b.getDate())) age--
  return age
}

/** Shows only facts that don't spoil this or later seasons. */
export function CastawayModal({ c, season, reveal, onClose }: { c: Castaway; season: SeasonData; reveal: boolean; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const color = season.tribes[c.originalTribe ?? ''] ?? '#78716c'
  const bigImage = c.image?.replace(/scale-to-width-down\/\d+/, 'scale-to-width-down/700')
  const ageAtSeason = c.age ?? (c.birthDate && season.premiered ? yearsBetween(c.birthDate, new Date(season.premiered)) : null)
  const currentAge = c.birthDate && !c.deathDate ? yearsBetween(c.birthDate, new Date()) : null

  const facts: { icon: React.ReactNode; label: string; value: React.ReactNode }[] = []
  if (c.birthDate) facts.push({ icon: <Cake size={16} />, label: 'Geburtsdatum', value: formatDate(c.birthDate) })
  if (ageAtSeason !== null) facts.push({ icon: <Calendar size={16} />, label: `Alter in Staffel ${season.season}`, value: `${ageAtSeason} Jahre` })
  if (currentAge !== null) facts.push({ icon: <Cake size={16} />, label: 'Alter heute', value: `${currentAge} Jahre` })
  if (c.deathDate) facts.push({ icon: <Calendar size={16} />, label: 'Verstorben', value: `${formatDate(c.deathDate)} (${yearsBetween(c.birthDate ?? c.deathDate, new Date(c.deathDate))} Jahre)` })
  if (c.occupation) facts.push({ icon: <Briefcase size={16} />, label: 'Beruf', value: c.occupation })
  if (c.hometown) facts.push({ icon: <MapPin size={16} />, label: 'Herkunft', value: c.hometown })

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 12 }}
        onClick={e => e.stopPropagation()}
        className="relative grid max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-stone-900 shadow-2xl md:grid-cols-[320px_1fr]"
      >
        <button onClick={onClose} className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-2 text-stone-300 hover:text-white" aria-label="Schließen"><X size={18} /></button>
        <div className="relative aspect-[4/5] md:aspect-auto md:h-full" style={{ background: color }}>
          {reveal && bigImage
            ? <img src={bigImage} alt={c.fullName} referrerPolicy="no-referrer" className="h-full w-full object-cover object-top" />
            : <Mystery />}
        </div>
        <div className="space-y-5 overflow-y-auto p-6">
          <div>
            {c.originalTribe && <span className="chip mb-2" style={{ background: color, color: contrastText(color) }}>{c.originalTribe}</span>}
            <h2 className="font-display text-5xl leading-none tracking-wide">{c.name}</h2>
            <div className="text-stone-400">{c.fullName}</div>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            {facts.map(f => (
              <div key={f.label} className="rounded-xl bg-white/[0.04] p-3">
                <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-stone-500"><span className="text-ember">{f.icon}</span>{f.label}</dt>
                <dd className="mt-0.5 font-semibold">{f.value}</dd>
              </div>
            ))}
          </dl>
          {c.previousSeasons.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-stone-500"><History size={14} className="text-ember" /> Frühere Teilnahmen</div>
              <div className="flex flex-wrap gap-2">
                {c.previousSeasons.map(p => <span key={p.season} className="chip bg-white/10 text-stone-200">S{p.season} · {shortName(p.name)}</span>)}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
