import { createContext, useContext } from 'react'
import type { Castaway } from '../types'

interface CastCtx {
  /** false until the first episode of the season is watched → photos show "?" */
  reveal: boolean
  open: (c: Castaway) => void
}

export const CastContext = createContext<CastCtx>({ reveal: true, open: () => {} })
export const useCast = () => useContext(CastContext)
