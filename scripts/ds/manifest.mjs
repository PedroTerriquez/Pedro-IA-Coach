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
const ORDER = ['Hoy', 'Temporizador', 'Detalle de ejercicio', 'Plan', 'Historial', 'Amigos', 'Tú', 'Shell', 'Compartidos']
// Cards made by hand in Claude Design have no local file: list them here as
// { path, group, viewport, name, subtitle }. None since the 2026-10-22 cleanup.
const handMade = []
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
