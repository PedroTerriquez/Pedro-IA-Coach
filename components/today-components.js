// ── Phase Card (warmup / training / stretch) ──
function PhaseCard({ kind, phase, title, subtitle, accentColor, done, onPlay, locked, movements, isNext, progress }) {
  const container = document.createElement('div')
  container.dataset.phase = kind
  const a = accentColor

  const kindGlyph = (knd, clr) => {
    if (knd === 'warmup') return `<svg width="150" height="150" viewBox="0 0 20 20" fill="none"><path d="M10 17.5c3.31 0 6-2.69 6-6 0-2.5-1.5-4.5-3-6-1 1.5-2 2-2 2s-1-2.5-1-5c-2 1.5-6 4-6 9 0 3.31 2.69 6 6 6z" stroke="${clr}" stroke-width="1.4" stroke-linejoin="round" fill="${clr}" fill-opacity="0.12"/></svg>`
    if (knd === 'training') return `<svg width="150" height="150" viewBox="0 0 20 20" fill="none"><path d="M3 7v6M5.5 5.5v9M14.5 5.5v9M17 7v6M5.5 10h9" stroke="${clr}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    return `<svg width="150" height="150" viewBox="0 0 20 20" fill="none"><path d="M10 17c3.5-2 7-5 7-9 0-1-.5-2-1.5-3-3 2-7 4-7 9 0 1 .5 2 1.5 3z" stroke="${clr}" stroke-width="1.4" stroke-linejoin="round" fill="${clr}" fill-opacity="0.12"/><path d="M10 17c-3.5-2-7-5-7-9 0-1 .5-2 1.5-3 3 2 7 4 7 9 0 1-.5 2-1.5 3z" stroke="${clr}" stroke-width="1.4" stroke-linejoin="round" fill="${clr}" fill-opacity="0.05"/></svg>`
  }

  const meta = movements ? `${movements.length} movimientos` : subtitle
  const pct = progress ? (progress.total > 0 ? (progress.done / progress.total) * 100 : 0) : null

  container.style.cssText = `flex:1;min-height:0;position:relative;overflow:hidden;border-radius:22px;cursor:${locked ? 'default' : 'pointer'};padding:18px 18px 16px;box-sizing:border-box;background:${done ? `linear-gradient(150deg, ${a}1f 0%, #131313 60%)` : '#141414'};border:${locked ? '0.5px dashed rgba(255,255,255,0.08)' : done ? `1px solid ${a}` : isNext ? `1px solid ${a}66` : '0.5px solid rgba(255,255,255,0.07)'};box-shadow:${locked ? 'none' : done ? `0 0 0 4px ${a}12, 0 10px 30px ${a}1a` : isNext ? `0 8px 28px ${a}12` : 'none'};opacity:${locked ? 0.55 : 1};display:flex;flex-direction:column;justify-content:space-between;transition:border-color 0.3s, box-shadow 0.3s, background 0.3s`
  container.innerHTML = `
    <div style="position:absolute;right:-18px;bottom:-22px;opacity:${done ? 0.16 : 0.05};color:${a};pointer-events:none;transition:opacity 0.3s">${kindGlyph(kind, a)}</div>
    ${!locked && (done || isNext) ? `<div style="position:absolute;top:-70px;left:-40px;width:200px;height:200px;border-radius:50%;background:${a};opacity:${done ? 0.12 : 0.07};filter:blur(60px);pointer-events:none"></div>` : ''}
    <div style="position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:8px">
      <div style="display:flex;align-items:center;gap:7px;font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:1.5px;text-transform:uppercase;color:${done ? a : 'rgba(255,255,255,0.42)'};font-weight:600">
        <span>Fase ${phase}</span>
      </div>
      ${done ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 9px 4px 7px;border-radius:9999px;background:${a};font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;font-weight:700;color:#0a0a0a;box-shadow:0 4px 12px ${a}55"><svg width="10" height="8" viewBox="0 0 11 9" fill="none"><path d="M1 4.5l3 3L10 1" stroke="#0a0a0a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>Completado</span>`
        : isNext ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:9999px;background:${a}1a;border:0.5px solid ${a}40;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;font-weight:600;color:${a}"><span style="width:5px;height:5px;border-radius:50%;background:${a};box-shadow:0 0 6px ${a};display:inline-block"></span>Sigue</span>` : ''}
    </div>
    <div style="position:relative;z-index:1">
      <div style="font-family:'Space Grotesk',sans-serif;font-size:27px;font-weight:700;color:#fafafa;letter-spacing:-0.8px;line-height:1">${title}</div>
      <div style="margin-top:4px;font-size:12.5px;color:rgba(255,255,255,0.5);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${subtitle}</div>
    </div>
    <div style="position:relative;z-index:1;display:flex;align-items:flex-end;justify-content:space-between;gap:12px">
      <div style="min-width:0">
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.3px;color:rgba(255,255,255,0.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${meta}</div>
        ${progress ? `<div style="margin-top:7px;display:flex;align-items:center;gap:7px"><div style="width:64px;height:4px;border-radius:2px;background:rgba(255,255,255,0.1);overflow:hidden"><div style="height:100%;border-radius:2px;background:${a};width:${pct}%;transition:width 0.4s"></div></div><span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:${progress.done > 0 ? a : 'rgba(255,255,255,0.45)'};letter-spacing:0.4px">${progress.done}/${progress.total}</span></div>` : ''}
      </div>
      <div style="width:56px;height:56px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:${done ? 'transparent' : locked ? 'rgba(255,255,255,0.05)' : a};border:${done ? `1.5px solid ${a}` : locked ? '0.5px solid rgba(255,255,255,0.08)' : '0'};box-shadow:${done || locked ? 'none' : `0 8px 22px ${a}55`};transition:all 0.2s">${done ? `<svg width="22" height="17" viewBox="0 0 22 17" fill="none"><path d="M1 9l6.5 6.5L21 1.5" stroke="${a}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>` : locked ? `<svg width="20" height="22" viewBox="0 0 20 22" fill="none" style="margin-left:3px"><path d="M3 2.6v16.8a1 1 0 001.52.85l13.8-8.4a1 1 0 000-1.7L4.52 1.75A1 1 0 003 2.6z" fill="rgba(255,255,255,0.25)"/></svg>` : `<svg width="20" height="22" viewBox="0 0 20 22" fill="none" style="margin-left:3px"><path d="M3 2.6v16.8a1 1 0 001.52.85l13.8-8.4a1 1 0 000-1.7L4.52 1.75A1 1 0 003 2.6z" fill="#0a0a0a"/></svg>`}</div>
    </div>`

  if (!locked && onPlay) {
    container.addEventListener('click', onPlay)
  }
  return container
}

// ── Locked Phase ──
function LockedPhase({ title, detail, id }) {
  const div = document.createElement('div')
  if (id) div.id = id
  div.style.cssText = 'flex:1;min-height:0;border-radius:22px;padding:18px 18px 16px;box-sizing:border-box;background:rgba(255,255,255,0.02);border:0.5px dashed rgba(255,255,255,0.12);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center'
  div.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="7" rx="1.5" stroke="rgba(255,255,255,0.3)" stroke-width="1.4"/><path d="M5 7V5a3 3 0 016 0v2" stroke="rgba(255,255,255,0.3)" stroke-width="1.4"/></svg>
    <div style="font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:600;color:rgba(255,255,255,0.5);letter-spacing:-0.2px;line-height:1.3">${title}</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.35);line-height:1.4">${detail}</div>`
  return div
}

// ── Timer Ring ──
function TimerRing({ startedAt, endedAt, accent, complete, onReset, size = 64 }) {
  const stroke = 5
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const now = Date.now()
  const elapsedMs = startedAt ? Math.max(0, (endedAt || now) - startedAt) : 0
  const totalSec = Math.floor(elapsedMs / 1000)
  const hh = Math.floor(totalSec / 3600)
  const mm = Math.floor((totalSec % 3600) / 60)
  const ss = totalSec % 60
  const pad = (n) => String(n).padStart(2, '0')
  const display = hh > 0 ? `${hh}:${pad(mm)}` : `${pad(mm)}:${pad(ss)}`
  const sweepPct = (totalSec % 3600) / 3600
  const dash = sweepPct * c

  if (!startedAt) {
    const el = document.createElement('div')
    el.style.cssText = `width:${size}px;height:${size}px;position:relative;flex-shrink:0;border-radius:50%;border:0.5px dashed rgba(255,255,255,0.12);display:flex;flex-direction:column;align-items:center;justify-content:center`
    el.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7.6" r="5" stroke="rgba(255,255,255,0.4)" stroke-width="1.2"/><path d="M7 5.2V7.6l1.7 1.1" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" stroke-linecap="round"/><path d="M5.5 1.5h3" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" stroke-linecap="round"/></svg>
      <div style="margin-top:4px;font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:1.2px;text-transform:uppercase;color:rgba(255,255,255,0.4)">Listo</div>`
    return el
  }

  const ringColor = complete && endedAt ? accent : `${accent}cc`
  const labelColor = complete && endedAt ? accent : 'rgba(255,255,255,0.45)'
  const labelText = complete && endedAt ? 'Total' : 'Tiempo'

  const btn = document.createElement('button')
  btn.title = complete && endedAt ? 'Clic para reiniciar' : 'Alt+clic para reiniciar'
  btn.style.cssText = `width:${size}px;height:${size}px;position:relative;flex-shrink:0;background:transparent;border:0;padding:0;cursor:pointer;color:inherit`
  btn.innerHTML = `
    <svg width="${size}" height="${size}" style="transform:rotate(-90deg);position:absolute;inset:0">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${complete && endedAt ? `${accent}33` : 'rgba(255,255,255,0.08)'}" stroke-width="${stroke}" fill="none"/>
      <circle data-timer-sweep="" data-timer-c="${c}" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${ringColor}" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-dasharray="${complete && endedAt ? `${c} 0` : `${dash} ${c}`}" style="transition:stroke-dasharray 0.6s linear"/>
    </svg>
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
      <div data-timer-display="" style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:500;color:#fafafa;letter-spacing:-0.4px;line-height:1;font-variant-numeric:tabular-nums">${display}</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:1.2px;text-transform:uppercase;color:${labelColor};margin-top:3px">${labelText}</div>
    </div>`
  btn.addEventListener('click', (e) => { if (e.altKey || (complete && endedAt)) onReset() })
  return btn
}
