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
const ORDER = ['Hoy', 'Detalle de ejercicio', 'Plan', 'Historial', 'Amigos', 'Tú', 'Shell', 'Compartidos', 'Foundations', 'Rest timer', 'Nuevo · Hoy', 'Archivo · Amigos v1']
// Cards made by hand in Claude Design: they have no local file, so they are listed here.
const handMade = [
  { path: 'foundations/tokens/index.html', group: 'Foundations' },
  { path: 'components/rest-timer-fullscreen/index.html', group: 'Rest timer', viewport: '860x884' },
  { path: 'components/rest-timer-set-log/index.html', group: 'Rest timer' },
  { path: 'components/rest-timer-states/index.html', group: 'Rest timer' },
  ...proposal('Nuevo · Hoy', 'components/hoy-v2/', [
    ['00-notas', '1000x3000', '00 Notas de diseño', 'diagnóstico, qué cambió y por qué, componentes y fase 2'],
    ['01-principal', '920x1500', '01 Pantalla principal', 'la sesión de hoy como lista, el siguiente paso abajo'],
    ['02-calentamiento', '920x1090', '02 Calentamiento y estiramiento', 'un movimiento a la vez, controles abajo'],
    ['03-entrenando', '1780x1400', '03 Entrenando', 'la pantalla más usada: series, última vez y descanso'],
    ['04-cierre', '1340x1100', '04 Cierre de sesión', 'esfuerzo, racha y resumen'],
    ['05-descanso', '470x1120', '05 Día de descanso', 'recuperar también cuenta'],
    ['06-primera-vez', '920x1090', '06 Primera vez', 'sin programa y primer día'],
    ['07-carga-sin-conexion', '920x1090', '07 Carga y sin conexión', 'esqueleto y modo local'],
  ]),
  ...proposal('Archivo · Amigos v1', 'components/amigos/', [
    ['01-principal', '520x1720', 'A · 01 Pantalla principal', '10 en la liga, tú a media tabla'],
    ['02-detalle-eliminar', '920x1080', 'A · 02 Detalle y eliminar', 'tocar una fila abre la comparación'],
    ['03-primera-vez-vacio', '920x1080', 'A · 03 Primera vez y sin amigos', 'la pantalla que hace despegar la función'],
    ['04-pocos-amigos', '920x1200', 'A · 04 Con 1 y 2 amigos', 'el podio nunca se ve roto'],
    ['05-agregar', '1340x1080', 'A · 05 Agregar amigos', 'hoja inferior desde el + del encabezado'],
    ['06-carga-sin-conexion', '1340x1080', 'A · 06 Cargando y sin conexión', 'estados'],
    ['07-perfil', '920x1080', 'A · 07 Mi perfil', 'se abre desde mi avatar en el encabezado'],
    ['08-alt-b-hoy', '920x1480', 'B · Hoy en el gym', 'Apple Fitness + Whoop: ¿quién ya fue hoy?'],
    ['09-alt-c-duelo', '920x1400', 'C · Duelo y escalera', 'Apple Fitness 1 a 1 + Strava: un rival concreto'],
    ['investigacion', '1100x2600', 'Amigos · Investigación y notas', 'Referencias, notas por propuesta, avatar, fase 2'],
  ]),
]
/** Cards of a proposal that only lives in Claude Design: [file, viewport, name, subtitle]. */
function proposal(group, base, rows) {
  return rows.map(([file, viewport, name, subtitle]) => ({ path: `${base}${file}.html`, group, viewport, subtitle, name }))
}
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
