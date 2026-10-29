import * as Storage from '$lib/storage'
import { generateId } from '$lib/db'
import type { Program, Settings } from '$lib/types'

import { PUSH_SERVER_URL } from '$lib/config'
import { buildAIDictionary, buildFilteredDictionary } from '$lib/brain/dictionary'
import { buildImportPrompt, buildProgramCoachPrompt, buildProgramChatPrompt, buildGenerateChatPrompt, buildGeneratePrompt, buildExerciseCoachPrompt, buildPasteChatPrompt, buildPasteCreatePrompt, buildReviewPrompt, type PromptLanguage } from '$lib/brain/prompts'
import { getExerciseDisplayName } from '$lib/data/exercise-dictionary'
import { lastAIExchange, aiExchanges } from '$lib/stores/debug'
import type { ChatTurn } from '$lib/components/CoachChat.svelte'

const LANGUAGE: PromptLanguage = 'es'

/** Strip large fields (systemPrompt, dictionary) from captured request for readability */
function leanBody(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (k === 'systemPrompt') {
      out[k] = `(prompt ${typeof v === 'string' ? v.length : '?'} chars)`
    } else if (k === 'dictionary' && Array.isArray(v)) {
      out[k] = `(${v.length} entries)`
    } else {
      out[k] = v
    }
  }
  return out
}

export async function recordIfDebug(label: string, url: string, reqBody: unknown, parsed: unknown) {
  const ts = new Date().toLocaleTimeString('es-MX')
  const endpoint = PUSH_SERVER_URL ? url.replace(PUSH_SERVER_URL, '') : url
  const lean = reqBody && typeof reqBody === 'object' && !Array.isArray(reqBody)
    ? leanBody(reqBody as Record<string, unknown>)
    : reqBody
  const exchange = { label, endpoint, request: lean, response: parsed, ts }

  if (import.meta.env.DEV) {
    console.log(`%c[AI DEBUG] ${label} → ${endpoint}`, 'color:#d4ff3a;font-weight:bold', ts)
    console.log('[AI DEBUG] request:', lean)
    console.log('[AI DEBUG] response:', parsed)
  }

  try {
    const s = await Storage.getSettings()
    if (!s.debugAI) return
    lastAIExchange.set(exchange)
    aiExchanges.record(label, exchange)
  } catch (err) {
    console.warn('[AI DEBUG] store write failed:', err)
  }
}

export function buildUserProfile(settings: Settings) {
  return {
    user_name: settings.userName || '',
    age: settings.age || '',
    sex: settings.sex || '',
    body_weight: settings.weight ? `${settings.weight}${settings.units || 'kg'}` : '',
    height_cm: settings.height || '',
    goal: settings.goal || '',
    experience: settings.experience || '',
    occupation: settings.occupation || '',
    units: settings.units || 'kg',
  }
}

async function buildProgramFromAIResponse(data: any, opts?: { noFuzzy?: boolean; onProgress?: (current: number, total: number, name: string) => void }): Promise<Program> {
  let totalExercises = 0
  for (const w of data.weeks) {
    for (const d of (w.days || [])) {
      totalExercises += (d.exercises || []).length
    }
  }

  let processed = 0
  const weeks: Program['weeks'] = []
  for (const w of data.weeks) {
    const days: Program['weeks'][0]['days'] = []
    for (const d of (w.days || [])) {
      const exercises: Program['weeks'][0]['days'][0]['exercises'] = []
      for (const ex of (d.exercises || [])) {
        processed++
        if (opts?.onProgress) opts.onProgress(processed, totalExercises, ex.exercise_name || ex.name || '')
        const exercise = await Storage.findOrCreateExerciseByName(
          ex.exercise_name || ex.name, ex.muscle || '', { noFuzzy: opts?.noFuzzy }
        )
        exercises.push({
          exerciseId: exercise.id,
          sets: ex.sets || 3,
          reps: String(ex.reps || '10'),
          rest: ex.rest_sec || ex.rest || 90,
        })
      }
      days.push({
        name: d.name || 'Día',
        subtitle: d.subtitle || '',
        exercises,
        ...(typeof d.weekday === 'number' && d.weekday >= 1 && d.weekday <= 7 ? { weekday: Math.round(d.weekday) } : {}),
      })
    }
    weeks.push({
      name: w.name || 'Semana 1',
      subtitle: w.subtitle || '',
      tag: w.tag || '',
      days,
    })
  }

  const program: Program = {
    id: await generateId(),
    name: data.program_name || 'Programa IA',
    weeks,
    createdAt: new Date().toISOString(),
  }
  return program
}

