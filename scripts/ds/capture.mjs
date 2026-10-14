// Turns the live app into standalone design-system cards: real markup + only
// the CSS rules that markup actually uses. See docs/design-system.md.
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export const OUT_DIR = new URL('../../design-system/', import.meta.url).pathname

const PUBLIC = 'https://pedroterriquez.github.io/Pedro-IA-Coach/'
const FONTS =
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap'

/** Runs in the page. Returns the markup of the specimens (or the whole screen) plus the CSS it uses. */
function snapshot({ specimens, screen }) {
  const strip = (sel) =>
    sel
      .replace(/::?(before|after|placeholder|selection|backdrop|marker|-webkit-[\w-]+|-moz-[\w-]+)/g, '')
      .replace(/:(hover|active|focus-visible|focus-within|focus|disabled|checked|visited|enabled|target)/g, '')

  function freeze(root) {
    root.querySelectorAll('script, link, noscript').forEach((n) => n.remove())
    root.querySelectorAll('img').forEach((img) => {
      if (img.getAttribute('src')) img.setAttribute('src', new URL(img.getAttribute('src'), location.href).href)
      img.removeAttribute('srcset')
    })
    return root
  }

  // Form state lives in properties, not attributes — mirror it before cloning.
  document.querySelectorAll('input, textarea, select').forEach((el) => {
    if (el.tagName === 'TEXTAREA') el.textContent = el.value
    else if (el.tagName === 'SELECT') [...el.options].forEach((o) => o.toggleAttribute('selected', o.selected))
    else if (el.type === 'checkbox' || el.type === 'radio') el.toggleAttribute('checked', el.checked)
    else el.setAttribute('value', el.value)
  })

  const stage = document.createElement('div')
  let height = 844
  if (screen) {
    stage.appendChild(freeze(document.body.cloneNode(true)))
    // Full scroll height, so the card shows the whole view and not just the fold.
    height = Math.max(844, document.documentElement.scrollHeight)
  } else {
    for (const sp of specimens) {
      let nodes = [...document.querySelectorAll(sp.selector)].filter((n) => n.getClientRects().length)
      if (sp.nth != null) nodes = nodes.slice(sp.nth, sp.nth + 1)
      if (sp.distinct) {
        const seen = new Set()
        nodes = nodes.filter((n) => {
          const key = n.getAttribute('class') + '|' + !!n.disabled + '|' + (sp.distinct === 'html' ? n.innerHTML : '')
          return seen.has(key) ? false : seen.add(key)
        })
      }
      nodes = nodes.slice(0, sp.max ?? (sp.distinct ? 10 : 1))
      if (!nodes.length) {
        if (sp.optional) continue
        throw new Error(`ds: nothing matches ${sp.selector}`)
      }
      const fig = document.createElement('figure')
      fig.className = 'ds-spec'
      const cap = document.createElement('figcaption')
      cap.textContent = sp.label
      fig.appendChild(cap)
      const box = document.createElement('div')
      box.className = 'ds-box' + (sp.row ? ' ds-row' : '') + (sp.unfix ? ' ds-unfix' : '')
      if (sp.width) box.style.width = sp.width + 'px'
      nodes.forEach((n) => box.appendChild(freeze(n.cloneNode(true))))
      fig.appendChild(box)
      stage.appendChild(fig)
    }
  }

  const used = (sel) => {
    if (/(^|[\s,>+~])(:root|html|body|\*)/.test(sel)) return true
    return sel.split(',').some((part) => {
      const s = strip(part).trim()
      if (!s) return true
      try {
        return !!stage.querySelector(s)
      } catch {
        return false
      }
    })
  }

  const keyframes = {}
  function walk(rules) {
    const out = []
    for (const r of rules) {
      if (r instanceof CSSFontFaceRule || r instanceof CSSImportRule) continue
      if (r instanceof CSSKeyframesRule) keyframes[r.name] = r.cssText
      else if (r instanceof CSSStyleRule) {
        if (used(r.selectorText)) out.push(r.cssText)
      } else if (r.cssRules) {
        const inner = walk(r.cssRules)
        if (inner.length) out.push(r.cssText.slice(0, r.cssText.indexOf('{') + 1) + '\n' + inner.join('\n') + '\n}')
      }
    }
    return out
  }

  let rules = []
  for (const sheet of document.styleSheets) {
    try {
      rules = rules.concat(walk(sheet.cssRules))
    } catch {
      /* cross-origin sheet */
    }
  }

  const attrs = (el) =>
    [...el.attributes]
      .filter((a) => ['class', 'style', 'lang', 'data-theme'].includes(a.name))
      .map((a) => `${a.name}="${a.value.replace(/"/g, '&quot;')}"`)
      .join(' ')

  return {
    html: screen ? stage.firstChild.innerHTML : stage.innerHTML,
    rules,
    keyframes,
    height,
    htmlAttrs: attrs(document.documentElement),
    bodyAttrs: attrs(document.body),
  }
}

