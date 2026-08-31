import { getAll, get, put, del, getByIndex, generateId } from './db'
import type { Exercise, ExerciseLog, ExerciseLogBlock, GymSession, Program, Settings } from './types'

import { findExerciseEntry, findExerciseEntryFuzzy } from '$lib/data/exercise-dictionary'
import { mondayOf } from '$lib/calendar-utils'
import { toast } from '$lib/stores/ui'

function toLocalDateStr(date: Date): string {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return d.toISOString().slice(0, 10)
}
function getToday(): string { return toLocalDateStr(new Date()) }

export function showToast(message: string, isError = false): void {
  toast.show(message, isError)
}

const BACKUP_PREFIX = 'idb_backup_'

export async function backupAll(): Promise<void> {
  try {
    const data = {
      exercises: await getAll('exercises'),
      exerciseLogs: await getAll('exerciseLogs'),
      programs: await getAll('programs'),
      gymSessions: await getAll('gymSessions'),
      settings: [(await get('settings', 'settings'))].filter(Boolean),
    }
    for (const key of Object.keys(data)) {
      localStorage.setItem(BACKUP_PREFIX + key, JSON.stringify(data[key as keyof typeof data]))
    }
    localStorage.setItem('hasUsedApp', 'true')
    localStorage.setItem('lastBackupDate', new Date().toISOString())
  } catch (e: any) {
    showToast('⚠️ Backup automático falló: ' + e.message, true)
  }
}

export async function restoreFromBackup(): Promise<void> {
  const stores = ['exercises', 'exerciseLogs', 'programs', 'settings', 'gymSessions']
  for (const store of stores) {
    const raw = localStorage.getItem(BACKUP_PREFIX + store)
    if (!raw) continue
    try {
      const items = JSON.parse(raw)
      for (const item of items) {
        await put(store, item)
      }
    } catch (e: any) {
      showToast('⚠️ No se pudo restaurar ' + store + ': ' + e.message, true)
    }
  }
  showToast('✅ Datos recuperados desde backup automático')
}

// ── Exercises ──
export async function getExercises(): Promise<Exercise[]> {
  return getAll<Exercise>('exercises')
}

export async function getExercise(id: string): Promise<Exercise | undefined> {
  return get<Exercise>('exercises', id)
}

export async function saveExercise(exercise: Exercise): Promise<IDBValidKey> {
  return put('exercises', exercise)
}

export async function deleteExercise(id: string): Promise<void> {
  const logs = await getByIndex<ExerciseLog>('exerciseLogs', 'exerciseId', id)
  const programs = await getAll<Program>('programs')
  for (const log of logs) {
    await del('exerciseLogs', log.id)
  }
  for (const prog of programs) {
    let changed = false
    for (const week of prog.weeks) {
      for (const day of week.days) {
        const before = day.exercises.length
        day.exercises = day.exercises.filter((e) => e.exerciseId !== id)
        if (day.exercises.length !== before) changed = true
      }
    }
    if (changed) await put('programs', prog)
  }
  await del('exercises', id)
}

// opts.noFuzzy: skip fuzzy matching, use only exact/alias dictionary lookup.
// Used by AI import, where the AI already picked the exact dictionary name.
export async function findOrCreateExerciseByName(name: string, muscle: string, opts: { noFuzzy?: boolean } = {}): Promise<Exercise> {
  const all = await getAll<Exercise>('exercises')
  const lookup = (n: string) => {
    if (typeof findExerciseEntry !== 'function') return null
    return findExerciseEntry(n) || (opts.noFuzzy ? null : findExerciseEntryFuzzy(n))
  }

  if (name.includes(' / ')) {
    const parts = name.split(' / ').map(s => s.trim()).filter(Boolean)
    for (const part of parts) {
      const entry = lookup(part)
      if (entry) {
        for (const other of parts) {
          if (other !== part) {
            const otherEntry = lookup(other)
            if (!otherEntry && !all.find(e => e.name.toLowerCase() === other.toLowerCase())) {
              const ex: Exercise = { id: await generateId(), name: other, dictId: '', muscle, imgUrl: '', gifUrl: '', tips: [], alternatives: [] }
              await put('exercises', ex)
            }
          }
        }
        name = part
        break
      }
    }
  }

  const dictEntry = lookup(name)
  const dictId = dictEntry ? 'dict_' + dictEntry.id : null

  if (dictId) {
    const existing = all.find((e) => e.dictId === dictId)
    if (existing) return existing
  }

  const match = all.find((e) => e.name.toLowerCase() === name.toLowerCase())
  if (match) return match

  const imgUrl = dictEntry?.image || ''
  const gifUrl = dictEntry?.gif || ''
  const exercise: Exercise = {
    id: await generateId(), name, dictId: dictId || undefined,
    muscle: muscle || dictEntry?.muscle || '', imgUrl, gifUrl,
    tips: dictEntry?.tips ? [...dictEntry.tips] : [],
    alternatives: dictEntry?.alternatives ? dictEntry.alternatives.map((a: any) => ({ ...a })) : []
  }
  await put('exercises', exercise)
  return exercise
}

