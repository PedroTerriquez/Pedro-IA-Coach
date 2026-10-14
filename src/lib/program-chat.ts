import type { Program } from '$lib/types'

/** Hidden first turn for the "new program" chat: the coach opens with a proposal */
export const GENERATE_KICKOFF = 'Con base en mi perfil y mis preferencias, dame tu propuesta inicial de enfoque para mi programa y explícame el porqué.'

/** Fixed quick replies per chat (card 13) */
export const GENERATE_CHIPS = ['Más brazo', 'Días más cortos', 'Cambiar un ejercicio']
export const IMPROVE_CHIPS = ['Tengo menos tiempo', 'Me molesta algo', 'Quiero más pierna', 'Me aburre']
export const PASTE_CHIPS = ['Pegar otra vez', 'Cambiar un ejercicio', 'Días más cortos']
export const PASTE_AGAIN_CHIP = 'Pegar otra vez'

function hello(userName?: string): string {
  return userName ? `Qué onda, ${userName}.` : 'Qué onda.'
}

export function improveGreeting(program: Program, userName?: string): string {
  return `${hello(userName)} ¿Qué te gustaría mejorar de «${program.name}»? Si acordamos cambios, armo una versión nueva y esta se queda igual.`
}

/** The pasted routine travels as the first (visible) user turn of the paste chat */
export function pasteKickoff(text: string): string {
  return text.trim()
}

export function lineCount(text: string): number {
  return text.split('\n').filter(l => l.trim()).length
}

/** "Empuje / Jalón · v2", or the next free "· vN" when that name is taken */
export function suggestedVersionName(baseName: string, takenNames: string[]): string {
  const root = baseName.replace(/\s·\sv\d+$/, '')
  const taken = new Set(takenNames.map(n => n.trim().toLowerCase()))
  let v = 2
  while (taken.has(`${root} · v${v}`.toLowerCase())) v++
  return `${root} · v${v}`
}