export async function importWithAI(text: string, onProgress?: (current: number, total: number, name: string) => void): Promise<Program> {
  const dictionary = buildAIDictionary()
  const settings = await Storage.getSettings()
  const language = LANGUAGE

  const reqBody = {
    text,
    systemPrompt: buildImportPrompt(language),
    language,
    userProfile: buildUserProfile(settings),
    dictionary
  }
  if (import.meta.env.DEV) console.log('[AI] importWithAI → sending', text.length, 'chars, dict', dictionary.length)
  const res = await fetch(`${PUSH_SERVER_URL}/api/ai/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reqBody)
  })

  if (!res.ok) {
    const raw = await res.text().catch(() => '')
    console.error('[AI] importWithAI ERROR', res.status, raw.slice(0, 500))
    await recordIfDebug('Importar con IA', `${PUSH_SERVER_URL}/api/ai/import`, reqBody, { error: true, status: res.status, raw })
    throw new Error(`AI import failed: ${res.status}`)
  }

  const data = await res.json()
  if (import.meta.env.DEV) console.log('[AI] importWithAI ✓', data)
  await recordIfDebug('Importar con IA', `${PUSH_SERVER_URL}/api/ai/import`, reqBody, data)
  if (!data.weeks || data.weeks.length === 0) {
    throw new Error('La IA no pudo interpretar la rutina')
  }

  const programName = data.program_name || 'Importado con IA'

  const program = await buildProgramFromAIResponse(data, { noFuzzy: true, onProgress })
  program.name = programName

  await Storage.saveProgram(program)

  const s = await Storage.getSettings()
  s.activeProgramId = program.id
  s.currentWeekIdx = 0
  await Storage.saveSettings(s)

  return program
}

export interface ProgramOverrides {
  daysPerWeek?: number
  equipment?: string
  focus?: string | string[]
  limitations?: string[]
}

function generateContextText(userProfile: ReturnType<typeof buildUserProfile>, overrides: ProgramOverrides): string {
  return 'PERFIL DEL USUARIO:\n' + JSON.stringify(userProfile)
    + '\n\nPREFERENCIAS DEL USUARIO:\n' + JSON.stringify(overrides)
}

const CREATE_PROGRAM_MESSAGE = 'Crea el programa completo con el enfoque que acordamos en esta conversación.'

function buildGenerateBody(userProfile: ReturnType<typeof buildUserProfile>, overrides: ProgramOverrides, thread: ChatTurn[]) {
  return {
    messages: [...thread, { role: 'user', content: CREATE_PROGRAM_MESSAGE }],
    systemPrompt: `${buildGeneratePrompt(LANGUAGE)}\n\n${generateContextText(userProfile, overrides)}`,
  }
}

export async function generateProgramChat(thread: ChatTurn[], overrides: ProgramOverrides): Promise<{ reply: string; _provider?: string }> {
  const settings = await Storage.getSettings()
  const context = generateContextText(buildUserProfile(settings), overrides)
  return postProgramChat('Generar programa (chat)', { messages: thread, systemPrompt: buildGenerateChatPrompt(LANGUAGE, context) })
}

async function saveAndActivate(program: Program, resetWeek: boolean): Promise<void> {
  await Storage.saveProgram(program)
  const s = await Storage.getSettings()
  s.activeProgramId = program.id
  if (resetWeek) s.currentWeekIdx = 0
  await Storage.saveSettings(s)
}

const REVIEW_MESSAGE = 'Revisa este borrador y devuelve el programa corregido.'

/** Second pass: the same coach audits the draft (redundant same-muscle work, excess volume, overlap) */
function buildReviewBody(thread: ChatTurn[], context: string, draft: unknown) {
  return {
    messages: [...thread, { role: 'user' as const, content: 'BORRADOR:\n' + JSON.stringify(draft) + '\n\n' + REVIEW_MESSAGE }],
    systemPrompt: buildReviewPrompt(LANGUAGE, context),
  }
}

/** Returns the reviewed program, or the draft itself when the review fails or comes back empty */
async function reviewProgram(thread: ChatTurn[], context: string, draft: any): Promise<any> {
  const url = `${PUSH_SERVER_URL}/api/ai/generate-program`
  const reqBody = buildReviewBody(thread, context, draft)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody)
    })
    const data = res.ok ? await res.json() : { error: true, status: res.status }
    await recordIfDebug('Revisar programa', url, reqBody, data)
    return data.weeks?.length ? data : draft
  } catch (err) {
    console.warn('[AI] reviewProgram failed, keeping the draft:', err)
    return draft
  }
}

export type AIPhase = 'draft' | 'review'

/** POSTs to /api/ai/generate-program and saves + activates the program it returns */
async function createProgramFromGenerate(label: string, reqBody: { messages: ChatTurn[]; systemPrompt: string }, fallbackName: string, review?: { thread: ChatTurn[]; context: string; onphase?: (phase: AIPhase) => void }): Promise<Program> {
  const url = `${PUSH_SERVER_URL}/api/ai/generate-program`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reqBody)
  })

  if (!res.ok) {
    const raw = await res.text().catch(() => '')
    console.error(`[AI] ${label} ERROR`, res.status, raw.slice(0, 500))
    await recordIfDebug(label, url, reqBody, { error: true, status: res.status, raw })
    throw new Error(`AI generation failed: ${res.status}`)
  }

  const draft = await res.json()
  if (import.meta.env.DEV) console.log(`[AI] ${label} ✓`, draft)
  await recordIfDebug(label, url, reqBody, draft)
  if (!draft.weeks || draft.weeks.length === 0) {
    throw new Error('La IA no pudo generar un programa válido')
  }

  review?.onphase?.('review')
  const data = review ? await reviewProgram(review.thread, review.context, draft) : draft
  const program = await buildProgramFromAIResponse(data, { noFuzzy: true })
  program.name = data.program_name || fallbackName
  await saveAndActivate(program, true)
  return program
}

/** Turns the agreed conversation into a new saved + activated program */
export async function generateProgramWithAI(overrides: ProgramOverrides, thread: ChatTurn[], onphase?: (phase: AIPhase) => void): Promise<Program> {
  const settings = await Storage.getSettings()
  const userProfile = buildUserProfile(settings)
  const reqBody = buildGenerateBody(userProfile, overrides, thread)
  const context = generateContextText(userProfile, overrides) + '\n\nDICCIONARIO DE EJERCICIOS:\n' + JSON.stringify(buildAIDictionary().map(e => e.es))
  return createProgramFromGenerate('Generar programa', reqBody, 'Generado con IA', { thread, context, onphase })
}

async function pasteContextText(): Promise<string> {
  const settings = await Storage.getSettings()
  return 'PERFIL DEL USUARIO:\n' + JSON.stringify(buildUserProfile(settings))
    + '\n\nDICCIONARIO DE EJERCICIOS:\n' + JSON.stringify(buildAIDictionary().map(e => e.es))
}

/** "Pega tu rutina": the first user turn is the pasted text; the coach describes what it understood */
export async function pasteRoutineChat(thread: ChatTurn[]): Promise<{ reply: string; _provider?: string }> {
  return postProgramChat('Pega tu rutina (chat)', { messages: thread, systemPrompt: buildPasteChatPrompt(LANGUAGE, await pasteContextText()) })
}

/** Builds, saves and activates the program agreed in the "Pega tu rutina" chat */
export async function createProgramFromPaste(thread: ChatTurn[]): Promise<Program> {
  const reqBody = {
    messages: [...thread, { role: 'user', content: CREATE_PROGRAM_MESSAGE }],
    systemPrompt: buildPasteCreatePrompt(LANGUAGE, await pasteContextText()),
  }
  return createProgramFromGenerate('Pega tu rutina', reqBody, 'Mi rutina')
}

async function buildProgramContext(program: Program) {
  const exercises = await Storage.getExercises()
  const exerciseMap = new Map(exercises.map(e => [e.id, e]))

  const programWithNames = JSON.parse(JSON.stringify(program))
  for (const week of programWithNames.weeks || []) {
    for (const day of week.days || []) {
      for (const ex of day.exercises || []) {
        const resolved = exerciseMap.get(ex.exerciseId)
        if (resolved) {
          ex.name = getExerciseDisplayName(resolved)
          ex.muscle = resolved.muscle
        }
      }
    }
  }

  const settings = await Storage.getSettings()
  const userProfile = buildUserProfile(settings)

  const exerciseNames = program.weeks.flatMap(w =>
    w.days.flatMap(d => d.exercises.map(ex => exerciseMap.get(ex.exerciseId)?.name).filter(Boolean) as string[])
  )
  const dictionary = buildFilteredDictionary(exerciseNames)

  return { programWithNames, userProfile, dictionary }
}

function programContextText(ctx: Awaited<ReturnType<typeof buildProgramContext>>): string {
  return 'PROGRAMA ACTUAL:\n' + JSON.stringify(ctx.programWithNames)
    + '\n\nPERFIL DEL USUARIO:\n' + JSON.stringify(ctx.userProfile)
    + '\n\nDICCIONARIO DE EJERCICIOS:\n' + JSON.stringify(ctx.dictionary)
}

const APPLY_CHANGES_MESSAGE = 'Aplica los cambios que acordamos en esta conversación y devuelve el programa completo.'

function buildProgramCoachBody(ctx: Awaited<ReturnType<typeof buildProgramContext>>, thread: ChatTurn[]) {
  return {
    messages: [...thread, { role: 'user', content: APPLY_CHANGES_MESSAGE }],
    systemPrompt: `${buildProgramCoachPrompt(LANGUAGE)}\n\n${programContextText(ctx)}`,
  }
}

async function postProgramChat(label: string, reqBody: { messages: ChatTurn[]; systemPrompt: string }): Promise<{ reply: string; _provider?: string }> {
  const url = `${PUSH_SERVER_URL}/api/ai/program-chat`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody)
    })
    const data = await res.json()
    await recordIfDebug(label, url, reqBody, res.ok ? data : { error: true, status: res.status, raw: data })
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
    return { reply: data.reply || 'No tengo respuesta ahora.', _provider: data._provider }
  } catch (err: any) {
    return { reply: 'Error al contactar al coach: ' + err.message }
  }
}

export async function programCoachChat(thread: ChatTurn[], program: Program): Promise<{ reply: string; _provider?: string }> {
  const ctx = await buildProgramContext(program)
  return postProgramChat('Coach de programa (chat)', { messages: thread, systemPrompt: buildProgramChatPrompt(LANGUAGE, programContextText(ctx)) })
}

export interface NewVersionOptions {
  /** Name chosen in the "Versión nueva" sheet */
  name: string
  /** "Usarla desde hoy" */
  activate: boolean
}

/** Creates a new version of the program with the changes agreed in the conversation; the original stays untouched */
export async function programCoach(program: Program, thread: ChatTurn[], opts: NewVersionOptions): Promise<{ program?: Program; message?: string; _provider?: string }> {
  const ctx = await buildProgramContext(program)
  const reqBody = buildProgramCoachBody(ctx, thread)
  if (import.meta.env.DEV) console.log('[AI] programCoach → sending', thread.length, 'turns, dict', ctx.dictionary.length)
  const res = await fetch(`${PUSH_SERVER_URL}/api/ai/program-coach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reqBody)
  })

  if (!res.ok) {
    const raw = await res.text().catch(() => '')
    console.error('[AI] programCoach ERROR', res.status, raw.slice(0, 500))
    await recordIfDebug('Coach de programa', `${PUSH_SERVER_URL}/api/ai/program-coach`, reqBody, { error: true, status: res.status, raw })
    throw new Error(`Coach request failed: ${res.status}`)
  }
  const data = await res.json()
  if (import.meta.env.DEV) console.log('[AI] programCoach ✓', data)
  await recordIfDebug('Coach de programa', `${PUSH_SERVER_URL}/api/ai/program-coach`, reqBody, data)

  if (data.program && data.program.weeks && data.program.weeks.length) {
    const reviewed = await reviewProgram(thread, programContextText(ctx), data.program)
    const newProgram = await buildProgramFromAIResponse(reviewed, { noFuzzy: false })
    newProgram.name = opts.name.trim() || program.name
    if (opts.activate) await saveAndActivate(newProgram, false)
    else await Storage.saveProgram(newProgram)
    return { program: newProgram, _provider: data._provider }
  }

  return { message: data.message || 'Listo.', _provider: data._provider }
}

