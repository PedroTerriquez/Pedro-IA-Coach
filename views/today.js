// ── Today screen (Hoy) — reference visual: today.jsx + session.jsx ──

let _phase = 1
let _startedAt = null
let _endedAt = null
let _phaseCardOpen = null
let _todayExDone = 0
let _timerInterval = null
let _completionToastShown = false
let _effortValue = null
let _coachResult = null
let _coachLoading = false
let _coachCardMode = false
let _effortModalShowing = false
let _sessionDate = ''
let _coachDay = null
let _coachEffort = null
let _warmupSheetShown = false
let _stretchSheetShown = false
let _mountGen = 0

const TOPIC_LABELS = {
  comparativa: 'comparativa',
  racha: 'racha',
  esfuerzo_volumen: 'esfuerzo/vol',

  recuperacion: 'recuperación',
  progreso_global: 'progreso',
  retrospectiva_semanal: 'retrospectiva',
}

function mountToday(container, { program, weekIdx, dayIndex, settings, accent, onOpenExercise, exercises, swaps, rescheduleOrder }) {
  swaps = swaps || {}
  const gen = ++_mountGen
  if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null }
  _completionToastShown = false
  _effortValue = null
  _coachResult = null
  _effortModalShowing = false
  const todayDate = getToday()
  if (_sessionDate !== todayDate) {
    _phase = 1
    _startedAt = null
    _endedAt = null
    _phaseCardOpen = null
    _todayExDone = 0
    _sessionDate = todayDate
    _warmupSheetShown = false
    _stretchSheetShown = false
    _coachCardMode = false
    _effortValue = null
    _coachResult = null
  }
  // Restore session state from settings (survives page reload)
  if (settings.sessionState?.date === todayDate) {
    _phase = settings.sessionState.phase || 1
    _todayExDone = settings.sessionState.todayExDone || 0
  }
  container.innerHTML = ''
  const page = document.createElement('div')
  page.className = 'page'
  page.style.cssText = 'height:100%;box-sizing:border-box;padding:58px 16px 104px;display:flex;flex-direction:column'
  container.appendChild(page)

  const now = new Date()
  const jsDay = now.getDay()
  const detectedDayIdx = (dayIndex >= 0 ? dayIndex : (jsDay + 6) % 7)
  const exercisesById = Object.fromEntries((exercises || []).map(e => [e.id, e]))
  function resolveExId(exerciseId) { return swaps[exerciseId] || exerciseId }
  const weekObj = program?.weeks[weekIdx]
  const defaultDaysOrder = [0,1,2,3,4,5,6]
  const order = (rescheduleOrder && rescheduleOrder.length === 7) ? rescheduleOrder : defaultDaysOrder
  const originalDayIdx = order[detectedDayIdx < order.length ? detectedDayIdx : 0]
  const day = weekObj?.days[originalDayIdx]
  // Show coach card on reload if analysis already exists for today
  if (settings.lastCoachAnalysis?.date === todayDate && settings.lastCoachAnalysis?.weekIdx === weekIdx) {
    _coachCardMode = true
    _coachEffort = settings.lastCoachAnalysis.effort || 'good'
    _coachDay = day
  }
  const isRescheduled = originalDayIdx !== detectedDayIdx
  const DAYS_LONG = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const dateStr = `${monthNames[now.getMonth()]} ${now.getDate()} · ${now.getFullYear()}`
  const weekDayName = dayNames[jsDay]

  if (!program && (!exercises || exercises.length === 0)) {
    renderEmptyState(page, { accent })
    return
  }

  if (!day || day.name === 'Rest' || day.name === 'Descanso') {
    renderRestDay(page, { weekDayName, dateStr, accent, weekObj, weekIdx })
    return
  }

  const warmupMuscles = day.exercises.map((ex) => {
    const resolved = { ...ex, ...(exercisesById[resolveExId(ex.exerciseId)] || {}) }
    return resolved.muscle
  }).filter(Boolean)

  const warmupItems = resolvePanelItems(warmupMuscles, 'warmup')
  const stretchItems = resolvePanelItems(warmupMuscles, 'stretch')
  const hasWarmup = warmupItems.length > 0
  const hasStretch = stretchItems.length > 0
  const exercisesTotal = day.exercises.length
  const totalSteps = (hasWarmup ? 1 : 0) + exercisesTotal + (hasStretch ? 1 : 0)
  const exDone = _todayExDone
  const doneSteps = (_phase >= 2 ? 1 : 0) + exDone + (_phase >= 4 ? 1 : 0)

  // Timer auto-start/stop
  if (doneSteps > 0 && !_startedAt) _startedAt = Date.now()
  if (totalSteps > 0 && doneSteps === totalSteps && _startedAt && !_endedAt) _endedAt = Date.now()
  if (_endedAt && doneSteps < totalSteps) _endedAt = null

  // Auto-open warmup detail sheet if not done (first load or after undo)
  if (!_warmupSheetShown && hasWarmup && _phase < 2) {
    _warmupSheetShown = true
    setTimeout(() => {
      mountWarmupDetail({
        items: warmupItems,
        mode: 'warmup',
        accent,
        onComplete: () => {
          _phase = 2
          _phaseCardOpen = null
          persistPhase()
          refreshView()
        },
      })
    }, 300)
  }

  // Auto-open stretch detail sheet when exercises are done and warmup is complete
  if (!_stretchSheetShown && hasStretch && _phase >= 3 && _phase < 4) {
    _stretchSheetShown = true
    setTimeout(() => {
      mountWarmupDetail({
        items: stretchItems,
        mode: 'stretch',
        accent,
        onComplete: () => {
          _phase = 4
          _phaseCardOpen = null
          persistPhase()
          refreshView()
        },
      })
    }, 300)
  }

  function refreshView() {
    mountToday(container, { program, weekIdx, dayIndex, settings, accent, onOpenExercise, exercises, swaps, rescheduleOrder })
  }

  function persistPhase() {
    settings.sessionState = { date: todayDate, phase: _phase, todayExDone: _todayExDone }
    Storage.saveSettings(settings)
  }

  // Header — reference style: ● Hoy en el gimnasio + day name 42px + week chip + subtitle
  const header = document.createElement('div')
  header.style.cssText = 'flex-shrink:0;padding:0 4px 2px'
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.8px;color:${accent};text-transform:uppercase;font-weight:600">
      <span style="width:6px;height:6px;border-radius:50%;background:${accent};box-shadow:0 0 8px ${accent};animation:pulse 2s infinite;display:inline-block"></span>
      Hoy en el gimnasio
    </div>
    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-top:7px">
      <div style="font-family:'Space Grotesk',sans-serif;font-size:42px;font-weight:700;color:#fafafa;letter-spacing:-1.8px;line-height:0.98">${day.name}</div>
      <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
        ${weekObj ? `<span class="pill" style="background:${accent}1c;color:${accent};margin-bottom:4px">${weekObj.name}${weekObj.tag ? ' · ' + weekObj.tag : ''}</span>` : ''}
        <div id="hero-rings" style="display:flex;align-items:center;flex-shrink:0"></div>
      </div>
    </div>
    <div style="margin-top:5px;font-size:13px;color:rgba(255,255,255,0.5)">${day.subtitle || ''}</div>
    ${isRescheduled ? `<div style="display:inline-flex;align-items:center;gap:5px;margin-top:9px;padding:4px 10px;border-radius:9999px;background:${accent}18;border:0.5px solid ${accent}3a;font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:0.6px;text-transform:uppercase;color:${accent};font-weight:600">↔ Reprogramado · lo de ${DAYS_LONG[originalDayIdx]}</div>` : ''}`
  page.appendChild(header)

  // TimerRing — appended as DOM element (has event listeners)
  const ringsContainer = document.getElementById('hero-rings')
  const timerRingEl = TimerRing({ startedAt: _startedAt, endedAt: _endedAt, accent, complete: totalSteps > 0 && doneSteps === totalSteps, onReset: () => { _startedAt = null; _endedAt = null; refreshView() } })
  ringsContainer.appendChild(timerRingEl)
  const timerDisplayEl = timerRingEl.querySelector('[data-timer-display]')
  const timerSweepEl = timerRingEl.querySelector('[data-timer-sweep]')

  // ── Coach card or Phase cards ──
  if (_coachCardMode) {
    const analysis = (!_coachLoading && settings.lastCoachAnalysis?.date === getToday()) ? settings.lastCoachAnalysis : null
    renderCoachCard(page, analysis, accent, dateStr, weekDayName, exercises, swaps, weekIdx)
  } else {
  const sectionsWrap = document.createElement('div')
  sectionsWrap.style.cssText = 'flex:1;min-height:0;margin-top:16px;display:flex;flex-direction:column;gap:11px'
  page.appendChild(sectionsWrap)

  // Warmup
  if (hasWarmup) {
    const warmupNext = _phase < 2
    sectionsWrap.appendChild(PhaseCard({
      kind: 'warmup',
      phase: '01',
      title: 'Calentamiento',
      subtitle: 'Activación dinámica',
      accentColor: '#9bd1ff',
      movements: warmupItems,
      done: _phase >= 2,
      locked: false,
      isNext: warmupNext,
      onPlay: () => {
        mountWarmupDetail({
          items: warmupItems,
          mode: 'warmup',
          accent,
          onComplete: _phase < 2 ? () => {
            _phase = 2
            _phaseCardOpen = null
            persistPhase()
            if (settings.hasWatch) {
              showCenterToast({
                svg: TOAST_SVG_WATCH,
                message: 'Inicia tu Smart Watch',
                duration: 1500,
                accent,
                onDone: refreshView,
              })
            } else {
              refreshView()
            }
          } : undefined,
        })
      },
    }))
  }

  // Training
  const trainingDone = _phase >= 3
  const trainingLocked = hasWarmup && _phase < 2
  const trainingNext = !trainingDone && !trainingLocked

  function openFirstUnloggedExercise() {
    Storage.getLogsForDate(getToday()).then(todayLogs => {
      const firstUnlogged = day.exercises.find(ex => {
        const exId = resolveExId(ex.exerciseId || ex.id)
        return !todayLogs.some(l => l.exerciseId === exId && l.weight > 0)
      }) || day.exercises[0]
      if (firstUnlogged) {
        const resolved = { ...firstUnlogged, ...(exercisesById[resolveExId(firstUnlogged.exerciseId)] || {}) }
        onOpenExercise(resolved)
      }
    })
  }

  sectionsWrap.appendChild(PhaseCard({
    kind: 'training',
    phase: '02',
    title: 'Entrenamiento',
    subtitle: day.subtitle || `${day.exercises.length} ejercicios`,
    accentColor: accent,
    movements: day.exercises,
    done: trainingDone,
    locked: trainingLocked,
    isNext: trainingNext,
    progress: { done: exDone, total: exercisesTotal },
    onPlay: trainingLocked ? undefined : openFirstUnloggedExercise,
  }))

  // Stretch
  if (hasStretch) {
    const stretchDone = _phase >= 4
    const stretchLockedByWarmup = hasWarmup && _phase < 2
    const stretchLockedByTraining = !stretchLockedByWarmup && _phase < 3
    const stretchNext = !stretchDone && !stretchLockedByWarmup && !stretchLockedByTraining
    if (stretchDone) {
      sectionsWrap.appendChild(PhaseCard({
        kind: 'stretch',
        phase: '03',
        title: 'Estiramiento',
        subtitle: 'Enfriamiento estático',
        accentColor: '#c89bff',
        movements: stretchItems,
        done: true,
        locked: false,
        isNext: false,
        onPlay: () => {
          mountWarmupDetail({
            items: stretchItems,
            mode: 'stretch',
            accent,
            onComplete: undefined,
          })
        },
      }))
    } else if (stretchLockedByWarmup) {
      sectionsWrap.appendChild(LockedPhase({
        id: 'today-locked-warmup-stretch',
        title: 'Termina el calentamiento primero',
        detail: 'Tus estiramientos aparecerán cuando completes todos los ejercicios.',
      }))
    } else if (stretchLockedByTraining) {
      sectionsWrap.appendChild(LockedPhase({
        id: 'today-locked-training-stretch',
        title: 'Termina el entrenamiento primero',
        detail: `Completa los ${exercisesTotal - exDone} ejercicio(s) restante(s) para ver tus estiramientos.`,
      }))
    } else {
      sectionsWrap.appendChild(PhaseCard({
        kind: 'stretch',
        phase: '03',
        title: 'Estiramiento',
        subtitle: 'Enfriamiento estático',
        accentColor: '#c89bff',
        movements: stretchItems,
        done: false,
        locked: false,
        isNext: stretchNext,
        onPlay: () => {
          _stretchSheetShown = true
          mountWarmupDetail({
            items: stretchItems,
            mode: 'stretch',
            accent,
            onComplete: _phase < 4 ? () => {
              _phase = 4
              _phaseCardOpen = null
              persistPhase()
              refreshView()
            } : undefined,
          })
        },
      }))
    }
  }
  } // end else (normal phase cards)

  // Live timer tick — updates DOM in-place, no full re-render
  if (_startedAt && !_endedAt) {
    _timerInterval = setInterval(() => {
      if (gen !== _mountGen) { clearInterval(_timerInterval); _timerInterval = null; return }
      if (_endedAt) { clearInterval(_timerInterval); _timerInterval = null; return }
      const totalSec = Math.floor((Date.now() - _startedAt) / 1000)
      const hh = Math.floor(totalSec / 3600)
      const mm = Math.floor((totalSec % 3600) / 60)
      const ss = totalSec % 60
      const pad = (n) => String(n).padStart(2, '0')
      if (timerDisplayEl) timerDisplayEl.textContent = hh > 0 ? `${hh}:${pad(mm)}` : `${pad(mm)}:${pad(ss)}`
      if (timerSweepEl) {
        const c = parseFloat(timerSweepEl.dataset.timerC) || 185.35
        timerSweepEl.setAttribute('stroke-dasharray', `${(totalSec % 3600) / 3600 * c} ${c}`)
      }
    }, 1000)
  }

  // Async load today's logs to update counts
  Storage.getLogsForDate(getToday()).then((logs) => {
    if (gen !== _mountGen) return
    const done = _phase >= 3 ? exercisesTotal : day.exercises.filter(ex => {
      const displayedId = resolveExId(ex.exerciseId || ex.id)
      return logs.some(l => l.exerciseId === displayedId && l.weight > 0)
    }).length
    if (done !== _todayExDone) {
      const prev = _todayExDone
      _todayExDone = done
      persistPhase()
      refreshView()
      if (done >= exercisesTotal && prev < exercisesTotal && _phase < 3 && !_completionToastShown) {
        _phase = 3
        persistPhase()
        _completionToastShown = true
        const start = _startedAt || Date.now()
        const sec = Math.floor((Date.now() - start) / 1000)
        const mm = Math.floor(sec / 60)
        const ss = sec % 60
        const tiempo = mm > 0 ? `${mm} min ${ss} seg` : `${ss} seg`
        showCenterToast({
          svg: TOAST_IMG_TRAINER,
          message: 'Estira bb',
          subtitle: `Ya no tienes 20 añitos<br><span style="display:inline-flex;align-items:center;gap:4px;margin-top:4px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${tiempo}</span>`,
          duration: 3000,
          accent,
          onDone: () => {
            refreshView()
          },
        })
      }
    }

    // ── Coach Analysis trigger ──
    const allPhasesComplete = _phase >= (hasStretch ? 4 : 3)
    if (allPhasesComplete && !_effortValue && !_coachCardMode && !_effortModalShowing && !document.getElementById('effort-overlay') && !document.getElementById('streak-overlay')) {
      const showEffort = () => {
        _effortModalShowing = true
        setTimeout(() => {
          if (gen !== _mountGen) return
          if (_effortValue || _coachCardMode || document.getElementById('effort-overlay')) return
          showEffortSelector({
            accent,
            day,
            exercises,
            onEffort: async (effort) => {
              _coachDay = day
              _coachEffort = effort
              _effortValue = effort
              _effortModalShowing = false
              _coachLoading = true
              _coachCardMode = true
              _coachDay = day
              _coachEffort = effort
              refreshView()
              runCoachAnalysis(day, effort, 0, exercises, settings, swaps).then(async (result) => {
                _coachResult = result
                _coachLoading = false
                const s = await Storage.getSettings()
                s.lastCoachAnalysis = { date: getToday(), effort: _coachEffort, weekIdx, ...result }
                await Storage.saveCoachAnalysis(s.lastCoachAnalysis)
                settings.lastCoachAnalysis = s.lastCoachAnalysis
                refreshView()
              }).catch(() => {
                _coachLoading = false
                refreshView()
              })
            }
          })
        }, 600)
      }
      if (settings.streakShownDate !== getToday()) {
        computeStreak(getToday()).then(streak => {
          if (gen !== _mountGen) return
          if (_effortValue || _coachCardMode || _effortModalShowing || document.getElementById('effort-overlay') || document.getElementById('streak-overlay')) return
          showStreakCelebration({
            streak: Math.max(1, streak),
            accent,
            onDone: () => {
              settings.streakShownDate = getToday()
              Storage.saveSettings(settings)
              showEffort()
            },
          })
        })
      } else {
        showEffort()
      }
    }
  })
}







