// Options of Tú › Ajustes. Accent presets are hex so the views that still
// append alpha (`${accent}22`) keep working.
export const FONT_SCALES = [
  { value: 1, label: 'Normal', style: '' },
  { value: 1.15, label: 'Grande', style: 'font-size:18px;min-height:60px' },
  { value: 1.3, label: 'Extra grande', style: 'font-size:20px;min-height:64px' },
]

export const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
]

export const ACCENT_PRESETS = [
  { name: 'Lima', color: '#d4ff3a' },
  { name: 'Cian', color: '#49eaf2' },
  { name: 'Naranja', color: '#ffa44e' },
  { name: 'Rosa', color: '#fe8dc5' },
  { name: 'Violeta', color: '#b89eff' },
]

export function fontScaleLabel(scale: number | undefined): string {
  return FONT_SCALES.find(f => f.value === (scale || 1))?.label || 'Normal'
}

export function languageLabel(lang: string | undefined): string {
  return LANGUAGES.find(l => l.value === (lang || 'es'))?.label || 'Español'
}

export type NotifState = 'default' | 'granted' | 'denied' | 'unsupported'

export function notificationState(): NotifState {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission as NotifState
}

export function notificationRow(state: NotifState): { value: string; sub: string } {
  if (state === 'granted') return { value: 'Activadas', sub: '' }
  if (state === 'denied') return { value: 'Desactivadas', sub: 'Actívalas en Ajustes del iPhone' }
  if (state === 'unsupported') return { value: 'No disponibles', sub: 'Instala la app para recibirlas' }
  return { value: 'Sin activar', sub: 'Te avisa al terminar el descanso' }
}
