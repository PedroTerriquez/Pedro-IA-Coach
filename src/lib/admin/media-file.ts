import { IMG_BASE, EX_GIF_BASE } from '../data/exercise-dictionary'

export type LineKind = 'image' | 'gif' | 'aliases' | 'name'
export interface ChangeRequest {
  entryId: string
  kind: LineKind
  url?: string
  aliases?: string[]
  name?: string
}

export function serializedLine(line: string): LineKind | null {
  const trimmed = line.trim()
  if (/^image\s*:/.test(trimmed)) return 'image'
  if (/^gif\s*:/.test(trimmed)) return 'gif'
  return null
}

export function parseAliases(expr: string): string[] {
  const arr: string[] = []
  const re = /'((?:\\'|[^'])*)'/g
  let m: RegExpExecArray | null
  while ((m = re.exec(expr))) arr.push(m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'))
  return arr
}

export function serializeAliases(aliases: string[]): string {
  const items = aliases.map(
    (a) => `'${a.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
  )
  return `[${items.join(', ')}]`
}

export function getCurrentAliases(entryText: string): string[] | null {
  for (const line of entryText.split('\n')) {
    const t = line.trim()
    if (/^aliases\s*:/.test(t)) {
      const m = t.match(/:\s*(.+?)\s*,?\s*$/)
      if (m) return parseAliases(m[1])
    }
  }
  return null
}

export function setAliasesLine(entryText: string, aliases: string[]): string {
  const next = serializeAliases(aliases)
  const current = getCurrentAliases(entryText)
  if (current !== null && serializeAliases(current) === next) return entryText
  const lines = entryText.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()
    if (/^aliases\s*:/.test(t)) {
      const m = lines[i].match(/^(\s*)aliases\s*:/)
      const indent = m ? m[1] : '    '
      const comma = lines[i].trim().endsWith(',') ? ',' : ''
      lines[i] = `${indent}aliases: ${next}${comma}`
      return lines.join('\n')
    }
  }
  lines.push(`    aliases: ${next},`)
  return lines.join('\n')
}

function unquote(s: string): string {
  return s.replace(/\\'/g, "'").replace(/\\\\/g, '\\')
}

export function getCurrentName(entryText: string): string | null {
  for (const line of entryText.split('\n')) {
    const m = line.trim().match(/^es\s*:\s*'((?:\\'|[^'])*)'/)
    if (m) return unquote(m[1])
  }
  return null
}

export function setNameLine(entryText: string, name: string): string {
  const next = `'${name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
  if (getCurrentName(entryText) === name) return entryText
  const lines = entryText.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)es\s*:/)
    if (m) {
      const comma = lines[i].trim().endsWith(',') ? ',' : ''
      lines[i] = `${m[1]}es: ${next}${comma}`
      return lines.join('\n')
    }
  }
  return entryText
}

