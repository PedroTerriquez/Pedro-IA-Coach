// ── Reschedule Day Card ──
const DAY_NAMES_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function RescheduleDayCard({ day, calIdx, originalIdx, hasWorkout, accent, isToday, isMoved, isSelected, onTap }) {
  const card = document.createElement('div')
  card.style.cssText = `background:#141414;border-radius:18px;padding:14px 12px 14px 16px;border:${isSelected ? `1px solid ${accent}` : isToday ? `1px solid ${accent}aa` : '0.5px solid rgba(255,255,255,0.06)'};cursor:pointer;display:flex;gap:13px;align-items:center;color:inherit;position:relative;${isSelected ? `box-shadow:0 0 0 4px ${accent}1f` : ''}transition:border-color 0.18s,box-shadow 0.18s`

  const badge = document.createElement('div')
  badge.style.cssText = `width:42px;height:46px;flex-shrink:0;border-radius:12px;background:${isToday ? `${accent}18` : 'rgba(255,255,255,0.05)'};display:flex;flex-direction:column;align-items:center;justify-content:center;border:${isToday ? `0.5px solid ${accent}66` : '0.5px solid rgba(255,255,255,0.05)'}`
  badge.innerHTML = `
    <div style="font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:1.2px;color:${isToday ? accent : 'rgba(255,255,255,0.45)'};text-transform:uppercase">${DAY_NAMES_SHORT[calIdx]}</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:500;color:#fafafa;line-height:1.1">${calIdx + 1}</div>`
  card.appendChild(badge)

  const info = document.createElement('div')
  info.style.cssText = 'flex:1;min-width:0'
  if (hasWorkout) {
    info.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px">
        <div style="font-family:'Space Grotesk',sans-serif;font-size:16px;font-weight:600;color:#fafafa;letter-spacing:-0.3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${day.name}</div>
        ${isToday ? `<div style="width:6px;height:6px;border-radius:50%;background:${accent};box-shadow:0 0 6px ${accent};flex-shrink:0"></div>` : ''}
      </div>
      <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${isToday ? 'Hoy' : ''}${isToday && (isMoved || day.subtitle) ? ' · ' : ''}${day.subtitle || ''}</div>
      ${isMoved ? `<div style="display:inline-flex;align-items:center;gap:4px;margin-top:7px;padding:3px 8px;border-radius:9999px;background:${accent}18;border:0.5px solid ${accent}3a;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:0.8px;text-transform:uppercase;color:${accent};font-weight:600;white-space:nowrap">↔ desde ${DAY_NAMES_SHORT[originalIdx]}</div>` : ''}`
  } else {
    info.innerHTML = `<div style="font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:500;color:rgba(255,255,255,0.35);margin-top:2px">Sin entrenamiento</div>`
  }
  card.appendChild(info)

  const meta = document.createElement('div')
  meta.style.cssText = 'text-align:right;flex-shrink:0;min-width:30px'
  if (hasWorkout) {
    meta.innerHTML = `
      <div style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#fafafa;font-weight:500">${(day.exercises || []).length}</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-top:1px">${day.duration || '?'}m</div>`
  } else {
    meta.innerHTML = `<div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:#9bd1ff">Libre</div>`
  }
  card.appendChild(meta)

  card.addEventListener('click', onTap)
  return card
}
