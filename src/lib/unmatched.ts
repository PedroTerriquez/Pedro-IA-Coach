import { PUSH_SERVER_URL } from '$lib/config'

function normalizeUnmatched(s: string): string {
  return (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_/]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function reportUnmatchedNames(names: string[]): Promise<void> {
  if (!PUSH_SERVER_URL || names.length === 0) return
  const unique = new Map<string, string>()
  for (const raw of names) {
    const name = (raw || '').trim()
    if (!name || name.length > 64) continue
    const norm = normalizeUnmatched(name)
    if (!norm || unique.has(norm)) continue
    unique.set(norm, name)
  }
  const list = [...unique.values()]
  if (list.length === 0) return
  for (let i = 0; i < list.length; i += 200) {
    const chunk = list.slice(i, i + 200)
    try {
      const res = await fetch(`${PUSH_SERVER_URL}/api/unmatched/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names: chunk }),
      })
      if (!res.ok) console.warn('[unmatched] report falló', res.status)
    } catch (err) {
      console.warn('[unmatched] report falló', err)
    }
  }
}