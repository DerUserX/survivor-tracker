import { useState } from 'react'
import type { Castaway } from '../types'
import { useCast } from './CastContext'

interface Props {
  c: Castaway
  size?: number
  color?: string
  dim?: boolean
  className?: string
}

export function Mystery({ size, color = '#44403c' }: { size?: number; color?: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-700 to-stone-900 font-display text-stone-400"
      style={{ fontSize: size ? size / 1.8 : '4rem', boxShadow: `inset 0 0 0 1px ${color}` }}>
      ?
    </div>
  )
}

export function Avatar({ c, size = 56, color = '#78716c', dim, className = '' }: Props) {
  const [failed, setFailed] = useState(false)
  const { reveal, open } = useCast()
  const initials = c.name.split(/\s+/).map(p => p[0]).join('').slice(0, 2)
  return (
    <button
      type="button"
      onClick={() => open(c)}
      className={`relative block shrink-0 cursor-pointer overflow-hidden rounded-full transition hover:scale-105 ${dim ? 'grayscale opacity-55' : ''} ${className}`}
      style={{ width: size, height: size, boxShadow: `0 0 0 2px ${color}` }}
      title={c.fullName}
    >
      {!reveal ? (
        <Mystery size={size} />
      ) : c.image && !failed ? (
        <img
          src={c.image}
          alt={c.fullName}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-bold text-white" style={{ background: color, fontSize: size / 2.8 }}>
          {initials}
        </div>
      )}
    </button>
  )
}
