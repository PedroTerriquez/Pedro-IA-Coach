import type { Program } from '$lib/types'

/** Hidden first turn for the "new program" chat: the coach opens with a proposal */
export const GENERATE_KICKOFF = 'Con base en mi perfil y mis preferencias, dame tu propuesta inicial de enfoque para mi programa y explícame el porqué.'

function hello(userName?: string): string {
  return userName ? `¡Qué onda ${userName}! 👋` : '¡Qué onda! 👋'
}

export function improveGreeting(program: Program, userName?: string): string {
  const days = program.weeks[0]?.days.length || 0
  const daysText = days ? ` (${days} días por semana)` : ''
  return `${hello(userName)} Vamos a revisar «${program.name}»${daysText}. Cuéntame qué te gusta, qué no te late o qué quieres cambiar, y lo platicamos. Cuando estemos de acuerdo, toca «Aplicar cambios».`
}

export function generateGreeting(userName?: string): string {
  return `${hello(userName)} Déjame revisar tu perfil y lo que seleccionaste para proponerte un enfoque. Lo platicamos y, cuando estemos de acuerdo, toca «Crear programa».`
}
