import { useEffect, useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import type { Rating } from '../store/useUserStore'

export function scoreColor(score: number) {
  if (score >= 9) return '#22c55e'
  if (score >= 7) return '#84cc16'
  if (score >= 5) return '#fbbf24'
  if (score >= 3) return '#f97316'
  return '#ef4444'
}

export function ScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'sm' ? 'h-6 min-w-6 text-xs' : size === 'lg' ? 'h-14 min-w-14 text-2xl' : 'h-9 min-w-9 text-sm'
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg px-1.5 font-extrabold text-stone-950 ${dims}`}
      style={{ background: scoreColor(score) }}
    >
      {Number.isInteger(score) ? score : score.toFixed(1)}
    </span>
  )
}

interface Props {
  value?: Rating
  onSave: (score: number, text: string) => void
  onClear?: () => void
  placeholder?: string
}

export function RatingInput({ value, onSave, onClear, placeholder = 'Deine Gedanken zur Folge …' }: Props) {
  const [score, setScore] = useState(value?.score ?? 0)
  const [text, setText] = useState(value?.text ?? '')
  const [hover, setHover] = useState(0)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setScore(value?.score ?? 0)
    setText(value?.text ?? '')
  }, [value?.score, value?.text])

  const dirty = score !== (value?.score ?? 0) || text !== (value?.text ?? '')
  const shown = hover || score

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" onMouseLeave={() => setHover(0)}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onClick={() => setScore(n)}
            className="h-10 w-10 rounded-xl text-sm font-bold transition-all duration-150 hover:scale-110"
            style={n <= shown
              ? { background: scoreColor(shown), color: '#0c0a09' }
              : { background: 'rgb(255 255 255 / 0.06)', color: '#a8a29e' }}
          >
            {n}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={3}
        placeholder={placeholder}
        className="w-full resize-y rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-ember/60"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!score || !dirty}
          onClick={() => { onSave(score, text); setSaved(true); setTimeout(() => setSaved(false), 1500) }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-ember to-flame px-4 py-2 text-sm font-bold text-stone-950 transition disabled:opacity-30"
        >
          <Check size={16} /> {saved ? 'Gespeichert!' : 'Bewertung speichern'}
        </button>
        {value && onClear && (
          <button type="button" onClick={onClear} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm text-stone-400 hover:bg-white/5 hover:text-red-400">
            <Trash2 size={15} /> Löschen
          </button>
        )}
      </div>
    </div>
  )
}