// ── Exercise Logs ──
export async function getLogsForExercise(exerciseId: string): Promise<ExerciseLog[]> {
  const all = await getAll<ExerciseLog>('exerciseLogs')
  return all.filter(l => l.exerciseId === exerciseId)
}

export async function logWeight(exerciseId: string, weight: number, units: string, sets?: number, reps?: string, dateStr?: string, blocks?: ExerciseLogBlock[]): Promise<IDBValidKey> {
  dateStr = dateStr || getToday()
  const all = await getAll<ExerciseLog>('exerciseLogs')
  const existing = all.find(l => l.exerciseId === exerciseId && l.date === dateStr)
  const log: ExerciseLog = {
    id: existing ? existing.id : await generateId(),
    exerciseId,
    date: dateStr,
    weight,
    units,
  }
  if (sets !== undefined) log.sets = sets
  if (reps !== undefined) log.reps = reps
  if (blocks !== undefined && blocks.length) log.blocks = blocks
  return put('exerciseLogs', log)
}

export async function getAllLogs(): Promise<ExerciseLog[]> {
  return getAll<ExerciseLog>('exerciseLogs')
}

export async function getLogsForDate(dateStr: string): Promise<ExerciseLog[]> {
  const all = await getAll<ExerciseLog>('exerciseLogs')
  return all.filter((l) => l.date === dateStr)
}

// ── Gym Sessions (weekly gym time) ──
// One record per training day, keyed by the date. The running weekly total is
// recomputed from all records whose weekStart matches the current Monday, so a
// new week naturally resets to 0 without any cleanup job.
export async function recordGymSession(date: string, seconds: number): Promise<void> {
  if (!date || seconds <= 0) return
  await put('gymSessions', { id: date, date, seconds, weekStart: mondayOf(date) })
}

export async function getWeeklyGymSeconds(weekStart: string): Promise<number> {
  const all = await getAll<GymSession>('gymSessions')
  return all
    .filter((g) => g.weekStart === weekStart)
    .reduce((sum, g) => sum + (g.seconds || 0), 0)
}

export async function getAllGymSessions(): Promise<GymSession[]> {
  return getAll<GymSession>('gymSessions')
}

// ── Programs ──
export async function getPrograms(): Promise<Program[]> {
  return getAll<Program>('programs')
}

export async function getProgram(id: string): Promise<Program | undefined> {
  return get<Program>('programs', id)
}

export async function saveProgram(program: Program): Promise<void> {
  const existing = await get<Program>('programs', program.id)
  await put('programs', program)
  if (!existing) {
    await migrateExercisesToDictionary({ force: false })
  } else {
    backupAll()
  }
}

export async function deleteProgram(id: string): Promise<void> {
  return del('programs', id) as Promise<void>
}

// ── Settings ──
export async function getSettings(): Promise<Settings> {
  const s = await get<Settings>('settings', 'settings')
  // Self-heal: an all-identity override [0..6] is redundant by definition, and
  // worse, it masks a week's intrinsic weekday placement forever. Older builds
  // persisted one every time Reprogramar was confirmed without changes or after
  // Restablecer — drop them so weekday fields control placement again.
  if (s && s.rescheduleWeekOrder) {
    const rs = { ...(s.rescheduleWeekOrder as Record<string, number[]>) }
    let removed = false
    for (const k of Object.keys(rs)) {
      const v = rs[k]
      if (Array.isArray(v) && v.length === 7 && v.every((x, i) => x === i)) {
        delete rs[k]
        removed = true
      }
    }
    if (removed) {
      s.rescheduleWeekOrder = rs
      await put('settings', s)
    }
  }
  if (s && s.onboarded === undefined) {
    const programs = await getAll<Program>('programs')
    const hasProfile = s.age && s.age !== ''
    const hasPrograms = programs.length > 0
    if (hasProfile || hasPrograms) {
      s.onboarded = true
      s.onboardingStep = -1
      await put('settings', s)
    }
  }
  return s || {
    id: 'settings', activeProgramId: null, currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', userName: 'Pedro', height: '', weight: '',
    sex: '', age: '', goal: '', experience: '', occupation: '',
    pushServerUrl: '', pushSubscribed: false, hasWatch: false,
    lastCoachAnalysis: null, lastUpdate: '', sessionState: null,
    rescheduleWeekOrder: {}, username: '', language: 'es', fontScale: 1,
    onboarded: false, onboardingStep: 0
  }
}

