import { useRef, useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { Download, Flame, Settings2, Trophy, Upload, Tv } from 'lucide-react'
import { exportUserData, useUserStore } from '../store/useUserStore'

export function Layout() {
  const importData = useUserStore(s => s.importData)
  const hideTitles = useUserStore(s => s.hideUnwatchedTitles)
  const setHideTitles = useUserStore(s => s.setHideUnwatchedTitles)
  const [menu, setMenu] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const onImport = async (f: File | undefined) => {
    if (!f) return
    try {
      importData(JSON.parse(await f.text()))
      alert('Daten importiert ✔')
    } catch (e) {
      alert('Import fehlgeschlagen: ' + (e as Error).message)
    }
  }

  const navCls = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-white/10 text-white' : 'text-stone-400 hover:text-white'}`

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-night/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-ember to-flame shadow-lg shadow-ember/30">
              <Flame size={20} className="text-stone-950" />
            </span>
            <span className="font-display text-2xl tracking-wider">
              SURVIVOR <span className="text-gradient">TRACKER</span>
            </span>
          </Link>
          <nav className="ml-auto flex items-center gap-1">
            <NavLink to="/" end className={navCls}><Tv size={16} /> <span className="hidden sm:inline">Staffeln</span></NavLink>
            <NavLink to="/rankings" className={navCls}><Trophy size={16} /> <span className="hidden sm:inline">Rankings</span></NavLink>
            <div className="relative">
              <button onClick={() => setMenu(m => !m)} className="rounded-xl p-2 text-stone-400 hover:bg-white/5 hover:text-white" aria-label="Einstellungen">
                <Settings2 size={18} />
              </button>
              {menu && (
                <div className="glass absolute right-0 mt-2 w-72 space-y-1 bg-stone-900/95 p-2 shadow-2xl" onMouseLeave={() => setMenu(false)}>
                  <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/5">
                    Titel ungesehener Folgen verbergen
                    <input type="checkbox" checked={hideTitles} onChange={e => setHideTitles(e.target.checked)} className="accent-orange-500" />
                  </label>
                  <button onClick={exportUserData} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/5">
                    <Download size={16} /> Bewertungen exportieren (JSON)
                  </button>
                  <button onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/5">
                    <Upload size={16} /> Backup importieren
                  </button>
                  <input ref={fileRef} type="file" accept="application/json" hidden onChange={e => onImport(e.target.files?.[0])} />
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-6">
        <Outlet />
      </main>
      <footer className="pb-8 text-center text-xs text-stone-600">
        Daten: survivoR-Datensatz (D. Oehm) · Bilder: Survivor Wiki (Fandom) · Deine Bewertungen bleiben lokal im Browser.
      </footer>
    </div>
  )
}
