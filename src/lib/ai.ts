import * as Storage from '$lib/storage'
import { generateId } from '$lib/db'
import type { Program, Settings } from '$lib/types'

import { PUSH_SERVER_URL } from '$lib/config'
import { buildAIDictionary, buildFilteredDictionary } from '$lib/brain/dictionary'
import { buildImportPrompt, buildProgramCoachPrompt, buildGeneratePrompt, type PromptLanguage } from '$lib/brain/prompts'
import { getExerciseDisplayName } from '$lib/data/exercise-dictionary'

function resolveLanguage(settings: Settings): PromptLanguage {
  return settings.language === 'en' ? 'en' : 'es'
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
        duration: d.duration_min || d.duration || 60,
        exercises,
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
  }
  return program
}

export async function importWithAI(text: string, onProgress?: (current: number, total: number, name: string) => void): Promise<Program> {
  const dictionary = buildAIDictionary()
  const settings = await Storage.getSettings()
  const language = resolveLanguage(settings)

  const res = await fetch(`${PUSH_SERVER_URL}/api/ai/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      systemPrompt: buildImportPrompt(language),
      language,
      userProfile: buildUserProfile(settings),
      dictionary
    })
  })

  if (!res.ok) throw new Error(`AI import failed: ${res.status}`)

  const data = await res.json()
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
  focus?: string
}

export async function generateProgramWithAI(overrides: ProgramOverrides = {}): Promise<Program> {
  const settings = await Storage.getSettings()
  const language = resolveLanguage(settings)
  const userProfile = buildUserProfile(settings)

  const res = await fetch(`${PUSH_SERVER_URL}/api/ai/generate-program`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userProfile,
      overrides,
      language,
      systemPrompt: buildGeneratePrompt(language),
    })
  })

  if (!res.ok) throw new Error(`AI generation failed: ${res.status}`)

  const data = await res.json()
  if (!data.weeks || data.weeks.length === 0) {
    throw new Error('La IA no pudo generar un programa válido')
  }

  const programName = data.program_name || 'Generado con IA'

  const program = await buildProgramFromAIResponse(data, { noFuzzy: true })
  program.name = programName

  await Storage.saveProgram(program)

  const s = await Storage.getSettings()
  s.activeProgramId = program.id
  s.currentWeekIdx = 0
  await Storage.saveSettings(s)

  return program
}

export async function programCoach(text: string, program: Program): Promise<{ program?: Program; message?: string; _provider?: string }> {
  const dictionary = buildAIDictionary()

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
  const language = resolveLanguage(settings)
  const userProfile = buildUserProfile(settings)

  const exerciseNames = program.weeks.flatMap(w =>
    w.days.flatMap(d => d.exercises.map(ex => exerciseMap.get(ex.exerciseId)?.name).filter(Boolean) as string[])
  )
  const filteredDictionary = buildFilteredDictionary(exerciseNames)

  const res = await fetch(`${PUSH_SERVER_URL}/api/ai/program-coach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      currentProgram: programWithNames,
      userProfile,
      language,
      systemPrompt: buildProgramCoachPrompt(language),
      dictionary: filteredDictionary,
    })
  })

  if (!res.ok) throw new Error(`Coach request failed: ${res.status}`)
  const data = await res.json()

  if (data.program && data.program.weeks && data.program.weeks.length) {
    const newProgram = await buildProgramFromAIResponse(data.program, { noFuzzy: false })

    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
    const baseName = data.program.program_name || program.name || 'Coach IA'
    newProgram.name = `${baseName} — ${stamp}`

    await Storage.saveProgram(newProgram)

    const s = await Storage.getSettings()
    s.activeProgramId = newProgram.id
    await Storage.saveSettings(s)

    return { program: newProgram, _provider: data._provider }
  }

  return { message: data.message || 'Listo.', _provider: data._provider }
}

export async function exerciseCoachChat(exerciseName: string, muscle: string, alternatives: string[], messages: { role: string; content: string }[]): Promise<{ reply: string; _provider?: string }> {
  if (!PUSH_SERVER_URL) return { reply: 'Configura push-config.js para usar el coach IA.' }

  try {
    const settings = await Storage.getSettings()
    const res = await fetch(`${PUSH_SERVER_URL}/api/ai/exercise-coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exercise_name: exerciseName,
        muscle,
        alternatives,
        messages,
        language: resolveLanguage(settings),
        userProfile: buildUserProfile(settings),
      })
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error')
    return { reply: data.reply || 'No tengo respuesta ahora.', _provider: data._provider || 'llama' }
  } catch (err: any) {
    return { reply: 'Error al contactar al coach: ' + err.message }
  }
}
