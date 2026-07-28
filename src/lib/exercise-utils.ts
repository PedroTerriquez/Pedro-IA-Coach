export function parseRepsDefault(rep: string | number): number {
  if (typeof rep === 'number') return rep
  const m = String(rep).match(/(\d+)(?:\s*-\s*(\d+))?/)
  if (!m) return 8
  return parseInt(m[2] || m[1], 10)
}