// ── Coach Analysis — SessionSummary reference style ──
async function renderCoachCard(page, analysis, accent, dateStr, weekDayName, exercises, swaps, weekIdx) {
  const isLoading = _coachLoading
  const items = _coachDay?.exercises?.map(e => ({ name: e.name, muscle: e.muscle })) || []

  let volume = 0
  let prCount = 0
  try {
    const todayLogs = await Storage.getLogsForDate(getToday())
    const dayExercises = _coachDay?.exercises || []
    for (const log of todayLogs) {
      if (!log.weight) continue
      const progEx = dayExercises.find(e => (swaps[e.exerciseId] || e.exerciseId) === log.exerciseId)
      const sets = log.sets ?? progEx?.sets ?? 0
      let reps = log.reps ?? progEx?.reps ?? 0
      if (typeof reps === 'string') reps = parseInt(reps) || 0
      volume += log.weight * sets * reps
    }
    const exIds = [...new Set(todayLogs.map(l => l.exerciseId))]
    for (const exId of exIds) {
      const todayLog = todayLogs.find(l => l.exerciseId === exId && l.weight > 0)
      if (!todayLog) continue
      const allLogs = await Storage.getLogsForExercise(exId)
      const prevLogs = allLogs.filter(l => l.date !== getToday() && l.weight > 0)
      if (prevLogs.length > 0 && todayLog.weight > 0 && todayLog.weight >= Math.max(...prevLogs.map(l => l.weight))) prCount++
    }
  } catch (e) { /* fallback to 0 */ }

  const wrap = document.createElement('div')
  wrap.style.cssText = 'flex:1;min-height:0;overflow-y:auto;margin-top:16px'
  page.appendChild(wrap)

  let bodyHtml = ''
  if (isLoading) {
    bodyHtml = `<div style="margin-top:16px;display:flex;align-items:center;gap:10px">
      <div style="width:20px;text-align:center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
      </div>
      <span style="font-size:13px;color:rgba(255,255,255,0.55)">Analizando tu entrenamiento…</span>
    </div>`
  } else if (analysis) {
    const resumen = analysis.analysis || ''
    const proximo = analysis.proximo_objetivo || ''
    const destacados = analysis.recommendations?.slice(0, 5) || []
    const topicLabel = TOPIC_LABELS[analysis._topic] || analysis._topic || analysis.rotation_topic || ''
    const verdictColors = { positive: '#4caf50', neutral: 'rgba(255,255,255,0.5)', warning: '#ff9800' }
    const verdictLabels = { positive: 'Positiva', neutral: 'Neutral', warning: 'Revisión' }
    const vColor = verdictColors[analysis.verdict] || verdictColors.neutral
    const vLabel = verdictLabels[analysis.verdict] || verdictLabels.neutral

    bodyHtml = `
      <div style="display:flex;gap:7px;margin-top:12px">
        <span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:9999px;background:${vColor}18;border:0.5px solid ${vColor}44;font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:600;color:${vColor}">${vLabel}</span>
      </div>
      <div style="margin-top:12px;font-size:14.5px;line-height:1.55;color:rgba(255,255,255,0.9);font-family:'Space Grotesk',sans-serif;letter-spacing:-0.1px">${resumen}</div>
      ${proximo ? `<div style="margin-top:14px;padding:12px 14px;border-radius:14px;border:0.5px solid ${accent}3a;background:${accent}0d"><div style="font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:1.4px;text-transform:uppercase;color:${accent};font-weight:600;margin-bottom:6px">Próximo Objetivo</div><div style="font-size:16px;line-height:1.5;color:${accent};font-family:'Space Grotesk',sans-serif;font-weight:600;letter-spacing:-0.4px">${proximo}</div></div>` : ''}
      ${destacados.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:14px">${destacados.map(d => `<span style="display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:9999px;background:${accent}16;border:0.5px solid ${accent}3a;font-family:'Space Grotesk',sans-serif;font-size:11.5px;font-weight:600;color:${accent}"><span style="width:4px;height:4px;border-radius:50%;background:${accent};display:inline-block"></span>${d}</span>`).join('')}</div>` : ''}
      <div style="margin-top:12px;display:flex;align-items:center;gap:8px;font-size:9px;font-family:'JetBrains Mono',monospace;letter-spacing:0.6px;text-transform:uppercase">
        <span style="color:rgba(255,255,255,0.35)">${topicLabel}</span>
      </div>`
  }

  wrap.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
      <div style="background:#141414;border-radius:16px;padding:14px 12px;border:0.5px solid rgba(255,255,255,0.06);text-align:center">
        <div style="font-family:'JetBrains Mono',monospace;font-size:26px;font-weight:500;color:#fafafa;letter-spacing:-1px;line-height:1">${items.length}</div>
        <div style="margin-top:6px;font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:1.2px;text-transform:uppercase;color:rgba(255,255,255,0.45)">Ejercicios</div>
      </div>
      <div style="background:#141414;border-radius:16px;padding:14px 12px;border:0.5px solid rgba(255,255,255,0.06);text-align:center">
        <div style="font-family:'JetBrains Mono',monospace;font-size:26px;font-weight:500;color:#fafafa;letter-spacing:-1px;line-height:1">${volume > 0 ? Math.round(volume) : '—'}</div>
        <div style="margin-top:6px;font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:1.2px;text-transform:uppercase;color:rgba(255,255,255,0.45)">Volumen</div>
      </div>
      <div style="background:#141414;border-radius:16px;padding:14px 12px;border:0.5px solid rgba(255,255,255,0.06);text-align:center">
        <div style="font-family:'JetBrains Mono',monospace;font-size:26px;font-weight:500;color:${prCount > 0 ? accent : '#fafafa'};letter-spacing:-1px;line-height:1">${prCount}</div>
        <div style="margin-top:6px;font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:1.2px;text-transform:uppercase;color:rgba(255,255,255,0.45)">PRs</div>
      </div>
    </div>
    <div id="coach-card-regen" style="margin-top:14px;border-radius:20px;padding:18px;background:linear-gradient(165deg,#181818 0%,#111 100%);border:0.5px solid ${accent}2e;position:relative;overflow:hidden;cursor:${isLoading ? 'default' : 'pointer'};transition:border-color 0.15s">
      <div style="position:absolute;top:-50px;right:-40px;width:180px;height:180px;border-radius:50%;background:${accent};opacity:0.08;filter:blur(55px);pointer-events:none"></div>
      <div style="position:relative;z-index:1">
        <div style="display:flex;align-items:center;gap:7px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.6px;text-transform:uppercase;color:${accent};font-weight:600">
          <span style="width:22px;height:22px;border-radius:7px;background:${accent}1f;display:inline-flex;align-items:center;justify-content:center">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><circle cx="12" cy="12" r="10"/></svg>
          </span>
          Resumen del coach
        </div>
        ${bodyHtml}
      </div>
    </div>
    <button id="coach-card-reset" style="margin-top:16px;width:100%;padding:13px;border-radius:12px;cursor:pointer;background:transparent;border:0.5px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.6);font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:600;letter-spacing:-0.1px;display:flex;align-items:center;justify-content:center;gap:7px">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M13 8a5 5 0 11-1.5-3.6M13 2v3h-3" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Reiniciar día
    </button>`

  if (!isLoading && _coachDay && _coachEffort) {
    const regenEl = wrap.querySelector('#coach-card-regen')
    if (regenEl) {
      regenEl.addEventListener('click', async () => {
        _coachLoading = true; _coachResult = null
        if (typeof window.appRefresh === 'function') window.appRefresh()
        const s = await Storage.getSettings()
        try {
          const result = await runCoachAnalysis(_coachDay, _coachEffort, 0, exercises || [], s, swaps || {})
          _coachResult = result; _coachLoading = false
          const settings = await Storage.getSettings()
          settings.lastCoachAnalysis = { date: getToday(), effort: _coachEffort, weekIdx, ...result }
          await Storage.saveCoachAnalysis(settings.lastCoachAnalysis)
          if (typeof window.appRefresh === 'function') window.appRefresh()
        } catch { _coachLoading = false; if (typeof window.appRefresh === 'function') window.appRefresh() }
      })
    }
    const resetEl = wrap.querySelector('#coach-card-reset')
    if (resetEl) {
      resetEl.addEventListener('click', async () => {
        const s = await Storage.getSettings()
        delete s.lastCoachAnalysis
        await Storage.saveSettings(s)
        _coachCardMode = false
        _coachLoading = false
        _coachResult = null
        _coachDay = null
        _coachEffort = null
        if (typeof window.appRefresh === 'function') window.appRefresh()
      })
    }
  }
}

