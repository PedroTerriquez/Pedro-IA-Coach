import type { ExerciseLog } from '$lib/types'
import { toLocalDateStr } from '$lib/calendar-utils'

/** What a ResultSheet shows after an action (backup, import, dictionary…) */
export interface ResultInfo {
  ok: boolean
  heading: string
  text?: string
  file?: { name: string; meta: string }
  stats?: { value: string | number; label: string }[]
  rows?: { label: string; value: string | number; sub?: string }[]
}

export function todayStr(): string {
  return toLocalDateStr(new Date())
}

export function backupFileName(): string {
  return `training-backup-${todayStr()}.json`
}

export function exercisesFileName(): string {
  return `ejercicios-${todayStr()}.json`
}

export function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function downloadJson(json: string, fileName: string): void {
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

/** «entrenos / programas / ejercicios» of a backup file */
export function backupCounts(data: any): { workouts: number; programs: number; exercises: number } {
  const logs: ExerciseLog[] = Array.isArray(data?.exerciseLogs) ? data.exerciseLogs : []
  return {
    workouts: new Set(logs.map(l => l.date)).size,
    programs: Array.isArray(data?.programs) ? data.programs.length : 0,
    exercises: Array.isArray(data?.exercises) ? data.exercises.length : 0,
  }
}

/** "29 de septiembre" from the backup's exportedAt, '' when missing */
export function backupDateLabel(data: any): string {
  const d = new Date(data?.exportedAt || '')
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
}

export function fileKindLabel(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (ext === 'json') return 'JSON'
  if (ext === 'txt') return 'Texto'
  return ext ? ext.toUpperCase() : 'Archivo'
}

export async function readJsonFile(file: File): Promise<{ text: string; data: any }> {
  const text = await file.text()
  return { text, data: JSON.parse(text) }
}

/** Takes the chosen file and clears the input so the same file can be picked again */
export function takeFile(e: Event): File | null {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] || null
  input.value = ''
  return file
}