export function fromUrl(url: string): string {
  const s = url.trim()
  if (s.startsWith(IMG_BASE)) {
    const dir = s.slice(IMG_BASE.length)
    if (dir.endsWith('/0.jpg')) return `_IMG('${dir.slice(0, -6)}')`
    return `'${s}'`
  }
  if (s.startsWith(EX_GIF_BASE)) {
    const path = s.slice(EX_GIF_BASE.length)
    if (path.endsWith('.gif')) return `_GIF('${path.slice(0, -4)}')`
    return `'${s}'`
  }
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

export function toUrl(expression: string): string {
  const e = expression.trim()
  const img = e.match(/^_IMG\('([^']+)'\)$/)
  if (img) return IMG_BASE + img[1] + '/0.jpg'
  const gif = e.match(/^_GIF\('([^']+)'\)$/)
  if (gif) return EX_GIF_BASE + gif[1] + '.gif'
  if (e.startsWith("'") && e.endsWith("'") && e.length >= 2) return e.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\')
  return e
}

export function getCurrentValue(entryText: string, kind: LineKind): string | null {
  for (const line of entryText.split('\n')) {
    if (serializedLine(line) === kind) {
      const m = line.trim().match(/:\s*(.+?)\s*,?\s*$/)
      if (m) return toUrl(m[1])
    }
  }
  return null
}

export function replaceLineInEntry(entryText: string, kind: LineKind, url: string): string {
  const trimmed = url.trim()
  const current = getCurrentValue(entryText, kind)
  if (current !== null && current === trimmed) return entryText
  const lines = entryText.split('\n')
  let replaced = false
  const out: string[] = []
  for (const line of lines) {
    if (!replaced && serializedLine(line) === kind) {
      const m = line.match(/^(\s*)(image|gif)\s*:/)
      const indent = m ? m[1] : '    '
      const comma = line.trim().endsWith(',') ? ',' : ''
      out.push(`${indent}${kind}: ${fromUrl(trimmed)}${comma}`)
      replaced = true
    } else {
      out.push(line)
    }
  }
  if (!replaced) out.push(`    ${kind}: ${fromUrl(trimmed)}`)
  return out.join('\n')
}

function scanDepth(src: string, from: number): number {
  let inStr = false
  let esc = false
  for (let i = from; i < src.length; i++) {
    const c = src[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === "'") inStr = false
    } else if (c === "'") inStr = true
    else if (c === '{') return 1
    else if (c === '}') return 0
    else if (c === '/') {
      const n = src[i + 1]
      if (n === '/') {
        while (i < src.length && src[i] !== '\n') i++
      } else if (n === '*') {
        i += 2
        while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++
        i++
      }
    }
  }
  return 0
}

interface EntryRange { id: string; start: number; end: number }

export function findEntryRanges(src: string): EntryRange[] {
  const start = src.indexOf('export const EXERCISE_DICTIONARY')
  if (start === -1) throw new Error('EXERCISE_DICTIONARY not found')
  const ranges: EntryRange[] = []
  let i = start
  let guard = 0
  while (guard++ < 10000) {
    const open = src.indexOf('{', i)
    if (open === -1) break
    if (scanDepth(src, open) === 0) {
      i = open + 1
      continue
    }
    let close = open
    let d = 0
    do {
      if (src[close] === '{') d++
      if (src[close] === '}') d--
      close++
    } while (d > 0 && close < src.length)
    while (close < src.length && src[close] !== '\n') close++
    if (src[close] === '\n') close++
    const block = src.slice(open, close)
    if (block.includes('id:')) {
      const id = block.match(/id\s*:\s*'([^']+)'/)?.[1] ?? ''
      ranges.push({ id, start: open, end: close })
    }
    i = close
  }
  return ranges
}

export function applyFileText(src: string, changes: ChangeRequest[]): { text: string; applied: number; notFound: string[] } {
  if (!changes.length) return { text: src, applied: 0, notFound: [] }
  const ranges = findEntryRanges(src)
  const byId = new Map(ranges.map((r) => [r.id, r]))
  const byEntry = new Map<string, { range: EntryRange; changes: ChangeRequest[] }>()
  const notFound: string[] = []
  for (const c of changes) {
    const range = byId.get(c.entryId)
    if (!range) {
      notFound.push(c.entryId)
      continue
    }
    if (!byEntry.has(c.entryId)) byEntry.set(c.entryId, { range, changes: [] })
    byEntry.get(c.entryId)!.changes.push(c)
  }
  const ordered = [...byEntry.values()].sort((a, b) => b.range.start - a.range.start)
  let text = src
  let applied = 0
  for (const { range, changes } of ordered) {
    let entryText = text.slice(range.start, range.end)
    const before = entryText
    for (const c of changes) {
      const next =
        c.kind === 'aliases'
          ? setAliasesLine(entryText, c.aliases ?? [])
          : c.kind === 'name'
            ? setNameLine(entryText, c.name ?? '')
            : replaceLineInEntry(entryText, c.kind, c.url ?? '')
      if (next !== entryText) {
        entryText = next
        applied++
      }
    }
    if (entryText !== before) {
      text = text.slice(0, range.start) + entryText + text.slice(range.end)
    }
  }
  return { text, applied, notFound }
}
