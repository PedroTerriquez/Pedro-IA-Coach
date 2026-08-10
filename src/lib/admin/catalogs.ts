import { IMG_BASE, EX_GIF_BASE } from '../data/exercise-dictionary'

export type CatalogKind = 'image' | 'gif'
export interface CatalogEntry { url: string; name: string }

const IMG_CATALOG_KEY = 'admin_img_catalog_v2'
const GIF_CATALOG_KEY = 'admin_gif_catalog_v2'
const CATALOG_TTL = 24 * 60 * 60 * 1000

interface CatalogCache { entries: CatalogEntry[]; fetchedAt: number }

function keyFor(kind: CatalogKind): string {
  return kind === 'image' ? IMG_CATALOG_KEY : GIF_CATALOG_KEY
}

export function readCache(kind: CatalogKind): CatalogEntry[] {
  try {
    const raw = localStorage.getItem(keyFor(kind))
    if (!raw) return []
    const c = JSON.parse(raw) as CatalogCache
    if (!Array.isArray(c.entries)) return []
    if (Date.now() - c.fetchedAt > CATALOG_TTL) return []
    return c.entries
  } catch {
    return []
  }
}

export function isStale(kind: CatalogKind): boolean {
  try {
    const raw = localStorage.getItem(keyFor(kind))
    if (!raw) return true
    const c = JSON.parse(raw) as CatalogCache
    return !Array.isArray(c.entries) || Date.now() - c.fetchedAt > CATALOG_TTL
  } catch {
    return true
  }
}

function writeCache(kind: CatalogKind, entries: CatalogEntry[]) {
  const c: CatalogCache = { entries, fetchedAt: Date.now() }
  localStorage.setItem(keyFor(kind), JSON.stringify(c))
}

export async function fetchCatalog(kind: CatalogKind): Promise<CatalogEntry[]> {
  const repo = {
    image: { owner: 'yuhonas', repo: 'free-exercise-db', ref: 'main', sub: 'exercises/' },
    gif: { owner: 'JahelCuadrado', repo: 'ExerciseGymGifsDB', ref: 'v1.1.0', sub: '' }
  } as const
  const r = repo[kind]
  const url = `https://api.github.com/repos/${r.owner}/${r.repo}/git/trees/${r.ref}?recursive=1`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`catálogo ${kind}: HTTP ${res.status}`)
  const json = await res.json()
  const base = kind === 'image' ? IMG_BASE : EX_GIF_BASE
  const entries: CatalogEntry[] = []
  for (const node of json.tree ?? []) {
    if (node.type !== 'blob') continue
    const p: string = node.path
    if (!p.startsWith(r.sub)) continue
    if (kind === 'image') {
      if (!p.endsWith('/1.jpg')) continue
      const dir = p.slice(r.sub.length, p.length - '/1.jpg'.length)
      entries.push({ url: base + dir + '/1.jpg', name: dir.replace(/-/g, ' ') })
    } else {
      if (!p.endsWith('.gif')) continue
      const name = p.slice(0, p.length - '.gif'.length).split('/').pop() ?? p
      entries.push({ url: base + p, name: name.replace(/-/g, ' ') })
    }
  }
  entries.sort((a, b) => a.name.localeCompare(b.name))
  writeCache(kind, entries)
  return entries
}

export function searchCatalog(kind: CatalogKind, query: string, limit = 50): CatalogEntry[] {
  const q = query.toLowerCase()
  const tokens = q.split(/\s+/).filter(Boolean)
  const all = readCache(kind)
  if (!tokens.length) return all.slice(0, limit)
  return all.filter((e) => {
    const n = e.name.toLowerCase()
    return tokens.every((t) => n.includes(t))
  })
}

export function rankCatalog(kind: CatalogKind, terms: string[], limit = 50): CatalogEntry[] {
  const all = readCache(kind)
  const toks = [...new Set(terms.map((t) => t.toLowerCase()).filter((t) => t.length >= 3))]
  if (!toks.length) return all.slice(0, limit)
  const scored = all.map((e) => {
    const n = e.name.toLowerCase()
    let score = 0
    for (const t of toks) if (n.includes(t)) score++
    return { e, score }
  })
  scored.sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name))
  return [...scored.filter((x) => x.score > 0), ...scored.filter((x) => x.score === 0)]
    .map((x) => x.e)
    .slice(0, limit)
}
