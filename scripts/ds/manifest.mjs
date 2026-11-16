// Rebuilds design-system/_ds_manifest.json, the index Claude Design's panel lists cards from.
// Uploading card files is not enough: without this file updated the panel keeps showing the old list.
//   node scripts/ds/manifest.mjs        (after build.mjs; then upload _ds_manifest.json too)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { OUT_DIR } from './capture.mjs'
const dir = OUT_DIR.replace(/\/$/, '')

function* htmlFiles(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name)
    if (e.isDirectory()) yield* htmlFiles(p)
    else if (e.name.endsWith('.html')) yield p
  }
}
/** Every local card, described by its first-line @dsCard comment. */
const assets = [...htmlFiles(dir)].flatMap((file) => {
  const line = readFileSync(file, 'utf8').split('\n', 1)[0]
  if (!line.includes('@dsCard')) return []
  const attr = (k) => line.match(new RegExp(`${k}="([^"]*)"`))?.[1]
  const [width, height] = attr('viewport').split('x').map(Number)
  return [{ path: relative(dir, file), group: attr('group'), name: attr('name'), subtitle: attr('subtitle'), viewport: { width, height } }]
})
const ORDER = ['Hoy', 'Nuevo · Hoy actividades', 'Nuevo · Aviso de entreno', 'Nuevo · Sesión abierta', 'Nuevo · Hoy reloj de sesión', 'Temporizador', 'Nuevo · Temporizador', 'Detalle de ejercicio', 'Plan', 'Historial', 'Amigos', 'Tú', 'Shell', 'Compartidos']
// Cards made by hand in Claude Design have no local file: list them here as
// { path, group, viewport, name, subtitle }.
const NT = 'Nuevo · Temporizador'
const nt = (p, name, subtitle, viewport = '390x844') => ({ path: `vistas/nuevo-temporizador/${p}/index.html`, group: NT, viewport, name, subtitle })
const HA = 'Nuevo · Hoy actividades'
const ha = (p, name, subtitle, viewport = '800x930') => ({ path: `vistas/nuevo-hoy-actividades/${p}/index.html`, group: HA, viewport, name, subtitle })
const sa = (p, name, subtitle, viewport = '800x930') => ({ path: `vistas/nuevo-sesion-abierta/${p}/index.html`, group: 'Nuevo · Sesión abierta', viewport, name, subtitle })
const rs = (p, name, subtitle, viewport = '800x930') => ({ path: `vistas/nuevo-hoy-reloj-sesion/${p}/index.html`, group: 'Nuevo · Hoy reloj de sesión', viewport, name, subtitle })
const handMade = [
  rs('01-reloj-header', 'Nuevo · PageHeader · reloj de sesión', 'en sesión, en pausa por ti y sin actividad (sin cambios), lado a lado', '800x760'),
  rs('02-hoy-en-sesion', 'Nuevo · Hoy · reloj en sesión', 'el reloj se ve tocable sin ser botón; el dock sigue siendo la acción'),
  rs('03-hoja-en-sesion', 'Nuevo · Reloj de sesión · en sesión', 'hoja corta: tiempo grande, Pausar y Reiniciar'),
  rs('04-confirma-pausar', 'Nuevo · Reloj de sesión · ¿Pausar?', 'confirm en línea: Cancelar a la izquierda, Pausar a la derecha'),
  rs('05-hoy-en-pausa', 'Nuevo · Hoy · reloj en pausa', 'píldora blanca «En pausa»; registrar una serie lo reanuda solo'),
  rs('06-hoja-en-pausa', 'Nuevo · Reloj de sesión · en pausa', 'Reanudar sin confirmar; Reiniciar sigue disponible'),
  rs('07-confirma-reiniciar', 'Nuevo · Reloj de sesión · ¿Reiniciar?', 'dice que vuelve a 00:00 y que las series se quedan'),
  nt('alternativa', 'Nuevo · Alternativa «Un toque»', 'la pantalla se vacía con el tiempo; registrar igual que la última vez es un solo toque'),
  nt('cambios', 'Nuevo · Cambios y fase 2', 'por qué mejora cada cambio, componente nuevo e ideas que necesitan algo nuevo', '820x1460'),
  nt('confirma', 'Nuevo · Confirma tus series', 'resumen de solo lectura; tocar una serie para corregirla; Guardar abajo'),
  nt('descanso-terminado', 'Nuevo · Descanso terminado', '«Te toca la serie 2» y Empezar serie 2 al fondo'),
  nt('descanso', 'Nuevo · Descanso', 'tiempo grande arriba; anotar la serie y ajustar el tiempo abajo, al pulgar'),
  nt('diagnostico', 'Nuevo · Diagnóstico', '5 problemas de la vista actual y la card donde se ven', '820x1180'),
  nt('editar-serie', 'Nuevo · Editar una serie', 'la serie se abre en su sitio; Copiar a las siguientes y Listo'),
  nt('guardando', 'Nuevo · Guardando', 'cargando: el botón dice qué pasa y se bloquea'),
  nt('minimizado', 'Nuevo · Minimizado', 'banner sobre la TabBar: tiempo, qué sigue y Saltar'),
  nt('primer-descanso', 'Nuevo · Primer descanso', 'primera vez: una pista corta sobre qué hacer mientras descansas'),
  nt('primera-vez-ejercicio', 'Nuevo · Sin registro previo', 'vacío: primera vez con el ejercicio, pide el peso y explica cómo'),
  nt('serie-registrada', 'Nuevo · Serie registrada', 'la serie se pliega en una línea; el reloj vuelve a mandar'),
  nt('sin-conexion', 'Nuevo · Sin conexión', 'todo sigue igual; una línea dice que se guarda en el teléfono'),
  nt('ultimos-segundos', 'Nuevo · Últimos segundos', 'los 10 s finales pasan a acento, sin rojo ni parpadeo'),
  sa('aviso-pendiente', 'Nuevo · Aviso · 1 pendiente', 'Tu sesión quedó abierta; «Lo hice» confirma con el peso de la última vez; Guardar así / Sigo entrenando'),
  sa('aviso-cambiar-peso', 'Nuevo · Aviso · cambiar peso', 'pendiente confirmado, peso abierto para editar antes de guardar'),
  sa('aviso-todo-registrado', 'Nuevo · Aviso · nada pendiente', 'todo registrado pero la sesión nunca se cerró'),
  sa('aviso-dia-siguiente', 'Nuevo · Aviso · al día siguiente', 'guarda la sesión de ayer; después Hoy muestra el día de hoy'),
  sa('reloj-sin-actividad', 'Nuevo · PageHeader · reloj sin actividad', 'en sesión, en pausa tras 45 min sin actividad, y al volver con «Sigo entrenando»', '460x900'),
  sa('resumen-duracion-real', 'Nuevo · Hoy · Resumen con duración real', 'después de Guardar así → racha → esfuerzo; duración = hasta la última actividad + 3 min'),
  ha('01-gym-chip', 'Nuevo · Hoy · Día de gym con «Otra actividad»', 'chip junto al título; el dock sigue siendo «Empezar calentamiento»'),
  ha('02-elegir-deporte', 'Nuevo · Hoy · Elegir deporte', 'hoja con deportes como botones grandes'),
  ha('03-form-correr', 'Nuevo · Hoy · Registrar Correr', 'tiempo + km; el ritmo sale como resultado'),
  ha('04-form-padel', 'Nuevo · Hoy · Registrar Pádel', 'tiempo + calorías opcionales'),
  ha('05-pregunta-gym', 'Nuevo · Hoy · ¿Y Pecho y tríceps?', 'una sola vez tras guardar en día de gym'),
  ha('06-gym-mas-carrera', 'Nuevo · Hoy · Carrera registrada, gym pendiente', 'fila de solo lectura; tocar para editar o eliminar'),
  ha('07-editar-actividad', 'Nuevo · Hoy · Editar actividad', 'única vía para editar o eliminar'),
  ha('08-descanso-vacio', 'Nuevo · Hoy · Descanso', '«Registrar actividad» es la acción principal'),
  ha('09-descanso-actividad', 'Nuevo · Hoy · Descanso con actividad', 'el día cuenta como entrenado'),
  ha('10-completado-chip', 'Nuevo · Hoy · Resumen + chip', 'resumen del coach cuenta la carrera; el chip añade otra actividad'),
  ha('11-history-day-panel', 'Nuevo · HistoryDayPanel · gym + actividad', 'gym y carrera juntos; «Marcar como hecho» sigue aparte', '800x1500'),
  ha('12-my-week', 'Nuevo · MyWeek · minutos mixtos', 'gym (reloj) + actividades (tecleadas) suman a la liga', '800x460'),
  ha('13-calorias-gym', 'Nuevo · Hoy · Calorías del gym', 'esfuerzo → calorías (opcional) → resumen del coach', '800x2780'),
  { path: 'vistas/nuevo-aviso-entreno/aviso/index.html', group: 'Nuevo · Aviso de entreno', viewport: '800x930', name: 'Nuevo · Aviso de entreno · Sobre «Calentamiento · Listo»', subtitle: 'Tras «Terminar calentamiento»: invitación opcional a iniciar reloj o app; sin botones, se cierra sola a los 2 s' },
  { path: 'vistas/nuevo-aviso-entreno/textos/index.html', group: 'Nuevo · Aviso de entreno', viewport: '800x930', name: 'Nuevo · Aviso de entreno · Textos', subtitle: '3 alternativas de copy (línea + subtexto) con la elegida marcada; reglas del aviso' },
]
const cards = [
  ...assets.map((a) => ({ path: a.path, group: a.group, viewport: `${a.viewport.width}x${a.viewport.height}`, subtitle: a.subtitle, name: a.name })),
  ...handMade,
].sort((a, b) => ORDER.indexOf(a.group) - ORDER.indexOf(b.group) || (b.name?.includes(' · ') ? 1 : 0) - (a.name?.includes(' · ') ? 1 : 0))
const t = (name, value, kind, extra = {}) => ({ name, value, kind, definedIn: 'styles.css', ...extra })
const manifest = {
  namespace: 'TrainingWithPedroDesignSystem_b0cb06',
  components: [],
  startingPoints: [],
  cards,
  templates: [],
  hasThumbnailHtml: true,
  globalCssPaths: ['styles.css'],
  tokens: [
    t('--bg', '#0a0a0a', 'color'), t('--surface', '#141414', 'color'), t('--surface-hover', '#1c1c1c', 'color'), t('--surface-2', '#1a1a1a', 'color'),
    t('--text', '#fafafa', 'font'), t('--text-secondary', 'rgba(255,255,255,0.55)', 'font'), t('--text-tertiary', 'rgba(255,255,255,0.45)', 'font'), t('--text-muted', 'rgba(255,255,255,0.35)', 'font'),
    t('--accent', '#d4ff3a', 'color'), t('--danger', '#ff5b4d', 'color'),
    t('--border', 'rgba(255,255,255,0.06)', 'color'), t('--border-light', 'rgba(255,255,255,0.04)', 'color'), t('--border-medium', 'rgba(255,255,255,0.08)', 'color'),
    t('--radius-sm', '12px', 'radius'), t('--radius-md', '14px', 'radius'), t('--radius-lg', '18px', 'radius'), t('--radius-xl', '20px', 'radius'), t('--radius-2xl', '24px', 'radius'), t('--radius-full', '9999px', 'radius'),
    t('--font-sans', "'Space Grotesk', system-ui, -apple-system, sans-serif", 'font'), t('--font-mono', "'JetBrains Mono', ui-monospace, monospace", 'font'),
    t('--ease-smooth', 'cubic-bezier(0.32, 0.72, 0, 1)', 'other', { annotation: 'other' }),
  ],
  themes: [],
  fonts: [],
  brandFonts: [
    { family: 'Space Grotesk', status: 'ok', tokens: ['--font-sans'], path: 'styles.css' },
    { family: 'JetBrains Mono', status: 'ok', tokens: ['--font-mono'], path: 'styles.css' },
  ],
  source: 'spa',
}
writeFileSync(dir + '/_ds_manifest.json', JSON.stringify(manifest))
console.log(cards.length, [...new Set(cards.map((c) => c.group))].join(' | '))
