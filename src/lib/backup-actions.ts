import * as Storage from '$lib/storage'
import { getAll } from '$lib/db'
import type { Exercise } from '$lib/types'
import { type ResultInfo, backupCounts, backupDateLabel, backupFileName, downloadJson, exercisesFileName, fileKindLabel, readJsonFile, sizeLabel } from '$lib/you-data'
import { plural } from '$lib/program-utils'
import { reportUnmatchedNames } from '$lib/unmatched'

function countStats(c: { workouts: number; programs: number; exercises: number }) {
  return [
    { value: c.workouts, label: 'entrenos' },
    { value: c.programs, label: 'programas' },
    { value: c.exercises, label: 'ejercicios' },
  ]
}

/** «Guardar copia»: downloads everything (same file name as always) */
export async function saveBackup(): Promise<ResultInfo> {
  try {
    const json = await Storage.exportLogsAndSettings()
    const name = backupFileName()
    downloadJson(json, name)
    return {
      ok: true,
      heading: 'Copia guardada',
      text: 'Guárdala fuera del teléfono: en iCloud Drive o mándatela por correo.',
      file: { name, meta: sizeLabel(new Blob([json]).size) },
      stats: countStats(backupCounts(JSON.parse(json))),
    }
  } catch {
    return { ok: false, heading: 'No se pudo guardar la copia', text: 'Revisa que haya espacio en el teléfono e inténtalo otra vez.' }
  }
}

/** «Restaurar una copia»: merges the file into what's on the phone */
export async function restoreBackup(file: File): Promise<ResultInfo> {
  try {
    const { text, data } = await readJsonFile(file)
    await Storage.importLogsAndSettings(text)
    await Storage.backupAll()
    const date = backupDateLabel(data)
    return {
      ok: true,
      heading: 'Copia restaurada',
      text: date ? `Se agregó lo de la copia del ${date}.` : 'Se agregó lo de la copia.',
      stats: countStats(backupCounts(data)),
    }
  } catch {
    return {
      ok: false,
      heading: 'No se pudo restaurar',
      text: 'El archivo no es una copia de esta app o está dañado. Tus datos no cambiaron.',
      file: { name: file.name, meta: fileKindLabel(file) },
    }
  }
}

/** «Ordenar con el diccionario»: forced migration; the unmatched names go to «Sin coincidencia» */
export async function sortWithDictionary(): Promise<{ result: ResultInfo; skippedNames: string[] }> {
  try {
    const r = await Storage.migrateExercisesToDictionary({ force: true })
    if (!('skippedNames' in r)) {
      return { result: { ok: false, heading: 'No se pudo ordenar', text: 'No se pudo cargar el diccionario. Tus ejercicios no cambiaron.' }, skippedNames: [] }
    }
    const skippedNames = r.skippedNames || []
    if (skippedNames.length) reportUnmatchedNames(skippedNames)
    const total = r.total ?? 0
    return {
      result: {
        ok: true,
        heading: `${total - (r.skipped ?? 0)} de ${total} ordenados`,
        text: skippedNames.length ? 'Los que no encontró se quedaron como estaban.' : 'Todos tienen ya los datos del diccionario.',
      },
      skippedNames,
    }
  } catch (err: any) {
    return { result: { ok: false, heading: 'No se pudo ordenar', text: err?.message || 'Inténtalo otra vez.' }, skippedNames: [] }
  }
}

/** «Exportar ejercicios»: only exercises, without logs */
export async function exportExercises(): Promise<ResultInfo> {
  try {
    const all = await getAll<Exercise>('exercises')
    const json = JSON.stringify(all, null, 2)
    const name = exercisesFileName()
    downloadJson(json, name)
    return {
      ok: true,
      heading: `${plural(all.length, 'ejercicio exportado', 'ejercicios exportados')}`,
      text: 'Con nombre, músculo, imagen, consejos y alternativas. Sin tus registros.',
      file: { name, meta: sizeLabel(new Blob([json]).size) },
    }
  } catch {
    return { ok: false, heading: 'No se pudo exportar', text: 'No se pudo guardar el archivo. Revisa que haya espacio en el teléfono e inténtalo otra vez.' }
  }
}