export async function saveSettings(settings: Partial<Settings>): Promise<IDBValidKey> {
  const result = await put('settings', { ...settings, id: 'settings' })
  backupAll()
  return result
}

export async function saveCoachAnalysis(analysis: any): Promise<void> {
  const s = await getSettings()
  s.lastCoachAnalysis = analysis
  await saveSettings(s)
}

export async function getCoachAnalysis(): Promise<any> {
  const s = await getSettings()
  return s.lastCoachAnalysis || null
}

// ── Today's exercise swaps (alternatives) ──
// Scoped to today's date only: once `date` no longer matches, the swap is treated as empty.
// No cleanup job needed — it self-invalidates on read.
export async function getTodaySwaps(): Promise<Record<string, string>> {
  const s = await getSettings()
  return (s.todaySwaps && s.todaySwaps.date === getToday()) ? s.todaySwaps.swaps : {}
}

export async function swapExerciseForToday(originalExerciseId: string, altExerciseId: string): Promise<Record<string, string>> {
  const s = await getSettings()
  const current = (s.todaySwaps && s.todaySwaps.date === getToday()) ? s.todaySwaps.swaps : {}
  const swaps = { ...current, [originalExerciseId]: altExerciseId }
  await saveSettings({ ...s, todaySwaps: { date: getToday(), swaps } })
  return swaps
}

export async function revertExerciseSwapForToday(originalExerciseId: string): Promise<Record<string, string>> {
  const s = await getSettings()
  const current = (s.todaySwaps && s.todaySwaps.date === getToday()) ? s.todaySwaps.swaps : {}
  const { [originalExerciseId]: _removed, ...swaps } = current
  await saveSettings({ ...s, todaySwaps: { date: getToday(), swaps } })
  return swaps
}

// ── Dictionary Migration ──
export async function _assignDictIdsAndNormalize(exercises: Exercise[], force: boolean) {
  let migrated = 0, skipped = 0
  const skippedNames: string[] = []
  for (const ex of exercises) {
    const dictEntry = findExerciseEntry(ex.name) || findExerciseEntryFuzzy(ex.name)
    if (!dictEntry) { skipped++; skippedNames.push(ex.name); continue }

    let changed = false
    const dictId = 'dict_' + dictEntry.id

    if (ex.dictId !== dictId) { ex.dictId = dictId; changed = true }

    if (force || ex.name !== dictEntry.es) {
      if (ex.name !== dictEntry.es) { ex.name = dictEntry.es; changed = true }
    }
    if ((force || !ex.imgUrl) && dictEntry.image) {
      ex.imgUrl = dictEntry.image; changed = true
    }
    if ((force || !ex.gifUrl) && dictEntry.gif) {
      ex.gifUrl = dictEntry.gif; changed = true
    }
    if ((force || !ex.muscle) && dictEntry.muscle) {
      ex.muscle = dictEntry.muscle; changed = true
    }
    if ((force || !ex.tips || ex.tips.length === 0) && dictEntry.tips && dictEntry.tips.length > 0) {
      ex.tips = [...dictEntry.tips]; changed = true
    }
    if ((force || !ex.alternatives || ex.alternatives.length === 0) && dictEntry.alternatives && dictEntry.alternatives.length > 0) {
      ex.alternatives = dictEntry.alternatives.map((a: any) => ({ ...a })); changed = true
    }
    if (ex.alternatives && ex.alternatives.length > 0) {
      for (const alt of ex.alternatives) {
        const altDict = findExerciseEntry(alt.name)
        if (altDict && alt.name !== altDict.es) {
          alt.name = altDict.es; changed = true
        }
      }
    }

    if (changed) {
      await put('exercises', ex)
      migrated++
    }
  }
  return { migrated, skipped, skippedNames }
}

