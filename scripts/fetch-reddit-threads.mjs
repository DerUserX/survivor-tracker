// Collects r/survivor episode discussion links from the subreddit wiki (via the Wayback Machine,
// reddit itself blocks scripted access) and writes scripts/reddit-threads.json.
// Usage: node scripts/fetch-reddit-threads.mjs [--cache <dir with old.html, s31.html …>]
// Run `npm run data` afterwards to merge the links into public/data.
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'scripts', 'reddit-threads.json')
const WIKI = 'https://www.reddit.com/r/survivor/wiki/'
const cacheIdx = process.argv.indexOf('--cache')
const cacheDir = cacheIdx > -1 ? process.argv[cacheIdx + 1] : null
const NEWER_SEASONS = Array.from({ length: 30 }, (_, i) => 31 + i) // pages that don't exist are skipped

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function getPage(file, wikiPath) {
  if (cacheDir) {
    try { return await fs.readFile(path.join(cacheDir, file), 'utf8') } catch { /* fall through to download */ }
  }
  for (let i = 0; i < 3; i++) {
    const res = await fetch(`https://web.archive.org/web/2030/${WIKI}${wikiPath}`, { headers: { 'User-Agent': 'Mozilla/5.0 survivor-tracker' } })
    if (res.status === 404) return null
    const html = await res.text()
    if (html.includes('md wiki')) return html
    await sleep(8000)
  }
  return null
}

/** Only the wiki body, as a flat list of headings and links in document order. */
function tokens(html) {
  const start = html.indexOf('<div class="md wiki">')
  if (start < 0) return []
  let body = html.slice(start)
  const end = body.indexOf('Last revised')
  if (end > 0) body = body.slice(0, end)
  const out = []
  const re = /<h([1-4])[^>]*>([\s\S]*?)<\/h\1>|<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
  for (let m; (m = re.exec(body));) {
    if (m[1]) out.push({ kind: 'h', level: +m[1], text: clean(m[2]) })
    else out.push({ kind: 'a', href: unwrap(m[3]), text: clean(m[4]) })
  }
  return out
}

const clean = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()
const unwrap = href => href.replace(/^(https?:\/\/web\.archive\.org)?\/web\/\d+\//, '').replace(/^http:/, 'https:')
const isThread = href => /^https:\/\/(www\.)?(reddit\.com\/r\/survivor\/comments\/|redd\.it\/)/i.test(href)
const SHORTENER = /^https:\/\/(goo\.gl|bit\.ly|tinyurl\.com)\//i
const resolved = new Map()
/** Follows a URL shortener one hop so old goo.gl links become real reddit links. */
async function resolveShort(href) {
  if (!SHORTENER.test(href)) return href
  if (!resolved.has(href)) {
    let target = href
    try {
      const res = await fetch(href, { redirect: 'manual' })
      target = (res.headers.get('location') ?? href).replace(/^http:/, 'https:')
    } catch { /* keep short link */ }
    resolved.set(href, target)
  }
  return resolved.get(href)
}
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '')

async function loadSeason(n) {
  try { return JSON.parse(await fs.readFile(path.join(ROOT, 'public', 'data', 'seasons', `${n}.json`), 'utf8')) } catch { return null }
}

function finaleOf(season) {
  const main = season.episodes.filter(e => !/reunion/i.test(e.label))
  return (main.find(e => /finale/i.test(e.label)) ?? main[main.length - 1]).n
}

/** Which episodes a heading / link text like "Episodes 10/11", "7, 8 and 9", "Finale and Reunion" refers to. */
function episodesIn(text, season, { allowBareNumbers }) {
  const eps = new Set()
  const t = text.replace(/\(.*?\)/g, ' ')
  const nums = allowBareNumbers ? t.match(/\d+/g) : t.match(/episodes?\s*([\d\s,/&and]+)/i)?.[1].match(/\d+/g)
  for (const x of nums ?? []) if (season.episodes.some(e => e.n === +x)) eps.add(+x)
  if (/finale/i.test(t)) eps.add(finaleOf(season))
  if (/reunion/i.test(t)) {
    const r = season.episodes.find(e => /reunion/i.test(e.label))
    eps.add(r ? r.n : finaleOf(season))
  }
  if (!eps.size) {
    const byTitle = season.episodes.find(e => norm(e.title) && norm(e.title) === norm(t))
    if (byTitle) eps.add(byTitle.n)
  }
  return [...eps]
}

function label(text) {
  if (/eastern|EST/i.test(text) && /live/i.test(text)) return 'Live-Thread (Ost)'
  if (/pacific|PST/i.test(text) && /live/i.test(text)) return 'Live-Thread (West)'
  if (/live/i.test(text)) return 'Live-Thread'
  if (/post-?episode/i.test(text)) return 'Nach der Folge'
  if (/day after/i.test(text)) return 'Tag danach'
  return text
}

const result = {}
const add = (s, ep, entry) => {
  const list = ((result[s] ??= {})[ep] ??= [])
  if (!list.some(x => x.url === entry.url)) list.push(entry)
}

// 1) Old seasons (S3–S30): "S22: Redemption Island" headings followed by links named after episodes
const oldHtml = await getPage('old.html', 'old_episode_discussions/')
let current = null
for (const tok of tokens(oldHtml ?? '')) {
  if (tok.kind === 'h') {
    const n = Number(tok.text.match(/^S(\d+):/)?.[1])
    current = n ? { season: await loadSeason(n), rewatch: /rewatch/i.test(tok.text) } : null
    continue
  }
  if (!current?.season) continue
  const href = await resolveShort(tok.href)
  if (!isThread(href)) continue
  for (const ep of episodesIn(tok.text, current.season, { allowBareNumbers: true })) {
    add(current.season.season, ep, { label: current.rewatch ? 'Rewatch-Diskussion' : 'Diskussion', url: href })
  }
}

// 2) Newer seasons: one wiki page per season, "Episode N" / title headings with link lists
for (const n of NEWER_SEASONS) {
  const season = await loadSeason(n)
  if (!season) continue
  const html = await getPage(`s${n}.html`, `season_archive/season${n}/`)
  if (!cacheDir) await sleep(3000)
  if (!html) { console.log('no archive page for season', n); continue }
  let eps = []
  for (const tok of tokens(html)) {
    if (tok.kind === 'h') {
      if (/pre-?season|post-?season|back to season archive/i.test(tok.text)) { eps = []; continue }
      let found = episodesIn(tok.text, season, { allowBareNumbers: false })
      if (!found.length && /^episodes?\b/i.test(tok.text)) found = episodesIn(tok.text, season, { allowBareNumbers: true })
      // unmatched sub-headings (usually the episode title under "Episode N") keep the current episode
      if (found.length || tok.level <= 2) eps = found
      continue
    }
    if (!eps.length) continue
    const href = await resolveShort(tok.href)
    if (!isThread(href)) continue
    for (const ep of eps) add(n, ep, { label: label(tok.text), url: href })
  }
}

// live threads first
const rank = l => (/^Live/.test(l) ? 0 : /^Nach/.test(l) ? 1 : /^Tag danach/.test(l) ? 2 : /Diskussion/.test(l) ? 0 : 3)
for (const s of Object.values(result)) for (const list of Object.values(s)) list.sort((a, b) => rank(a.label) - rank(b.label))

await fs.writeFile(OUT, JSON.stringify(result, null, 1))
const count = Object.values(result).flatMap(s => Object.values(s)).length
console.log(`wrote ${count} episodes with threads across ${Object.keys(result).length} seasons`)