export async function exerciseCoachChat(exerciseName: string, muscle: string, alternatives: string[], messages: { role: string; content: string }[]): Promise<{ reply: string; _provider?: string }> {
  if (!PUSH_SERVER_URL) return { reply: 'Configura push-config.js para usar el coach IA.' }

  try {
    const settings = await Storage.getSettings()
    const userProfile = buildUserProfile(settings)
    const systemPrompt = buildExerciseCoachPrompt(exerciseName, muscle, alternatives, userProfile)
    const reqBody = {
      messages,
      systemPrompt,
    }
    const url = `${PUSH_SERVER_URL}/api/ai/exercise-coach`
    if (import.meta.env.DEV) console.log('[AI] exerciseCoachChat → sending', messages.length, 'messages')
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody)
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('[AI] exerciseCoachChat ERROR', res.status, data)
      await recordIfDebug('Coach de ejercicio', url, reqBody, { error: true, status: res.status, raw: data })
      throw new Error(data.error || 'Error')
    }
    if (import.meta.env.DEV) console.log('[AI] exerciseCoachChat ✓', data)
    await recordIfDebug('Coach de ejercicio', url, reqBody, data)
    return { reply: data.reply || 'No tengo respuesta ahora.', _provider: data._provider || 'llama' }
  } catch (err: any) {
    return { reply: 'Error al contactar al coach: ' + err.message }
  }
}