const SPEC_CSS = `
/* ---------- hoja de la card (no es parte de la app) ---------- */
html, body { height: auto; min-height: 0; overflow: auto; }
body { background: #060606; padding: 28px; }
.ds-sheet { display: flex; flex-wrap: wrap; gap: 28px; align-items: flex-start; }
.ds-spec { display: flex; flex-direction: column; gap: 10px; margin: 0; }
.ds-spec figcaption { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.4px; color: rgba(255,255,255,0.45); }
.ds-box { position: relative; width: 350px; display: flex; flex-direction: column; gap: 10px; }
.ds-box.ds-row { flex-direction: row; flex-wrap: wrap; align-items: center; }
/* floating pieces (tab bar, banners, toasts) sit in the flow inside a card */
.ds-box.ds-unfix > * { position: relative !important; inset: auto !important; transform: none !important; margin: 0 !important; }
`

function merge(snaps) {
  const rules = [...new Set(snaps.flatMap((s) => s.rules))]
  const css = rules.join('\n')
  const keyframes = Object.assign({}, ...snaps.map((s) => s.keyframes))
  const kf = Object.entries(keyframes).filter(([name]) => css.includes(name)).map(([, text]) => text)
  return { ...snaps[0], html: snaps.map((s) => s.html).join('\n'), css: [css, ...kf].join('\n') + '\n' }
}

function render({ group, name, subtitle, viewport, snap, screen }) {
  const meta = [`group="${group}"`, `viewport="${viewport}"`, `name="${name}"`]
  if (subtitle) meta.push(`subtitle="${subtitle}"`)
  const body = screen ? snap.html : `<div class="ds-sheet">\n${snap.html}\n</div>`
  return `<!-- @dsCard ${meta.join(' ')} -->
<!DOCTYPE html>
<html ${snap.htmlAttrs}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet">
<style>
${snap.css}${screen ? '' : SPEC_CSS}</style>
</head>
<body ${screen ? snap.bodyAttrs : ''}>
${body}
</body>
</html>
`
}

export const manifest = []

/** Snapshot some specimens now; pass the results to card({ snaps }) to build one card across several screens. */
export async function grab(page, specimens, settle = 350) {
  await page.waitForTimeout(settle)
  return page.evaluate(snapshot, { specimens, screen: false })
}

/**
 * card({ path, group, name, subtitle, source, screen: true })   → the whole view
 * card({ ..., specimens: [{ label, selector, max, distinct, row, width, optional }] })
 * card({ ..., snaps: [await grab(page, [...]), ...] })
 * `source` is the .svelte file the card mirrors — it feeds the map in docs/design-system.md.
 */
export async function card(page, opts) {
  const screen = !!opts.screen
  let snaps = opts.snaps
  if (!snaps) {
    await page.waitForTimeout(opts.settle ?? 450)
    snaps = [await page.evaluate(snapshot, { specimens: opts.specimens ?? [], screen })]
  }
  const snap = merge(snaps)
  const viewport = opts.viewport ?? (screen ? `390x${opts.fold ? 844 : snap.height}` : '820x600')
  const file = join(OUT_DIR, opts.path, 'index.html')
  await mkdir(dirname(file), { recursive: true })
  // The app's own static assets only exist on the deployed site.
  const html = render({ ...opts, viewport, snap, screen })
    .replaceAll('http://localhost:8080/Pedro-IA-Coach/', PUBLIC)
    .replace(/url\((&quot;|"|')?\/Pedro-IA-Coach\//g, (_, q = '') => `url(${q}${PUBLIC}`)
  await writeFile(file, html)
  manifest.push({ path: opts.path + '/index.html', group: opts.group, name: opts.name, source: opts.source })
  console.log('✓', opts.path)
}
