import type { Settings } from '$lib/types'
import * as Storage from '$lib/storage'
import { settings } from '$lib/stores/settings'

export type ProfileKey = 'height' | 'weight' | 'age' | 'sex' | 'goal' | 'experience' | 'occupation'
export type ProfileOption = { value: string; label: string }

interface ProfileFieldBase { key: ProfileKey; label: string; question: string }
export interface NumberField extends ProfileFieldBase { kind: 'number'; step: number; unit: string; start: number; min: number }
export interface OptionField extends ProfileFieldBase { kind: 'option'; options: ProfileOption[] }
export interface TextField extends ProfileFieldBase { kind: 'text'; lead: string }
export type ProfileField = NumberField | OptionField | TextField

// Option values are the ones already saved on the phone; only labels are new.
export const PROFILE_FIELDS: ProfileField[] = [
  { key: 'height', label: 'Estatura', question: '¿Cuánto mides?', kind: 'number', step: 1, unit: 'cm', start: 170, min: 50 },
  { key: 'weight', label: 'Peso', question: '¿Cuánto pesas?', kind: 'number', step: 0.5, unit: 'kg', start: 70, min: 20 },
  { key: 'age', label: 'Edad', question: '¿Cuántos años tienes?', kind: 'number', step: 1, unit: 'años', start: 30, min: 10 },
  { key: 'sex', label: 'Sexo', question: '¿Cuál es tu sexo?', kind: 'option', options: [
    { value: 'Masculino', label: 'Masculino' }, { value: 'Femenino', label: 'Femenino' }, { value: 'Otro', label: 'Otro' },
  ] },
  { key: 'goal', label: 'Objetivo', question: '¿Qué buscas?', kind: 'option', options: [
    { value: 'hipertrofia', label: 'Hipertrofia' }, { value: 'fuerza', label: 'Fuerza' },
    { value: 'perdida de grasa', label: 'Pérdida de grasa' }, { value: 'recomposicion', label: 'Recomposición' },
    { value: 'rendimiento', label: 'Rendimiento' },
  ] },
  { key: 'experience', label: 'Experiencia', question: '¿Cuánto llevas entrenando?', kind: 'option', options: [
    { value: 'principiante', label: 'Principiante' }, { value: 'intermedio', label: 'Intermedio' }, { value: 'avanzado', label: 'Avanzado' },
  ] },
  { key: 'occupation', label: 'Profesión', question: '¿A qué te dedicas?', kind: 'text', lead: 'Al coach le sirve para saber cuánto te mueves en el día.' },
]

export function profileValue(s: Partial<Settings>, key: ProfileKey): string {
  return String(s[key] ?? '').trim()
}

export function filledCount(s: Partial<Settings>): number {
  return PROFILE_FIELDS.filter(f => profileValue(s, f.key)).length
}

export function missingFields(s: Partial<Settings>): ProfileField[] {
  return PROFILE_FIELDS.filter(f => !profileValue(s, f.key))
}

export function optionLabel(field: ProfileField, value: string): string {
  if (field.kind !== 'option') return value
  return field.options.find(o => o.value === value)?.label || value
}

export function fieldUnit(field: ProfileField, units: string): string {
  if (field.kind !== 'number') return ''
  return field.key === 'weight' ? units : field.unit
}

/** What a Mis datos row shows; '' when the field is empty */
export function displayValue(field: ProfileField, s: Partial<Settings>): string {
  const v = profileValue(s, field.key)
  if (!v) return ''
  if (field.kind === 'option') return optionLabel(field, v)
  if (field.key === 'age') return v
  if (field.kind === 'number') return `${v} ${fieldUnit(field, s.units || 'kg')}`
  return v
}

/** "Intermedio · Hipertrofia" for the Tú header */
export function profileSubtitle(s: Partial<Settings>): string {
  const exp = PROFILE_FIELDS.find(f => f.key === 'experience')!
  const goal = PROFILE_FIELDS.find(f => f.key === 'goal')!
  return [displayValue(exp, s), displayValue(goal, s)].filter(Boolean).join(' · ')
}

export function stepNumber(value: number, step: number, dir: 1 | -1, min: number): number {
  const next = Math.round((value + dir * step) * 10) / 10
  return Math.max(min, next)
}

export async function saveProfileField(key: ProfileKey, value: string): Promise<void> {
  await settings.update({ [key]: value })
}

/**
 * Creating the first program — by any path — moves onboarding to the Today
 * steps (2–3). The Tú steps (0–1) are covered by its own first-time screen.
 */
export async function markFirstProgramCreated(): Promise<void> {
  const s = await Storage.getSettings()
  if (!s.onboarded && (s.onboardingStep ?? 0) <= 1) await settings.update({ onboardingStep: 2 })
}