// ── Effort Selector Modal ──
function showEffortSelector({ accent, day, exercises, onEffort }) {
  if (document.getElementById('effort-overlay')) return
  const { overlay, card, close } = Modal({ onClose: () => {} })
  overlay.id = 'effort-overlay'
  card.innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:32px;margin-bottom:8px">🧑‍🏫</div>
      <div style="font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:700;color:#fafafa;letter-spacing:-0.3px">¿Cómo sentiste la sesión?</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-top:6px">Esto ayuda a Pedro a darte mejor feedback</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${[{ e: 'easy', emoji: '💪', label: 'Fácil', desc: 'Podía más, para subir peso', accent: true },
        { e: 'good', emoji: '👍', label: 'Justo', desc: 'Peso correcto, lo planeado', accent: true },
        { e: 'heavy', emoji: '😮‍💨', label: 'Pesado', desc: 'Me costó trabajo', accent: true },
        { e: 'failure', emoji: '🛑', label: 'Al fallo', desc: 'Llegué al fallo muscular, no daba más', danger: true }
      ].map(({ e, emoji, label, desc, accent: a, danger }) => `
        <button class="effort-btn" data-effort="${e}" style="padding:14px;border-radius:14px;border:${danger ? '0.5px solid rgba(255,107,107,0.3)' : '0.5px solid rgba(255,255,255,0.06)'};background:${danger ? 'rgba(255,107,107,0.12)' : 'rgba(255,255,255,0.04)'};cursor:pointer;text-align:left;display:flex;align-items:center;gap:12px;color:inherit;transition:all 0.15s">
          <div style="width:40px;height:40px;border-radius:10px;background:${danger ? 'rgba(255,107,107,0.12)' : `${accent}1a`};display:flex;align-items:center;justify-content:center;font-size:20px;border:0.5px solid ${danger ? 'rgba(255,107,107,0.3)' : `${accent}33`}">${emoji}</div>
          <div>
            <div style="font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:600;color:#fafafa">${label}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:2px">${desc}</div>
          </div>
        </button>`).join('')}
    </div>`
  card.querySelectorAll('.effort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      close()
      onEffort(btn.dataset.effort)
    })
  })
}


// ── Streak (weekly grouping) ──
function getMonday(date) {
  const d = new Date(date)
  const monOffset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - monOffset)
  d.setHours(12, 0, 0, 0)
  return d
}

function formatDate(d) { return d.toISOString().slice(0, 10) }

async function computeStreak(todayDateStr) {
  const allLogs = await Storage.getAllLogs()
  const trained = new Set()
  for (const log of allLogs) {
    if (log.weight && log.weight > 0) trained.add(log.date)
  }
  const today = new Date(todayDateStr + 'T12:00:00Z')
  const currentMonday = getMonday(today)
  let streak = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentMonday)
    d.setDate(currentMonday.getDate() + i)
    if (d > today) break
    if (trained.has(formatDate(d))) streak++
  }
  let weekStart = new Date(currentMonday)
  weekStart.setDate(weekStart.getDate() - 7)
  while (true) {
    let count = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      if (trained.has(formatDate(d))) count++
    }
    if (count >= 4) { streak += 7; weekStart.setDate(weekStart.getDate() - 7) }
    else break
  }
  return streak
}

function showStreakCelebration({ streak, accent, onDone }) {
  const overlay = document.createElement('div')
  overlay.id = 'streak-overlay'
  overlay.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.3s ease'

  const box = document.createElement('div')
  box.style.cssText = 'display:flex;flex-direction:column;align-items:center'

  const flame = document.createElement('div')
  flame.style.cssText = 'font-size:80px;line-height:1;animation:flameBounce 0.6s ease infinite alternate'
  flame.textContent = '🔥'

  const count = document.createElement('div')
  count.style.cssText = "font-family:'Space Grotesk',sans-serif;font-size:96px;font-weight:700;color:#fafafa;letter-spacing:-4px;line-height:1;margin-top:4px"
  count.textContent = '0'

  const label = document.createElement('div')
  label.style.cssText = "font-family:'JetBrains Mono',monospace;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-top:6px"
  label.textContent = 'Días consecutivos'

  const sub = document.createElement('div')
  sub.style.cssText = `font-family:'Space Grotesk',sans-serif;font-size:17px;font-weight:600;color:${accent};margin-top:14px;opacity:0;animation:fadeUp 0.4s ease 0.8s forwards`
  sub.textContent = '¡Sigue así!'

  box.append(flame, count, label, sub)
  overlay.appendChild(box)
  document.body.appendChild(overlay)

  let current = 0
  const steps = Math.min(streak, 30)
  const inc = Math.max(1, Math.ceil(streak / steps))
  const interval = setInterval(() => {
    current = Math.min(current + inc, streak)
    count.textContent = current
    if (current >= streak) clearInterval(interval)
  }, 40)

  setTimeout(() => {
    overlay.style.transition = 'opacity 0.3s ease'
    overlay.style.opacity = '0'
    setTimeout(() => {
      overlay.remove()
      onDone()
    }, 300)
  }, 2600)
}

// ── Rest Day ──
function renderRestDay(container, { weekDayName, dateStr, accent, weekObj, weekIdx }) {
  container.innerHTML = ''
  container.appendChild(PageHeader({ label: 'Hoy', title: 'Descanso.', accent, style: 'padding:58px 20px 0' }))
  container.insertAdjacentHTML('beforeend', `
    <div style="padding:20px;margin-top:8px">
      <div style="padding:28px;border-radius:24px;background:linear-gradient(155deg,#1a1a1a 0%,#0e0e0e 100%);border:0.5px solid rgba(255,255,255,0.08);position:relative;overflow:hidden">
        <div style="position:absolute;top:-40px;right:-40px;width:200px;height:200px;border-radius:50%;background:#9bd1ff;opacity:0.1;filter:blur(60px)"></div>
        <div style="position:relative;z-index:1">
          <span class="pill" style="background:rgba(155,209,255,0.15);color:#9bd1ff">DESCANSO</span>
          <div style="margin-top:12px;font-family:'Space Grotesk',sans-serif;font-size:30px;font-weight:700;color:#fafafa;letter-spacing:-1px;line-height:1.1">La recuperación es donde creces.</div>
          <div style="margin-top:8px;font-size:13px;color:rgba(255,255,255,0.55);line-height:1.5">Sin pesas hoy. Tómalo con calma${weekObj ? ' y prepara tu cuerpo para la ' + (weekIdx >= 2 ? 'Semana A' : 'próxima sesión') : ''}.</div>
        </div>
      </div>
    </div>
    <div style="margin-top:18px;margin-bottom:12px">
      <div class="section-label" style="--accent:#9bd1ff">Lista de recuperación</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;padding:0 20px">
      ${RECOVERY_TIPS.map((tip) => `
        <div style="display:flex;gap:14px;padding:14px;background:#141414;border-radius:16px;border:0.5px solid rgba(255,255,255,0.06);align-items:center">
          <div style="font-size:26px">${tip.icon}</div>
          <div style="flex:1">
            <div style="font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:600;color:#fafafa">${tip.title}</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.55);margin-top:2px">${tip.body}</div>
          </div>
        </div>`).join('')}
    </div>`)
}

// ── Empty State (first-time user, no data) ──
function renderEmptyState(page, { accent }) {
  page.innerHTML = ''
  const emptyFlex = document.createElement('div')
  emptyFlex.style.cssText = 'flex:1;display:flex;flex-direction:column;padding:0 20px'
  emptyFlex.appendChild(PageHeader({ label: 'Bienvenido', title: 'Entrenemos.', accent, style: 'padding:58px 20px 0' }))
  emptyFlex.insertAdjacentHTML('beforeend', `
      <div style="margin-top:20px;padding:24px;border-radius:22px;background:linear-gradient(155deg,#1a1a1a 0%,#0e0e0e 100%);border:0.5px solid rgba(255,255,255,0.08);position:relative;overflow:hidden">
        <div style="position:absolute;top:-40px;right:-40px;width:200px;height:200px;border-radius:50%;background:${accent};opacity:0.08;filter:blur(60px);pointer-events:none"></div>
        <div style="position:relative;z-index:1">
          <div style="width:40px;height:40px;border-radius:12px;background:${accent}1a;display:flex;align-items:center;justify-content:center;font-size:20px;margin-bottom:14px;border:0.5px solid ${accent}33">🔒</div>
          <div style="font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:700;color:#fafafa;letter-spacing:-0.6px;line-height:1.15">Tus datos, solo en tu teléfono</div>
          <div style="margin-top:10px;font-size:13.5px;color:rgba(255,255,255,0.6);line-height:1.55">Esta app no almacena nada en servidores. Todo lo que registras — ejercicios, pesos, programas — vive únicamente en este celular.</div>
          <div style="margin-top:18px;padding:14px;border-radius:14px;background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.06)">
            <div style="display:flex;align-items:center;gap:8px;font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:600;color:#fafafa;letter-spacing:-0.2px">
              <span>📋</span>
              <span>No pierdas tu progreso</span>
            </div>
            <div style="margin-top:6px;font-size:12.5px;color:rgba(255,255,255,0.5);line-height:1.5">Haz un respaldo cada 2 semanas desde <strong style="color:${accent}">Perfil → Datos → Exportar</strong>. Así siempre podrás recuperar tu historial si algo le pasa al teléfono.</div>
          </div>
          <button id="empty-state-start" style="margin-top:20px;width:100%;padding:15px;border-radius:14px;border:none;background:${accent};color:#0a0a0a;font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;letter-spacing:-0.2px">
            Comenzar
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
      <div style="margin-top:auto;text-align:center;padding:24px 0 30px">
        <div style="font-size:12px;color:rgba(255,255,255,0.3);font-family:'JetBrains Mono',monospace;letter-spacing:1px">Toca Comenzar para configurar tu rutina</div>
      </div>`)
  page.appendChild(emptyFlex)
  
  document.getElementById('empty-state-start')?.addEventListener('click', () => {
    window.location.hash = 'you'
  })
}
