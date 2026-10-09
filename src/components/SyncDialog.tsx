import { useState } from 'react'
import { motion } from 'framer-motion'
import { Cloud, CloudOff, ExternalLink, Loader2, RefreshCw, TriangleAlert, X } from 'lucide-react'
import { connect, disconnect, syncNow, useSyncStore } from '../lib/sync'

const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=Survivor%20Tracker%20Sync'

export function SyncIndicator({ onClick }: { onClick: () => void }) {
  const status = useSyncStore(s => s.status)
  const error = useSyncStore(s => s.error)
  const connected = useSyncStore(s => !!s.gistId)
  const title = !connected ? 'Geräte-Sync einrichten' : status === 'error' ? `Sync-Fehler: ${error}` : status === 'syncing' ? 'Synchronisiere …' : 'Synchronisiert'
  return (
    <button onClick={onClick} title={title} aria-label={title} className="relative rounded-xl p-2 text-stone-400 hover:bg-white/5 hover:text-white">
      {!connected ? <CloudOff size={18} /> : status === 'syncing' ? <Loader2 size={18} className="animate-spin text-ember" /> : status === 'error' ? <TriangleAlert size={18} className="text-red-400" /> : <Cloud size={18} className="text-jungle" />}
    </button>
  )
}

export function SyncDialog({ onClose }: { onClose: () => void }) {
  const { gistId, login, status, error, lastSync } = useSyncStore()
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)

  const onConnect = async () => {
    setBusy(true)
    try { await connect(token); setToken('') } catch { /* error shown from store */ } finally { setBusy(false) }
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()} className="relative w-full max-w-lg space-y-4 rounded-3xl border border-white/10 bg-stone-900 p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-3 top-3 rounded-full p-2 text-stone-400 hover:text-white" aria-label="Schließen"><X size={18} /></button>
        <div className="flex items-center gap-2">
          <Cloud className="text-ember" />
          <h2 className="font-display text-3xl tracking-wide">Geräte-Sync</h2>
        </div>

        {gistId ? (
          <div className="space-y-4 text-sm">
            <p className="text-stone-300">
              Verbunden mit GitHub als <b>{login}</b>. Bewertungen, Fortschritt und Rankings werden automatisch mit deinen anderen Geräten abgeglichen.
            </p>
            <div className="rounded-xl bg-white/[0.04] p-3 text-stone-400">
              Status: {status === 'syncing' ? 'synchronisiere …' : status === 'error' ? <span className="text-red-400">Fehler – {error}</span> : 'aktuell'}
              {lastSync && <> · zuletzt {new Date(lastSync).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => syncNow()} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-ember to-flame px-4 py-2 font-bold text-stone-950"><RefreshCw size={15} /> Jetzt synchronisieren</button>
              <button onClick={disconnect} className="rounded-xl px-3 py-2 text-stone-400 hover:bg-white/5 hover:text-red-400">Auf diesem Gerät trennen</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-sm text-stone-300">
            <p>Deine Daten werden in einem <b>geheimen Gist</b> in deinem GitHub-Konto gespeichert. Einmal pro Gerät einrichten:</p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                <a href={TOKEN_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-ember hover:underline">Token auf GitHub erstellen <ExternalLink size={13} /></a>
                {' '}– Häkchen ist nur bei <b>gist</b> gesetzt. Bei „Expiration“ am besten <b>No expiration</b> wählen, dann „Generate token“.
              </li>
              <li>Token kopieren und hier einfügen. Auf dem Handy denselben Token verwenden (oder dort einen neuen erstellen).</li>
            </ol>
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="ghp_…"
              autoComplete="off"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm outline-none focus:border-ember/60"
            />
            {error && <p className="text-red-400">{error}</p>}
            <button disabled={!token.trim() || busy} onClick={onConnect} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-ember to-flame px-4 py-2 font-bold text-stone-950 disabled:opacity-40">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Cloud size={15} />} Verbinden
            </button>
            <p className="text-xs text-stone-500">Der Token bleibt nur in diesem Browser gespeichert und kann ausschließlich Gists lesen/schreiben. Vorhandene Daten auf beiden Geräten werden zusammengeführt, nichts wird überschrieben.</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
