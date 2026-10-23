// Page objects for big.spec.cjs: where things are on each screen, in one place.
// Parts of a component are found by their data-testid (src/lib/test-ids.json,
// shared with the app); whole components by data-component. Not a test file:
// Playwright only collects *.spec.*.

const { expect } = require('@playwright/test')
const TID = require('../../src/lib/test-ids.json')

const tid = (key) => `[data-testid="${TID[key]}"]`
const component = (name) => `[data-component="${name}"]`

// CSS selectors, for locator() chains and hasText filters
const SEL = {
  pageTitle: tid('pageTitle'),
  pageEyebrow: tid('pageEyebrow'),
  pageSub: tid('pageSub'),
  detailName: tid('detailName'),
  detailNav: tid('detailNav'),
  detailScroll: tid('detailScroll'),
  phaseToggle: tid('phaseToggle'),
  exerciseRow: component('ExerciseRow'),
  exerciseName: tid('exerciseName'),
  exerciseDoneMark: tid('exerciseDoneMark'),
  exerciseToggle: tid('exerciseToggle'),
  dayTitle: tid('dayTitle'),
  dragSlot: tid('dragSlot'),
  dragHandle: tid('dragHandle'),
  seriesTime: tid('seriesTime'),
  seriesLabel: tid('seriesLabel'),
  seriesDot: (state) => `${tid('seriesDot')}[data-state="${state}"]`,
  confirmRow: tid('confirmRow'),
  confirmSave: tid('confirmSave'),
  blockField: tid('blockField'),
  searchResult: tid('searchResult'),
  searchResultName: tid('searchResultName'),
}

const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// ── Shared pieces ──
const todayDock = (page) => page.locator(component('NextStepDock'))
const sheetHead = (page) => page.locator(component('DetailSheetHead'))
const logDock = (page) => page.locator(component('LogDock'))

/** A tab of a SegmentedControl (Registrar / Historial / Alternativas), by its label */
const segTab = (scope, label) => scope.locator(component('SegmentedControl')).getByRole('button', { name: label, exact: true })

/** The Plan's day on weekday `i` (Mon=0): a DayRow, or a DayPanel when open */
function planDay(page, i) {
  return page.locator(`#plan-days-grid [data-weekday="${WEEKDAY_SHORT[i]}"]`)
}

async function openFromPlan(page, name = 'Banca') {
  const row = page.locator(`#plan-days-grid ${SEL.exerciseRow}`, { hasText: name })
  await expect(row).toBeVisible({ timeout: 5000 })
  await row.click()
  await expect(page.locator(component('ExerciseDetail'))).toBeVisible()
}

/** Number of text lines an element takes */
function lineCount(locator) {
  return locator.evaluate((el) => {
    const cs = getComputedStyle(el)
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2
    return el.getBoundingClientRect().height / lh
  })
}

// ── Navigation ──
const TAB_LABELS = { today: 'Hoy', plan: 'Plan', history: 'Historial', friends: 'Amigos', you: 'Tú' }

// Goes to a view the way a thumb does: the TabBar link, a client-side
// navigation (no reload of the app). Falls back to a real page load when the
// TabBar isn't there or a sheet covers it, or when already on that view (a
// goto there re-mounts it).
async function nav(page, route) {
  const link = page.locator(component('TabBar')).getByRole('link', { name: TAB_LABELS[route], exact: true })
  const here = new URL(page.url()).pathname.replace(/\/$/, '').endsWith(`/${route}`)
  const tappable = !here && await link.click({ trial: true, timeout: 300 }).then(() => true, () => false)
  if (!tappable) {
    await page.goto(route)
    return
  }
  await link.click()
  await expect(page).toHaveURL(new RegExp(`/${route}/?$`))
}

// ── Network ──
// 1×1 transparent GIF
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
const EXTERNAL_IMAGE = /^https?:\/\/(?!localhost[:/])[^/]+\/.*\.(jpe?g|png|gif|webp)(\?.*)?$/i

// Exercise media lives on other sites (jsdelivr, GitHub, …): the test doesn't
// wait on them, every one answers at once with a pixel. On the context, so
// the Service Worker's fetches are caught too.
async function blockExternalImages(context) {
  await context.route(EXTERNAL_IMAGE, (route) => route.fulfill({ status: 200, contentType: 'image/gif', body: PIXEL }))
}

async function unblockExternalImages(context) {
  await context.unroute(EXTERNAL_IMAGE)
}

// ── Screens ──
function screens(page) {
  const detail = page.locator(component('ExerciseDetail'))
  const timer = page.locator(component('SeriesModeScreen'))
  return {
    header: {
      title: page.getByTestId(TID.pageTitle),
      eyebrow: page.getByTestId(TID.pageEyebrow),
    },
    detail: {
      root: detail,
      name: page.getByTestId(TID.detailName),
      prev: page.getByTestId(TID.detailNav).getByRole('button', { name: 'Anterior' }),
      next: page.getByTestId(TID.detailNav).getByRole('button', { name: 'Siguiente' }),
      tab: (label) => segTab(detail, label),
    },
    timer: {
      root: timer,
      time: timer.getByTestId(TID.seriesTime),
      label: timer.getByTestId(TID.seriesLabel),
      dots: (state) => timer.locator(SEL.seriesDot(state)),
      rows: timer.getByTestId(TID.confirmRow),
      save: timer.getByTestId(TID.confirmSave),
    },
    plan: {
      slots: page.getByTestId(TID.dragSlot),
      handles: page.getByTestId(TID.dragHandle),
    },
  }
}

module.exports = {
  TID, SEL, WEEKDAY_SHORT,
  todayDock, sheetHead, logDock, segTab, planDay, openFromPlan, lineCount,
  nav, blockExternalImages, unblockExternalImages, screens,
}