export async function _getDedupGroups() {
  const exercises = await getAll<Exercise>('exercises')
  const map = new Map<string, Exercise[]>()
  for (const ex of exercises) {
    const key = ex.dictId || ex.name.toLowerCase()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(ex)
  }
  return [...map.values()].filter((g) => g.length > 1)
}

export async function _pickRoot(group: Exercise[]) {
  const counts = await Promise.all(
    group.map(async (ex) => {
      const logs = await getByIndex<ExerciseLog>('exerciseLogs', 'exerciseId', ex.id)
      return { ex, logCount: logs.length }
    })
  )
  counts.sort((a, b) => b.logCount - a.logCount)
  return counts[0].ex
}

export async function _reassignLogs(sourceId: string, rootId: string) {
  const sourceLogs = await getByIndex<ExerciseLog>('exerciseLogs', 'exerciseId', sourceId)
  const rootLogs = await getByIndex<ExerciseLog>('exerciseLogs', 'exerciseId', rootId)
  const rootByDate = new Map(rootLogs.map((l) => [l.date, l]))
  let moved = 0
  for (const log of sourceLogs) {
    const existing = rootByDate.get(log.date)
    if (existing) {
      if ((log.weight || 0) > (existing.weight || 0)) {
        existing.weight = log.weight
        existing.units = log.units
        if (log.sets !== undefined) existing.sets = log.sets
        if (log.reps !== undefined) existing.reps = log.reps
        await put('exerciseLogs', existing)
      }
      await del('exerciseLogs', log.id)
    } else {
      log.exerciseId = rootId
      await put('exerciseLogs', log)
      rootByDate.set(log.date, log)
      moved++
    }
  }
  return moved
}

export async function _reassignProgramRefs(sourceId: string, rootId: string) {
  const programs = await getAll<Program>('programs')
  for (const prog of programs) {
    let changed = false
    for (const week of prog.weeks) {
      for (const day of week.days) {
        for (const ex of day.exercises) {
          if (ex.exerciseId === sourceId) {
            ex.exerciseId = rootId
            changed = true
          }
        }
      }
    }
    if (changed) await put('programs', prog)
  }
}

async function _deleteExerciseSafe(id: string) {
  await del('exercises', id)
}

export async function _deduplicateGroup(group: Exercise[]) {
  const root = await _pickRoot(group)
  let merged = 0
  for (const ex of group) {
    if (ex.id === root.id) continue
    await _reassignLogs(ex.id, root.id)
    await _reassignProgramRefs(ex.id, root.id)
    await _deleteExerciseSafe(ex.id)
    merged++
  }
  return merged
}

export async function migrateExercisesToDictionary({ force = false } = {}) {
  if (typeof findExerciseEntry !== 'function') return { migrated: 0, merged: 0, skipped: 0, total: 0, dictMissing: true }

  const exercises = await getAll<Exercise>('exercises')

  const { migrated, skipped, skippedNames } = await _assignDictIdsAndNormalize(exercises, force)

  const groups = await _getDedupGroups()
  let merged = 0
  for (const group of groups) {
    merged += await _deduplicateGroup(group)
  }

  await backupAll()
  return { migrated, merged, skipped, total: exercises.length, skippedNames }
}

// ── JSON Export/Import ──
export async function exportLogsAndSettings(): Promise<string> {
  const data = {
    exercises: await getAll('exercises'),
    programs: await getAll('programs'),
    exerciseLogs: await getAll('exerciseLogs'),
    gymSessions: await getAll('gymSessions'),
    settings: await get('settings', 'settings') || null,
    exportedAt: new Date().toISOString(),
  }
  return JSON.stringify(data, null, 2)
}

export async function importLogsAndSettings(jsonStr: string) {
  const data = JSON.parse(jsonStr)
  if (!data.exerciseLogs && !data.exercises && !data.programs) {
    throw new Error('JSON inválido — no contiene datos')
  }
  if (data.exercises) for (const item of data.exercises) await put('exercises', item)
  if (data.programs) for (const item of data.programs) await put('programs', item)
  if (data.exerciseLogs) for (const item of data.exerciseLogs) await put('exerciseLogs', item)
  if (data.gymSessions) for (const item of data.gymSessions) await put('gymSessions', item)
  if (data.settings) await put('settings', data.settings)
  return {
    exercises: (data.exercises || []).length,
    programs: (data.programs || []).length,
    logs: (data.exerciseLogs || []).length,
  }
}
