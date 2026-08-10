import fs from 'fs'

const warmupSrc = fs.readFileSync('src/lib/data/warmup.ts', 'utf8')
const gifsSrc = fs.readFileSync('src/lib/data/warmup-gifs.ts', 'utf8')

// ---- 1. Parse WARMUP_DATA -> entries [{muscle, kind, fields}] ----
const dataStart = warmupSrc.indexOf('export const WARMUP_DATA')
const outerOpen = warmupSrc.indexOf('{', dataStart)

function skipString(src, i) {
  let j = i + 1
  while (j < src.length) {
    if (src[j] === '\\') { j += 2; continue }
    if (src[j] === "'" || src[j] === '"') return j
    j++
  }
  return j
}
function skipComment(src, i) {
  const c = src[i], n = src[i + 1]
  if (c === '/' && n === '/') {
    let j = i
    while (j < src.length && src[j] !== '\n') j++
    return j
  }
  return i
}
function scan(src, from, isOpen) {
  let i = from
  while (i < src.length) {
    const c = src[i]
    if (c === "'" || c === '"') { i = skipString(src, i) + 1; continue }
    if (c === '/' && (src[i+1] === '/' || src[i+1] === '*')) { i = skipComment(src, i); continue }
    if (isOpen(c)) return i
    i++
  }
  return i
}
function matchBlock(src, openIdx) {
  const close = src[openIdx] === '{' ? '}' : ']'
  let depth = 0
  let i = openIdx
  while (i < src.length) {
    const c = src[i]
    if (c === "'" || c === '"') { i = skipString(src, i) + 1; continue }
    if (c === '/' && (src[i+1] === '/' || src[i+1] === '*')) { i = skipComment(src, i); continue }
    if (c === '{' || c === '[') depth++
    else if (c === '}' || c === ']') {
      depth--
      if (depth === 0) return [openIdx, i + 1]
    }
    i++
  }
  throw new Error('unbalanced block')
}

const entries = []
let i = outerOpen
while (i < dataStart + warmupSrc.length) {
  const keyIdx = scan(warmupSrc, i, (c) => c === ':')
  if (keyIdx >= warmupSrc.length) break
  let k0 = keyIdx - 1
  while (k0 >= 0 && warmupSrc[k0].trim() === '') k0--
  const quote = warmupSrc[k0]
  if (quote !== '"' && quote !== "'") { i = keyIdx + 1; continue }
  const lineBefore = warmupSrc.slice(i, keyIdx)
  const keyMatch = lineBefore.match(/"([^"]+)"\s*$/)
  i = keyIdx + 1
  if (!keyMatch) continue
  const key = keyMatch[1]
  const braceIdx = scan(warmupSrc, i, (c) => c === '{' || c === '}' || c === '[')
  if (warmupSrc[braceIdx] !== '{') continue
  const [mStart, mEnd] = matchBlock(warmupSrc, braceIdx)
  const muscle = key
  let j = mStart
  while (j < mEnd) {
    const kIdx = scan(warmupSrc, j, (c) => c === ':')
    if (kIdx >= mEnd) break
    const subKey = warmupSrc.slice(j, kIdx).match(/"([^"]+)"\s*$/)
    j = kIdx + 1
    if (!subKey) { j++; continue }
    const kind = subKey[1]
    if (kind !== 'warmup' && kind !== 'stretch') continue
    const arrIdx = scan(warmupSrc, j, (c) => c === '[' || c === '{')
    if (warmupSrc[arrIdx] !== '[') continue
    const [aStart, aEnd] = matchBlock(warmupSrc, arrIdx)
    let k = aStart
    while (k < aEnd) {
      const oIdx = scan(warmupSrc, k, (c) => c === '{')
      if (oIdx >= aEnd) break
      const [oStart, oEnd] = matchBlock(warmupSrc, oIdx)
      const item = warmupSrc.slice(oStart, oEnd)
      const name = item.match(/"name"\s*:\s*"([^"]+)"/)?.[1]
      if (!name) { k = oEnd; continue }
      const field = (f) => {
        const m = item.match(new RegExp('\\b' + f + '\\s*:\\s*\'((?:\\\\.|[^\'])*)\'', 'm'))
        if (!m) return null
        return m[1].replace(/\\\\/g, '\\').replace(/\\'/g, "'")
      }
      entries.push({
        muscle, kind,
        name,
        posInicial: field('posInicial'),
        ejecucion: field('ejecucion'),
        respiracion: field('respiracion'),
        duracion: field('duracion'),
        stallbar: /\bstallbar\s*:\s*true/.test(item),
      })
      k = oEnd
    }
    j = aEnd
  }
  i = mEnd
}

console.log('parsed entries:', entries.length)

// ---- 2. IMG_MAP + WARMUP_GIF_MAP ----
const imgBlock = warmupSrc.match(/export const IMG_MAP[\s\S]*?= \{([\s\S]*?)\n\s*\}/)[1]
const imgMap = {}
for (const m of imgBlock.matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)) imgMap[m[1]] = m[2]
const gifBlock = gifsSrc.match(/export const WARMUP_GIF_MAP[\s\S]*?= \{([\s\S]*?)\n\s*\}/)[1]
const gifMap = {}
for (const m of gifBlock.matchAll(/"([^"]+)"\s*:\s*"([^"]+)"/g)) gifMap[m[1]] = m[2]

const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'
const EX_GIF_BASE = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/'

const imgNorm = new Map(Object.entries(imgMap).map(([k, v]) => [norm(k), v]))
const gifNorm = new Map(Object.entries(gifMap).map(([k, v]) => [norm(k), v]))

function slugify(name, muscle, kind) {
  const s = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${kind}-${muscle}-${s}`
}

const seen = new Set()
const rows = entries.map((e) => {
  let id = slugify(e.name, e.muscle, e.kind)
  let n = 1
  while (seen.has(id)) id = slugify(e.name, e.muscle, e.kind) + '-' + (++n)
  seen.add(id)
  const imgUrl = imgNorm.get(norm(e.name))
  const gifPath = gifNorm.get(norm(e.name))
  const image = imgUrl ? `_IMG('${imgUrl.match(/exercises\/([^/]+)\/\d\.jpg$/)?.[1] ?? imgUrl}')` : null
  return { id, ...e, image, gif: gifPath ? `_GIF('${gifPath}')` : null }
})

const noImg = rows.filter(r => !r.image).length
const noGif = rows.filter(r => !r.gif).length
console.log('entries without image:', noImg)
console.log('entries without gif:', noGif)
console.log('legacy IMG_MAP keys dropped:', Object.keys(imgMap).filter(k => !rows.some(r => norm(r.name) === norm(k))).length)

// ---- 3. Emit file ----
const lines = []
lines.push('// Warmup and stretch exercise data (single source of truth)')
lines.push('// Mirrors the exercise dictionary structure. `kind` selects the runtime pool:')
lines.push("// 'warmup' (calentamiento) or 'stretch' (estiramiento). `muscle` is the internal")
lines.push('// muscle key used by src/lib/data/warmup.ts resolution utilities.')
lines.push('')
lines.push("import { IMG_BASE, EX_GIF_BASE } from './media-bases';")
lines.push('')
lines.push("const _IMG = (p: string, n = 0): string => IMG_BASE + p + '/' + n + '.jpg'")
lines.push("const _GIF = (path: string): string => EX_GIF_BASE + path + '.gif'")
lines.push('')
lines.push('export interface WarmupEntry {')
lines.push('  id: string')
lines.push('  es: string')
lines.push("  kind: 'warmup' | 'stretch'")
lines.push('  muscle: string')
lines.push('  posInicial: string')
lines.push('  ejecucion: string')
lines.push('  respiracion: string')
lines.push('  duracion: string')
lines.push('  stallbar?: boolean')
lines.push('  image?: string')
lines.push('  gif?: string')
lines.push('}')
lines.push('')
lines.push('export const EXERCISE_WARMUP: WarmupEntry[] = [')
const MUSCLE_DISPLAY = { chest: 'Pecho', shoulders: 'Hombros', triceps: 'Tríceps', biceps: 'Bíceps', back: 'Espalda', midback: 'Espalda Media', lats: 'Dorsales', traps: 'Trapecios', quads: 'Cuádriceps', hamstrings: 'Femorales', glutes: 'Glúteos', calves: 'Gemelos', soleus: 'Sóleo', abs: 'Abdominales', forearms: 'Antebrazos', neck: 'Cuello' }
let lastMuscle = null
for (const r of rows) {
  if (r.muscle !== lastMuscle) {
    lastMuscle = r.muscle
    lines.push(`  // ── ${MUSCLE_DISPLAY[r.muscle] ?? r.muscle} ───────────────────────────────────`)
  }
  const o = [`    id: '${r.id}',`, `    es: '${r.name.replace(/'/g, "\\'")}',`, `    kind: '${r.kind}',`, `    muscle: '${r.muscle}',`]
  for (const f of ['posInicial', 'ejecucion', 'respiracion', 'duracion']) {
    if (r[f] !== null) o.push(`    ${f}: '${r[f].replace(/\\/g, '\\\\').replace(/'/g, "\\'")}',`)
  }
  if (r.stallbar) o.push('    stallbar: true,')
  if (r.image) o.push(`    image: ${r.image},`)
  if (r.gif) o.push(`    gif: ${r.gif},`)
  lines.push('  {')
  lines.push(o.join('\n'))
  lines.push('  },')
}
lines.push(']')
fs.writeFileSync('src/lib/data/exercise-warmup.ts', lines.join('\n') + '\n')
console.log('wrote src/lib/data/exercise-warmup.ts')
