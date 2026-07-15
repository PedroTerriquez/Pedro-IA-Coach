<script module lang="ts">
  declare function getExerciseDisplayName(exercise: any): string
  declare function findExerciseEntry(name: string): any
  declare function findExerciseEntryFuzzy(name: string, threshold?: number): any
  declare function buildAIDictionary(): any[]
  declare function resolveExerciseMedia(exercise: any): { imgUrl: string; gifUrl: string | null }
  declare function subscribePush(): Promise<void>
  declare function installPWA(): void
  declare const AI_SYSTEM_PROMPT: string
  declare const AI_PROGRAM_COACH_PROMPT: string
  declare const PUSH_SERVER_URL: string
  declare const APP_VERSION: string
</script>

<script lang="ts">
  import { onMount } from 'svelte'
  import { settings } from '$lib/stores/settings'
  import { toast } from '$lib/stores/ui'
  import * as Storage from '$lib/storage'
  import { generateId, getAll, put } from '$lib/db'
  import type { Exercise, ExerciseLog, Program, Settings } from '$lib/types'

  let activeTab = $state<'perfil' | 'programas' | 'ejercicios' | 'datos'>('perfil')
  let exercises = $state<Exercise[]>([])
  let allLogs = $state<ExerciseLog[]>([])
  let programs = $state<Program[]>([])
  let loaded = $state(false)
  let userName = $state('Pedro')
  let height = $state('')
  let weight = $state('')
  let sex = $state('')
  let age = $state('')
  let goal = $state('')
  let experience = $state('')
  let occupation = $state('')

  // Exercise tab state
  let exerciseSearch = $state('')
  let showNewExercise = $state(false)
  let newExerciseName = $state('')
  let newExerciseMuscle = $state('')
  let expandedExerciseId = $state<string | null>(null)
  let editingExerciseId = $state<string | null>(null)
  let editName = $state('')
  let editMuscle = $state('')
  let editImgUrl = $state('')
  let editTips = $state('')
  let editAlts = $state<{ name: string; reason: string }[]>([])

  // Program tab state
  let newProgramName = $state('')
  let coachInput = $state('')
  let coachStatus = $state('')
  let coachResponseVisible = $state(false)
  let coachResponseText = $state('')
  let coachProvider = $state('')

  // Datos tab state
  let aiInput = $state('')
  let aiStatus = $state('')
  let importingAI = $state(false)
  let jsonImportStatus = $state('')
  let jsonExportStatus = $state('')
  let dictMigrateStatus = $state('')
  let dictSkippedNames = $state<string[]>([])
  let showSkippedOverlay = $state(false)
  let exercisesImportStatus = $state('')
  let exercisesExportStatus = $state('')

  let accent = $derived($settings.accentColor || '#d4ff3a')
  let units = $derived($settings.units || 'kg')

  let stats = $derived.by(() => {
    if (!loaded || allLogs.length === 0) return { streak: 0, totalWorkouts: 0, weeks: 0, distinctExercises: 0 }
    const dates = [...new Set(allLogs.map(l => l.date))].sort()
    const distinctIds = new Set(allLogs.map(l => l.exerciseId))
    let streakCount = 0
    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)
    let checkDate = new Date(today)
    for (let i = dates.length - 1; i >= 0; i--) {
      const expected = checkDate.toISOString().slice(0, 10)
      if (dates[i] === expected) {
        streakCount++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (dates[i] < expected) {
        if (i === dates.length - 1 && dates[i] === todayStr) {
          checkDate.setDate(checkDate.getDate() - 1)
          continue
        }
        break
      }
    }
    const firstDate = new Date(dates[0])
    const weeksDiff = Math.max(1, Math.floor((today.getTime() - firstDate.getTime()) / (7 * 86400000)))
    return { streak: streakCount, totalWorkouts: dates.length, weeks: weeksDiff, distinctExercises: distinctIds.size }
  })

  let filteredExercises = $derived(
    exercises.filter(ex =>
      !exerciseSearch ||
      ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      (ex.muscle || '').toLowerCase().includes(exerciseSearch.toLowerCase())
    )
  )

  function setTab(tab: typeof activeTab) {
    activeTab = tab
  }

  function toLocalDateStr(date: Date): string {
    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    return d.toISOString().slice(0, 10)
  }

  function getToday(): string { return toLocalDateStr(new Date()) }

  async function loadAll() {
    const [exs, logs, progs] = await Promise.all([
      Storage.getExercises(),
      Storage.getAllLogs(),
      Storage.getPrograms()
    ])
    exercises = exs.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    allLogs = logs
    programs = progs
    const s = await Storage.getSettings()
    userName = s.userName || 'Pedro'
    height = s.height || ''
    weight = s.weight || ''
    sex = s.sex || ''
    age = s.age || ''
    goal = s.goal || ''
    experience = s.experience || ''
    occupation = s.occupation || ''
    loaded = true
  }

  onMount(() => { loadAll() })

  function refresh() { loadAll() }

  // ── Perfil tab ──

  async function saveProfileField(field: string, value: string) {
    const s = await Storage.getSettings()
    ;(s as any)[field] = value
    await Storage.saveSettings(s)
    settings.update({ [field]: value } as any)
  }

  async function toggleUnits() {
    const newUnits = units === 'kg' ? 'lb' : 'kg'
    await settings.update({ units: newUnits })
  }

  async function onAccentChange(e: Event) {
    const val = (e.target as HTMLInputElement).value
    await settings.update({ accentColor: val })
    document.documentElement.style.setProperty('--accent', val)
  }

  async function toggleWatch() {
    await settings.update({ hasWatch: !$settings.hasWatch })
  }

  async function onNotifClick() {
    if (Notification.permission === 'granted') {
      toast.show('Notificaciones ya activadas')
      return
    }
    if (Notification.permission === 'denied') {
      toast.show('Permiso denegado. Actívalo en Ajustes del sistema.', true)
      return
    }
    const result = await Notification.requestPermission()
    if (result === 'granted') {
      toast.show('Notificaciones activadas')
      if (typeof subscribePush === 'function') await subscribePush()
    } else {
      toast.show('Notificaciones denegadas', true)
    }
  }

  async function toggleLang() {
    const s = await Storage.getSettings()
    const newLang = s.language === 'en' ? 'es' : 'en'
    await settings.update({ language: newLang })
  }

  // ── Programas tab ──

  async function createNewProgram() {
    const name = newProgramName.trim() || 'Nuevo programa'
    const program: Program = {
      id: await generateId(),
      name,
      weeks: [{
        name: 'Semana 1', subtitle: '', tag: 'VOLUMEN',
        days: [
          { name: 'Día 1', subtitle: '', duration: 60, exercises: [] },
          { name: 'Día 2', subtitle: '', duration: 60, exercises: [] },
          { name: 'Día 3', subtitle: '', duration: 60, exercises: [] }
        ]
      }]
    }
    await Storage.saveProgram(program)
    newProgramName = ''
    toast.show('Programa creado')
    refresh()
  }

  async function activateProgram(id: string) {
    await settings.update({ activeProgramId: id })
    toast.show('Programa activado')
    refresh()
  }

  async function duplicateProgram(p: Program) {
    const dup: Program = {
      id: await generateId(),
      name: p.name + ' (copia)',
      weeks: JSON.parse(JSON.stringify(p.weeks))
    }
    await Storage.saveProgram(dup)
    toast.show('Programa duplicado')
    refresh()
  }

  async function deleteProgram(p: Program) {
    if (!confirm(`¿Eliminar "${p.name}"?`)) return
    await Storage.deleteProgram(p.id)
    const s = await Storage.getSettings()
    if (s.activeProgramId === p.id) {
      await settings.update({ activeProgramId: null })
    }
    toast.show('Programa eliminado')
    refresh()
  }

  async function submitCoach() {
    const text = coachInput.trim()
    if (!text) { coachStatus = '⚠️ Escribe tu pregunta o petición'; return }
    const activeProgram = programs.find(p => p.id === $settings.activeProgramId)
    if (!activeProgram) { coachStatus = '⚠️ No hay un programa activo'; return }
    coachStatus = '⏳ Consultando al coach…'
    coachResponseVisible = false
    try {
      const res = await fetch(`${PUSH_SERVER_URL}/api/ai/program-coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, program: activeProgram, settings: $settings, dictionary: buildAIDictionary() })
      })
      const data = await res.json()
      if (data.program) {
        const prog: Program = {
          id: await generateId(),
          name: data.program_name || data.program.name || 'Programa Coach',
          weeks: data.program.weeks || []
        }
        if (prog.weeks.length > 0) {
          for (const week of prog.weeks) {
            for (const day of week.days) {
              for (const ex of day.exercises) {
                const resolved = await Storage.findOrCreateExerciseByName(
                  (ex as any)._exerciseName || ex.exerciseId, (ex as any).muscle || '', { noFuzzy: true }
                )
                ex.exerciseId = resolved.id
              }
            }
          }
          await Storage.saveProgram(prog)
          await settings.update({ activeProgramId: prog.id })
          coachStatus = `✅ Nuevo programa "${prog.name}" creado y activado`
          refresh()
        } else {
          coachResponseText = 'El programa generado no tiene semanas válidas. Intenta de nuevo.'
          coachResponseVisible = true
          coachStatus = ''
        }
      } else {
        coachResponseText = data.message || 'Listo.'
        coachProvider = data._provider || 'llama'
        coachResponseVisible = true
        coachStatus = ''
      }
    } catch (err: any) {
      coachStatus = `❌ ${err.message}`
    }
    coachInput = ''
  }

  // ── Ejercicios tab ──

  function resetNewExercise() {
    showNewExercise = false
    newExerciseName = ''
    newExerciseMuscle = ''
  }

  async function saveNewExercise() {
    const name = newExerciseName.trim()
    if (!name) return
    const ex: Exercise = {
      id: await generateId(), name, muscle: newExerciseMuscle.trim(),
      imgUrl: '', gifUrl: '', tips: [], alternatives: []
    }
    await Storage.saveExercise(ex)
    resetNewExercise()
    toast.show('Ejercicio creado')
    refresh()
  }

  function beginEdit(ex: Exercise) {
    editingExerciseId = ex.id
    editName = ex.name
    editMuscle = ex.muscle
    editImgUrl = ex.imgUrl || ''
    editTips = (ex.tips || []).join('\n')
    editAlts = (ex.alternatives || []).map(a => ({ ...a }))
  }

  function cancelEdit() {
    editingExerciseId = null
  }

  async function saveEdit(ex: Exercise) {
    const updated: Exercise = {
      ...ex,
      name: editName.trim() || ex.name,
      muscle: editMuscle.trim(),
      imgUrl: editImgUrl.trim(),
      tips: editTips.split('\n').map(l => l.trim()).filter(Boolean),
      alternatives: editAlts.filter(a => a.name.trim())
    }
    await Storage.saveExercise(updated)
    editingExerciseId = null
    toast.show('Ejercicio actualizado')
    refresh()
  }

  function addAlt() {
    editAlts = [...editAlts, { name: '', reason: '' }]
  }

  function removeAlt(i: number) {
    editAlts = editAlts.filter((_, idx) => idx !== i)
  }

  async function deleteExerciseConfirm(ex: Exercise) {
    if (!confirm(`¿Eliminar "${ex.name}"? Esto eliminará todos los registros.`)) return
    await Storage.deleteExercise(ex.id)
    toast.show('Ejercicio eliminado')
    refresh()
  }

  function toggleExpanded(id: string) {
    expandedExerciseId = expandedExerciseId === id ? null : id
  }

  // ── Datos tab ──

  async function submitAIImport() {
    const text = aiInput.trim()
    if (!text) { aiStatus = '⚠️ Pega tu rutina primero'; return }
    importingAI = true
    aiStatus = '⏳ Procesando…'
    try {
      const res = await fetch(`${PUSH_SERVER_URL}/api/ai/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, systemPrompt: AI_SYSTEM_PROMPT, dictionary: buildAIDictionary() })
      })
      const data = await res.json()
      if (!data.weeks || data.weeks.length === 0) throw new Error('La IA no pudo generar un programa válido')
      for (const week of data.weeks) {
        for (const day of week.days) {
          for (const ex of day.exercises) {
            const resolved = await Storage.findOrCreateExerciseByName(
              ex.name || ex.exerciseId, ex.muscle || '', { noFuzzy: true }
            )
            ex.exerciseId = resolved.id
          }
        }
      }
      const program: Program = {
        id: await generateId(),
        name: data.program_name || 'Importado con IA',
        weeks: data.weeks
      }
      await Storage.saveProgram(program)
      await settings.update({ activeProgramId: program.id })
      aiStatus = `✅ Importado "${program.name}" con ${program.weeks.length} semana(s)`
      aiInput = ''
      refresh()
    } catch (err: any) {
      aiStatus = `❌ ${err.message}`
    } finally {
      importingAI = false
    }
  }

  async function onExercisesImport(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const list = Array.isArray(data) ? data : data.exercises || []
      let count = 0
      for (const item of list) {
        if (item.name) {
          if (!item.id) item.id = await generateId()
          await put('exercises', item)
          count++
        }
      }
      exercisesImportStatus = `✅ ${count} ejercicios importados`
      refresh()
    } catch (err: any) {
      exercisesImportStatus = `❌ ${err.message}`
    }
    input.value = ''
  }

  async function onLogsImport(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const result = await Storage.importLogsAndSettings(text)
      const parts: string[] = []
      if (result.exercises) parts.push(`${result.exercises} ejercicios`)
      if (result.programs) parts.push(`${result.programs} programas`)
      if (result.logs) parts.push(`${result.logs} logs`)
      jsonImportStatus = `✅ Importados ${parts.join(', ')}`
      refresh()
    } catch (err: any) {
      jsonImportStatus = `❌ ${err.message}`
    }
    input.value = ''
  }

  async function onExercisesExport() {
    try {
      const all = await getAll<Exercise>('exercises')
      const json = JSON.stringify(all, null, 2)
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ejercicios-${getToday()}.json`
      a.click()
      URL.revokeObjectURL(url)
      exercisesExportStatus = `✅ ${all.length} ejercicios exportados`
    } catch (err: any) {
      exercisesExportStatus = `❌ ${err.message}`
    }
  }

  async function onLogsExport() {
    try {
      const json = await Storage.exportLogsAndSettings()
      const parsed = JSON.parse(json)
      const parts: string[] = []
      if (parsed.exercises?.length) parts.push(`${parsed.exercises.length} ejercicios`)
      if (parsed.programs?.length) parts.push(`${parsed.programs.length} programas`)
      if (parsed.exerciseLogs?.length) parts.push(`${parsed.exerciseLogs.length} logs`)
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `training-backup-${getToday()}.json`
      a.click()
      URL.revokeObjectURL(url)
      jsonExportStatus = `✅ Exportado (${parts.join(', ')})`
    } catch (err: any) {
      jsonExportStatus = `❌ ${err.message}`
    }
  }

  async function runDictMigration(force: boolean) {
    dictMigrateStatus = '⏳ Aplicando…'
    try {
      const result = await Storage.migrateExercisesToDictionary({ force })
      if (result.dictMissing) {
        dictMigrateStatus = '❌ Diccionario no cargado'
      } else if (result.alreadyDone) {
        dictMigrateStatus = '⚠️ Ya aplicado — usa Forzar para re-ejecutar'
      } else {
        dictMigrateStatus = `✅ Actualizados ${result.migrated} · fusionados ${result.merged} · sin match ${result.skipped}`
        dictSkippedNames = result.skippedNames || []
        if (dictSkippedNames.length) dictMigrateStatus += `. ${dictSkippedNames.length} sin match en diccionario.`
      }
      refresh()
    } catch (err: any) {
      dictMigrateStatus = `❌ ${err.message}`
    }
  }

  function getTotalExercises(program: Program): number {
    return program.weeks.reduce((s, w) => s + w.days.reduce((sd, d) => sd + d.exercises.length, 0), 0)
  }

  function getLastLogWeight(exerciseId: string): string {
    const logs = allLogs.filter(l => l.exerciseId === exerciseId)
    if (logs.length === 0) return ''
    const last = logs[logs.length - 1]
    return `${last.weight}${last.units || units}`
  }

  function permLabel(): string {
    if (typeof Notification === 'undefined') return 'No disponible'
    return Notification.permission === 'granted' ? 'Activadas'
      : Notification.permission === 'denied' ? 'Denegadas' : 'Preguntar'
  }

  function permActive(): boolean {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted'
  }

  const APP_VERSION_STR = typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'v1.70'
</script>

<div class="page">
  <div class="page-header">
    <div class="page-header-eyebrow">Perfil</div>
    <div class="page-header-title" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span id="user-name" contenteditable role="textbox" aria-multiline="false" tabindex="0" style="outline:none;border:0;caret-color:{accent};display:inline-block;min-width:50px"
        onblur={async (e) => { const v = (e.target as HTMLElement).textContent?.trim() || 'Pedro'; userName = v; await saveProfileField('userName', v) }}
        onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur() } }}
      >{userName}</span>
      <button id="user-edit-btn" aria-label="Editar nombre" style="background:none;border:0;cursor:pointer;flex-shrink:0;margin-top:6px;padding:0"
        onclick={() => { const el = document.getElementById('user-name'); if (el) { el.focus(); const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(el); range.collapse(false); sel?.removeAllRanges(); sel?.addRange(range) } }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
      </button>
    </div>
  </div>

  <div class="you-tabs" style="margin:0 20px;display:flex;padding:3px;border-radius:11px;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.06)">
    <button id="you-tab-perfil" class="you-tab-btn" class:you-tab-active={activeTab === 'perfil'} style="flex:1;padding:8px 0;border:0;cursor:pointer;background:{activeTab === 'perfil' ? '#262626' : 'transparent'};color:{activeTab === 'perfil' ? '#fafafa' : 'rgba(255,255,255,0.5)'};font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:600;letter-spacing:-0.1px;border-radius:8px" onclick={() => setTab('perfil')}>Perfil</button>
    <button id="you-tab-programas" class="you-tab-btn" class:you-tab-active={activeTab === 'programas'} style="flex:1;padding:8px 0;border:0;cursor:pointer;background:{activeTab === 'programas' ? '#262626' : 'transparent'};color:{activeTab === 'programas' ? '#fafafa' : 'rgba(255,255,255,0.5)'};font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:600;letter-spacing:-0.1px;border-radius:8px" onclick={() => setTab('programas')}>Programas</button>
    <button id="you-tab-ejercicios" class="you-tab-btn" class:you-tab-active={activeTab === 'ejercicios'} style="flex:1;padding:8px 0;border:0;cursor:pointer;background:{activeTab === 'ejercicios' ? '#262626' : 'transparent'};color:{activeTab === 'ejercicios' ? '#fafafa' : 'rgba(255,255,255,0.5)'};font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:600;letter-spacing:-0.1px;border-radius:8px" onclick={() => setTab('ejercicios')}>Ejercicios</button>
    <button id="you-tab-datos" class="you-tab-btn" class:you-tab-active={activeTab === 'datos'} style="flex:1;padding:8px 0;border:0;cursor:pointer;background:{activeTab === 'datos' ? '#262626' : 'transparent'};color:{activeTab === 'datos' ? '#fafafa' : 'rgba(255,255,255,0.5)'};font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:600;letter-spacing:-0.1px;border-radius:8px" onclick={() => setTab('datos')}>Datos</button>
  </div>

  <div style="margin-top:20px">
    {#if activeTab === 'perfil'}
      <div class="section-label" style="margin-bottom:10px"><span style="width:4px;height:4px;border-radius:50%;background:{accent};flex-shrink:0"></span>Mis datos</div>
      <div id="you-profile-card" class="you-card">
        <div class="you-row"><div style="font-family:'Space Grotesk',sans-serif;font-size:13.5px;color:#fafafa;font-weight:500">Estatura</div><div style="display:flex;align-items:center;gap:4px"><input id="height-input" type="number" bind:value={height} onblur={() => saveProfileField('height', height)} style="width:72px;padding:6px 8px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.1);background:#0a0a0a;color:#fafafa;font-size:13px;text-align:right;outline:none;box-sizing:border-box;font-family:'JetBrains Mono',monospace"><span style="font-size:12px;color:rgba(255,255,255,0.55);font-family:'JetBrains Mono',monospace">cm</span></div></div>
        <div class="you-row"><div style="font-family:'Space Grotesk',sans-serif;font-size:13.5px;color:#fafafa;font-weight:500">Peso</div><div style="display:flex;align-items:center;gap:4px"><input id="weight-input" type="number" bind:value={weight} onblur={() => saveProfileField('weight', weight)} style="width:72px;padding:6px 8px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.1);background:#0a0a0a;color:#fafafa;font-size:13px;text-align:right;outline:none;box-sizing:border-box;font-family:'JetBrains Mono',monospace"><span style="font-size:12px;color:rgba(255,255,255,0.55);font-family:'JetBrains Mono',monospace">kg</span></div></div>
        <div class="you-row"><div style="font-family:'Space Grotesk',sans-serif;font-size:13.5px;color:#fafafa;font-weight:500">Sexo</div><select id="sex-input" bind:value={sex} onchange={() => saveProfileField('sex', sex)} style="padding:6px 8px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.1);background:#0a0a0a;color:#fafafa;font-size:13px;outline:none;box-sizing:border-box;font-family:'Space Grotesk',sans-serif;cursor:pointer"><option value="">Seleccionar</option><option value="Masculino">Masculino</option><option value="Femenino">Femenino</option><option value="Otro">Otro</option></select></div>
        <div class="you-row"><div style="font-family:'Space Grotesk',sans-serif;font-size:13.5px;color:#fafafa;font-weight:500">Edad</div><input id="age-input" type="number" bind:value={age} onblur={() => saveProfileField('age', age)} style="width:72px;padding:6px 8px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.1);background:#0a0a0a;color:#fafafa;font-size:13px;text-align:right;outline:none;box-sizing:border-box;font-family:'JetBrains Mono',monospace"></div>
        <div class="you-row"><div style="font-family:'Space Grotesk',sans-serif;font-size:13.5px;color:#fafafa;font-weight:500">Objetivo</div><select id="goal-input" bind:value={goal} onchange={() => saveProfileField('goal', goal)} style="padding:6px 8px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.1);background:#0a0a0a;color:#fafafa;font-size:13px;outline:none;box-sizing:border-box;font-family:'Space Grotesk',sans-serif;cursor:pointer"><option value="">Seleccionar</option><option value="hipertrofia">Hipertrofia</option><option value="fuerza">Fuerza</option><option value="perdida de grasa">Pérdida de grasa</option><option value="recomposicion">Recomposición</option><option value="rendimiento">Rendimiento</option></select></div>
        <div class="you-row"><div style="font-family:'Space Grotesk',sans-serif;font-size:13.5px;color:#fafafa;font-weight:500">Experiencia</div><select id="exp-input" bind:value={experience} onchange={() => saveProfileField('experience', experience)} style="padding:6px 8px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.1);background:#0a0a0a;color:#fafafa;font-size:13px;outline:none;box-sizing:border-box;font-family:'Space Grotesk',sans-serif;cursor:pointer"><option value="">Seleccionar</option><option value="principiante">Principiante</option><option value="intermedio">Intermedio</option><option value="avanzado">Avanzado</option></select></div>
        <div class="you-row" style="border-bottom:0"><div style="font-family:'Space Grotesk',sans-serif;font-size:13.5px;color:#fafafa;font-weight:500">Profesión</div><input id="occ-input" type="text" bind:value={occupation} onblur={() => saveProfileField('occupation', occupation)} placeholder="Ej: Ingeniero, oficinista, repartidor…" style="width:160px;padding:6px 8px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.1);background:#0a0a0a;color:#fafafa;font-size:13px;text-align:right;outline:none;box-sizing:border-box;font-family:'Space Grotesk',sans-serif"></div>
      </div>

      <div class="section-label" style="margin:24px 0 10px"><span style="width:4px;height:4px;border-radius:50%;background:{accent};flex-shrink:0"></span>Ajustes rápidos</div>
      <div id="you-quick-card" class="you-card">
        <div class="you-row"><div style="font-family:'Space Grotesk',sans-serif;font-size:13.5px;color:#fafafa;font-weight:500">Unidades</div><button id="units-btn" onclick={toggleUnits} style="font-size:12px;color:rgba(255,255,255,0.55);font-family:'JetBrains Mono',monospace;background:none;border:0;cursor:pointer">{units === 'kg' ? 'Kilogramos (kg)' : 'Libras (lb)'}</button></div>
        <div class="you-row"><div style="font-family:'Space Grotesk',sans-serif;font-size:13.5px;color:#fafafa;font-weight:500">Color de acento</div><div style="display:flex;gap:6px;align-items:center"><input type="color" id="accent-input" value={accent} oninput={onAccentChange} style="width:40px;height:28px;border:0.5px solid rgba(255,255,255,0.1);border-radius:6px;padding:0;background:transparent;cursor:pointer"></div></div>
        <div class="you-row"><div style="font-family:'Space Grotesk',sans-serif;font-size:13.5px;color:#fafafa;font-weight:500">Smartwatch</div><button id="watch-toggle-btn" onclick={toggleWatch} style="padding:6px 12px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.1);cursor:pointer;background:{$settings.hasWatch ? `${accent}22` : 'transparent'};color:{$settings.hasWatch ? accent : 'rgba(255,255,255,0.55)'};font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:600">{$settings.hasWatch ? 'Sí' : 'No'}</button></div>
        <div class="you-row"><div style="font-family:'Space Grotesk',sans-serif;font-size:13.5px;color:#fafafa;font-weight:500">Notificaciones</div><button id="notif-perm-btn" onclick={onNotifClick} style="padding:6px 12px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.1);cursor:pointer;background:{permActive() ? `${accent}22` : 'transparent'};color:{permActive() ? accent : 'rgba(255,255,255,0.55)'};font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:600">{permLabel()}</button></div>
        <div class="you-row"><div style="font-family:'Space Grotesk',sans-serif;font-size:13.5px;color:#fafafa;font-weight:500">Idioma</div><button id="lang-toggle-btn" onclick={toggleLang} style="padding:6px 12px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.1);cursor:pointer;background:transparent;color:rgba(255,255,255,0.55);font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:600">{$settings.language === 'en' ? 'English' : 'Español'}</button></div>
        <div class="you-row" style="border-bottom:0"><div style="font-family:'Space Grotesk',sans-serif;font-size:13.5px;color:#fafafa;font-weight:500">Instalar app</div><button id="install-btn" onclick={() => installPWA()} style="padding:6px 12px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.1);cursor:pointer;background:transparent;color:rgba(255,255,255,0.55);font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:600">Añadir</button></div>
      </div>

      {#if loaded}
        <div class="section-label" style="margin:24px 0 10px"><span style="width:4px;height:4px;border-radius:50%;background:{accent};flex-shrink:0"></span>Estadísticas</div>
        <div class="you-card" style="padding:16px 14px;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px">
          <div style="text-align:center"><div style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:600;color:#fafafa">{stats.streak}</div><div style="font-size:9px;color:rgba(255,255,255,0.45);letter-spacing:0.6px;text-transform:uppercase;margin-top:2px">Racha</div></div>
          <div style="text-align:center"><div style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:600;color:#fafafa">{stats.totalWorkouts}</div><div style="font-size:9px;color:rgba(255,255,255,0.45);letter-spacing:0.6px;text-transform:uppercase;margin-top:2px">Entrenos</div></div>
          <div style="text-align:center"><div style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:600;color:#fafafa">{stats.weeks}</div><div style="font-size:9px;color:rgba(255,255,255,0.45);letter-spacing:0.6px;text-transform:uppercase;margin-top:2px">Semanas</div></div>
          <div style="text-align:center"><div style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:600;color:#fafafa">{stats.distinctExercises}</div><div style="font-size:9px;color:rgba(255,255,255,0.45);letter-spacing:0.6px;text-transform:uppercase;margin-top:2px">Ejercicios</div></div>
        </div>
      {/if}

      <div style="display:flex;align-items:center;justify-content:space-between;margin:16px 20px 0">
        <div style="font-size:10px;color:rgba(255,255,255,0.3);font-family:'JetBrains Mono',monospace">{APP_VERSION_STR}</div>
        <button id="refresh-btn" onclick={refresh} style="padding:5px 10px;border-radius:6px;border:0.5px solid rgba(255,255,255,0.08);cursor:pointer;background:transparent;color:rgba(255,255,255,0.4);font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:500">↻</button>
      </div>

    {:else if activeTab === 'programas'}
      <div style="margin:0 20px 12px">
        <div class="you-card" style="padding:14px 16px">
          <div style="display:flex;gap:10px;align-items:center">
            <input bind:value={newProgramName} placeholder="Nombre del nuevo programa" style="flex:1;padding:10px 12px;border-radius:10px;border:0.5px solid rgba(255,255,255,0.1);background:#0a0a0a;color:#fafafa;font-size:14px;outline:none;box-sizing:border-box;font-family:'Space Grotesk',sans-serif">
            <button onclick={createNewProgram} style="flex-shrink:0;padding:10px 18px;border-radius:10px;border:0;cursor:pointer;background:{accent};color:#0a0a0a;font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:700">+ Nuevo</button>
          </div>
        </div>
      </div>

      {#if programs.length === 0}
        <div style="padding:40px 20px;text-align:center;font-size:13px;color:rgba(255,255,255,0.4)">No hay programas todavía. Crea o importa uno.</div>
      {:else}
        <div style="padding:0 20px;display:flex;flex-direction:column;gap:8px">
          {#each programs as p (p.id)}
            {@const isActive = $settings.activeProgramId === p.id}
            <div class="you-card" style="padding:14px;display:flex;flex-wrap:wrap;align-items:center;gap:8px" data-program-id={p.id}>
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:6px">
                  <div style="font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:600;color:#fafafa;letter-spacing:-0.3px">{p.name}</div>
                  {#if isActive}
                    <span class="pill" style="background:{accent}22;color:{accent};font-size:8px">ACTIVO</span>
                  {/if}
                </div>
                <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:2px">{p.weeks.length} semana(s) · {getTotalExercises(p)} ejercicios totales</div>
              </div>
              {#if !isActive}
                <button class="activate-btn" onclick={() => activateProgram(p.id)} style="padding:8px 14px;border-radius:8px;border:0;cursor:pointer;background:{accent}22;color:{accent};font-size:13px">Activar</button>
              {/if}
              <button class="dup-prog-btn" onclick={() => duplicateProgram(p)} style="padding:8px 14px;border-radius:8px;border:0;cursor:pointer;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.6);font-size:13px">Duplicar</button>
              <button class="del-prog-btn" onclick={() => deleteProgram(p)} style="padding:8px 14px;border-radius:8px;border:0;cursor:pointer;background:rgba(255,107,107,0.12);color:#ff6b6b;font-size:13px">Eliminar</button>
            </div>
          {/each}
        </div>
      {/if}

      <div style="margin:20px 20px 0">
        <div id="you-prog-coach-card" class="you-card" style="overflow:hidden">
          <div style="padding:14px 16px">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="width:28px;height:28px;border-radius:8px;background:{accent}1f;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><path d="M2.5 8.2c0-2.8 2.9-5 6.5-5s6.5 2.2 6.5 5-2.9 5-6.5 5c-.7 0-1.4-.08-2-.23L3.2 14.7l.5-2.4C2.95 11.4 2.5 9.9 2.5 8.2z" stroke="{accent}" stroke-width="1.5" stroke-linejoin="round" fill="none"/><circle cx="9" cy="8.2" r="0.95" fill="{accent}"/><circle cx="6" cy="8.2" r="0.95" fill="{accent}"/><circle cx="12" cy="8.2" r="0.95" fill="{accent}"/></svg>
              </span>
              <div>
                <div style="font-size:13px;color:#fafafa;font-weight:600;font-family:'Space Grotesk',sans-serif">Coach IA de programas</div>
                <div style="font-size:10px;color:rgba(255,255,255,0.45);margin-top:1px;line-height:1.4">Pregunta o pide cambios en tu rutina.</div>
              </div>
            </div>
            <textarea id="prog-coach-input" bind:value={coachInput} rows="4" placeholder='Ej: "Cambia press banca por press inclinado", "¿Está balanceada mi rutina?"' style="width:100%;margin-top:10px;padding:10px 12px;border-radius:10px;border:0.5px solid rgba(255,255,255,0.1);background:#0a0a0a;color:#fafafa;font-size:13px;font-family:'Space Grotesk',sans-serif;outline:none;resize:vertical;box-sizing:border-box;line-height:1.5"></textarea>
            <div id="prog-coach-status" style="margin-top:4px;font-size:10px;font-family:'JetBrains Mono',monospace;color:rgba(255,255,255,0.35);letter-spacing:0.2px;min-height:14px">{coachStatus}</div>
          </div>
          <button id="prog-coach-btn" onclick={submitCoach} style="margin:0 16px 14px;width:calc(100% - 32px);padding:10px;border-radius:10px;border:0;cursor:pointer;background:{accent};color:#0a0a0a;font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:700">Enviar al coach</button>
          {#if coachResponseVisible}
            <div id="prog-coach-response" style="padding:0 16px 14px">
              <div style="padding:12px 14px;background:rgba(255,255,255,0.03);border-radius:10px;border-left:3px solid {accent}">
                <div style="font-size:10px;font-family:'JetBrains Mono',monospace;color:{accent};letter-spacing:1.2px;text-transform:uppercase;font-weight:600;margin-bottom:6px">Coach IA</div>
                <div id="prog-coach-response-text" style="font-size:13px;color:rgba(255,255,255,0.85);line-height:1.5;font-family:'Space Grotesk',sans-serif;white-space:pre-wrap">{coachResponseText}</div>
                <div style="margin-top:6px">
                  <span id="prog-coach-provider" style="font-size:9px;font-family:'JetBrains Mono',monospace;letter-spacing:0.6px;color:rgba(255,255,255,0.3);text-transform:uppercase">{coachProvider}</span>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>

    {:else if activeTab === 'ejercicios'}
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0 20px 12px">
        <div class="ex-count" style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.6px;text-transform:uppercase;color:rgba(255,255,255,0.5);font-weight:500">{exercises.length} ejercicios</div>
        <button onclick={() => showNewExercise = !showNewExercise} style="padding:8px 16px;border-radius:8px;border:0;cursor:pointer;background:{accent};color:#0a0a0a;font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:700">+ Nuevo</button>
      </div>

      {#if showNewExercise}
        <div class="you-card" style="margin:0 20px 12px;padding:14px 16px">
          <div style="font-size:13px;color:#fafafa;font-weight:600;font-family:'Space Grotesk',sans-serif;margin-bottom:10px">Nuevo ejercicio</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <input bind:value={newExerciseName} placeholder="Nombre del ejercicio" style="width:100%;padding:10px 12px;border-radius:10px;border:0.5px solid rgba(255,255,255,0.1);background:#0a0a0a;color:#fafafa;font-size:14px;outline:none;box-sizing:border-box;font-family:'Space Grotesk',sans-serif">
            <input bind:value={newExerciseMuscle} placeholder="Músculo (ej: Pecho, Espalda)" style="width:100%;padding:10px 12px;border-radius:10px;border:0.5px solid rgba(255,255,255,0.1);background:#0a0a0a;color:#fafafa;font-size:14px;outline:none;box-sizing:border-box;font-family:'Space Grotesk',sans-serif">
            <div style="display:flex;gap:8px">
              <button onclick={saveNewExercise} style="flex:1;padding:10px;border-radius:10px;border:0;cursor:pointer;background:{accent};color:#0a0a0a;font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:700">Guardar</button>
              <button onclick={resetNewExercise} style="flex:1;padding:10px;border-radius:10px;border:0;cursor:pointer;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.6);font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:600">Cancelar</button>
            </div>
          </div>
        </div>
      {/if}

      <input type="text" bind:value={exerciseSearch} placeholder="Buscar ejercicio…" style="margin:0 20px 10px;padding:10px 14px;border-radius:10px;border:0.5px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:#fafafa;font-family:'Space Grotesk',sans-serif;font-size:14px;outline:none;width:calc(100% - 40px);box-sizing:border-box">

      {#if loaded && exercises.length === 0}
        <div style="padding:40px 20px;text-align:center;font-size:13px;color:rgba(255,255,255,0.4)">No hay ejercicios todavía. Crea tu primero.</div>
      {:else if filteredExercises.length === 0}
        <div style="padding:40px 20px;text-align:center;font-size:13px;color:rgba(255,255,255,0.4)">Ningún ejercicio coincide con la búsqueda.</div>
      {:else}
        <div style="display:flex;flex-direction:column;gap:8px;padding:0 20px 20px">
          {#each filteredExercises as ex (ex.id)}
            <div class="you-card" style="padding:0;overflow:hidden" data-exercise-id={ex.id}>
              <button onclick={() => toggleExpanded(ex.id)} style="width:100%;background:transparent;border:0;cursor:pointer;padding:14px;display:flex;align-items:center;gap:12px;color:inherit;text-align:left;font-family:inherit">
                {#if resolveExerciseMedia(ex).imgUrl}
                  <img src={resolveExerciseMedia(ex).imgUrl} alt="" style="width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0;background:#0a0a0a">
                {:else}
                  <div style="width:44px;height:44px;border-radius:8px;flex-shrink:0;background:#0a0a0a"></div>
                {/if}
                <div style="flex:1;min-width:0;text-align:left">
                  <div style="font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:600;color:#fafafa;letter-spacing:-0.3px">{ex.name}</div>
                  <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:2px">{ex.muscle}</div>
                </div>
                <span style="font-size:10px;color:rgba(255,255,255,0.3);font-family:'JetBrains Mono',monospace">{expandedExerciseId === ex.id ? '▲' : '▼'}</span>
              </button>

              {#if expandedExerciseId === ex.id}
                <div style="padding:0 14px 14px;border-top:0.5px solid rgba(255,255,255,0.04)">
                  {#if editingExerciseId === ex.id}
                    <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
                      <input bind:value={editName} placeholder="Nombre" style="width:100%;padding:10px 12px;border-radius:10px;border:0.5px solid rgba(255,255,255,0.1);background:#0a0a0a;color:#fafafa;font-size:14px;outline:none;box-sizing:border-box;font-family:'Space Grotesk',sans-serif">
                      <input bind:value={editMuscle} placeholder="Músculo" style="width:100%;padding:10px 12px;border-radius:10px;border:0.5px solid rgba(255,255,255,0.1);background:#0a0a0a;color:#fafafa;font-size:14px;outline:none;box-sizing:border-box;font-family:'Space Grotesk',sans-serif">
                      <input bind:value={editImgUrl} placeholder="URL de imagen" style="width:100%;padding:10px 12px;border-radius:10px;border:0.5px solid rgba(255,255,255,0.1);background:#0a0a0a;color:#fafafa;font-size:14px;outline:none;box-sizing:border-box;font-family:'Space Grotesk',sans-serif">
                      <textarea bind:value={editTips} rows="3" placeholder="Consejos (uno por línea)" style="width:100%;padding:10px 12px;border-radius:10px;border:0.5px solid rgba(255,255,255,0.1);background:#0a0a0a;color:#fafafa;font-size:14px;outline:none;resize:vertical;font-family:inherit;box-sizing:border-box"></textarea>
                      <div>
                        <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:4px">Alternativas</div>
                        {#each editAlts as alt, i}
                          <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">
                            <input bind:value={editAlts[i].name} placeholder="Nombre" style="flex:1;padding:8px 10px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.1);background:#0a0a0a;color:#fafafa;font-size:13px;outline:none;box-sizing:border-box;font-family:'Space Grotesk',sans-serif">
                            <input bind:value={editAlts[i].reason} placeholder="Razón" style="flex:1;padding:8px 10px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.08);background:#0a0a0a;color:rgba(255,255,255,0.6);font-size:12px;outline:none;box-sizing:border-box;font-family:'Space Grotesk',sans-serif">
                            <button onclick={() => removeAlt(i)} style="background:none;border:0;color:#ff6b6b;cursor:pointer;font-size:16px;padding:4px">✕</button>
                          </div>
                        {/each}
                        <button onclick={addAlt} style="width:100%;padding:8px;border-radius:8px;border:0.5px dashed rgba(255,255,255,0.15);cursor:pointer;background:transparent;color:rgba(255,255,255,0.5);font-size:12px">+ Añadir alternativa</button>
                      </div>
                      <div style="display:flex;gap:8px">
                        <button onclick={() => saveEdit(ex)} style="flex:1;padding:10px;border-radius:10px;border:0;cursor:pointer;background:{accent};color:#0a0a0a;font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:700">Guardar</button>
                        <button onclick={cancelEdit} style="flex:1;padding:10px;border-radius:10px;border:0;cursor:pointer;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.6);font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:600">Cancelar</button>
                      </div>
                    </div>
                  {:else}
                    <div style="display:flex;gap:8px;margin-top:12px">
                      <button onclick={() => beginEdit(ex)} style="flex:1;padding:10px;border-radius:10px;border:0;cursor:pointer;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.6);font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:600">Editar</button>
                      <button onclick={() => deleteExerciseConfirm(ex)} style="flex:1;padding:10px;border-radius:10px;border:0;cursor:pointer;background:rgba(255,107,107,0.12);color:#ff6b6b;font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:600">Eliminar</button>
                    </div>
                    {#if ex.tips && ex.tips.length > 0}
                      <div style="margin-top:10px">
                        <div style="font-size:10px;color:rgba(255,255,255,0.4);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:4px">Consejos</div>
                        {#each ex.tips as tip}
                          <div style="font-size:12px;color:rgba(255,255,255,0.7);padding:4px 0;border-bottom:0.5px solid rgba(255,255,255,0.03)">• {tip}</div>
                        {/each}
                      </div>
                    {/if}
                    {#if ex.alternatives && ex.alternatives.length > 0}
                      <div style="margin-top:10px">
                        <div style="font-size:10px;color:rgba(255,255,255,0.4);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:4px">Alternativas</div>
                        {#each ex.alternatives as alt}
                          <div style="padding:6px 0;border-bottom:0.5px solid rgba(255,255,255,0.03)">
                            <div style="font-size:13px;color:#fafafa;font-weight:600">{alt.name}</div>
                            {#if alt.reason}<div style="font-size:11px;color:rgba(255,255,255,0.5)">{alt.reason}</div>{/if}
                          </div>
                        {/each}
                      </div>
                    {/if}
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

    {:else if activeTab === 'datos'}
      <div class="section-label" style="margin-bottom:10px"><span style="width:4px;height:4px;border-radius:50%;background:{accent};flex-shrink:0"></span>Importar con IA</div>
      <div style="margin:0 20px;background:#141414;border-radius:16px;border:0.5px solid rgba(255,255,255,0.06);overflow:hidden">
        <div style="padding:14px 16px">
          <div style="font-size:12px;color:#fafafa;font-weight:600;font-family:'Space Grotesk',sans-serif">Pega tu rutina en texto</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.45);margin-top:2px;line-height:1.4">Describe tu rutina como se la dirías a un entrenador. La IA creará el programa y los ejercicios automáticamente.</div>
          <textarea id="ai-input" bind:value={aiInput} rows="8" placeholder="Ejemplo:&#10;Lunes - Pecho y Triceps&#10;Press banca 4x8-10&#10;Press inclinado 3x10&#10;Aperturas 3x12&#10;Fondos 3x10&#10;Patada triceps 3x12" style="width:100%;margin-top:10px;padding:12px;border-radius:10px;border:0.5px solid rgba(255,255,255,0.1);background:#0a0a0a;color:#fafafa;font-size:13px;font-family:'Space Grotesk',sans-serif;outline:none;resize:vertical;box-sizing:border-box;line-height:1.6"></textarea>
          <div id="ai-status" style="margin-top:4px;font-size:10px;font-family:'JetBrains Mono',monospace;color:rgba(255,255,255,0.35);letter-spacing:0.2px">{aiStatus}</div>
        </div>
        <button id="ai-import-btn" onclick={submitAIImport} disabled={importingAI} style="margin:0 16px 14px;width:calc(100% - 32px);padding:10px;border-radius:10px;border:0;cursor:{importingAI ? 'default' : 'pointer'};background:{importingAI ? 'rgba(255,255,255,0.08)' : accent};color:{importingAI ? 'rgba(255,255,255,0.5)' : '#0a0a0a'};font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:700">{importingAI ? '⏳ Procesando…' : 'Importar con IA'}</button>
      </div>

      <div class="section-label" style="margin:24px 0 10px"><span style="width:4px;height:4px;border-radius:50%;background:{accent};flex-shrink:0"></span>Importar</div>
      <div style="margin:0 20px;background:#141414;border-radius:16px;border:0.5px solid rgba(255,255,255,0.06);overflow:hidden">
        <div style="padding:14px 16px;display:flex;align-items:center;gap:12px;border-bottom:0.5px solid rgba(255,255,255,0.04)">
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;color:#fafafa;font-weight:600;font-family:'Space Grotesk',sans-serif">Ejercicios (JSON)</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.45);margin-top:2px;line-height:1.4">Importa solo ejercicios desde un archivo JSON</div>
            <div style="margin-top:4px;font-size:10px;font-family:'JetBrains Mono',monospace;color:rgba(255,255,255,0.35);letter-spacing:0.2px">{exercisesImportStatus}</div>
          </div>
          <input type="file" id="exercises-import-input" accept=".json" style="display:none" onchange={onExercisesImport} />
          <button onclick={() => document.getElementById('exercises-import-input')?.click()} style="padding:7px 14px;border-radius:8px;border:0;cursor:pointer;background:{accent};color:#0a0a0a;font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:600;white-space:nowrap;flex-shrink:0">Importar</button>
        </div>
        <div style="padding:14px 16px;display:flex;align-items:center;gap:12px">
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;color:#fafafa;font-weight:600;font-family:'Space Grotesk',sans-serif">Logs+ajustes JSON</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.45);margin-top:2px;line-height:1.4">Restaura toda la base de datos desde un JSON</div>
            <div style="margin-top:4px;font-size:10px;font-family:'JetBrains Mono',monospace;color:rgba(255,255,255,0.35);letter-spacing:0.2px">{jsonImportStatus}</div>
          </div>
          <input type="file" id="json-import-input" accept=".json" style="display:none" onchange={onLogsImport} />
          <button id="json-import-btn" onclick={() => document.getElementById('json-import-input')?.click()} style="padding:7px 14px;border-radius:8px;border:0;cursor:pointer;background:{accent};color:#0a0a0a;font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:600;white-space:nowrap;flex-shrink:0">Importar JSON</button>
        </div>
      </div>

      <div class="section-label" style="margin:24px 0 10px"><span style="width:4px;height:4px;border-radius:50%;background:{accent};flex-shrink:0"></span>Exportar</div>
      <div style="margin:0 20px;background:#141414;border-radius:16px;border:0.5px solid rgba(255,255,255,0.06);overflow:hidden">
        <div style="padding:14px 16px;display:flex;align-items:center;gap:12px;border-bottom:0.5px solid rgba(255,255,255,0.04)">
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;color:#fafafa;font-weight:600;font-family:'Space Grotesk',sans-serif">Ejercicios JSON</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.45);margin-top:2px;line-height:1.4">Descarga solo los ejercicios como JSON</div>
            <div style="margin-top:4px;font-size:10px;font-family:'JetBrains Mono',monospace;color:rgba(255,255,255,0.35);letter-spacing:0.2px">{exercisesExportStatus}</div>
          </div>
          <button onclick={onExercisesExport} style="padding:7px 14px;border-radius:8px;border:0;cursor:pointer;background:{accent};color:#0a0a0a;font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:600;white-space:nowrap;flex-shrink:0">Exportar JSON</button>
        </div>
        <div style="padding:14px 16px;display:flex;align-items:center;gap:12px">
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;color:#fafafa;font-weight:600;font-family:'Space Grotesk',sans-serif">Logs+ajustes JSON</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.45);margin-top:2px;line-height:1.4">Descarga toda la base de datos como JSON</div>
            <div style="margin-top:4px;font-size:10px;font-family:'JetBrains Mono',monospace;color:rgba(255,255,255,0.35);letter-spacing:0.2px">{jsonExportStatus}</div>
          </div>
          <button id="json-export-btn" onclick={onLogsExport} style="padding:7px 14px;border-radius:8px;border:0;cursor:pointer;background:{accent};color:#0a0a0a;font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:600;white-space:nowrap;flex-shrink:0">Exportar JSON</button>
        </div>
      </div>

      <div class="section-label" style="margin:24px 0 10px"><span style="width:4px;height:4px;border-radius:50%;background:{accent};flex-shrink:0"></span>Mantenimiento</div>
      <div style="margin:0 20px;background:#141414;border-radius:16px;border:0.5px solid rgba(255,255,255,0.06);overflow:hidden">
        <div style="padding:14px 16px;display:flex;align-items:center;gap:12px">
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;color:#fafafa;font-weight:600;font-family:'Space Grotesk',sans-serif">Normalizar ejercicios con diccionario</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.45);margin-top:2px;line-height:1.4">Renombra al canónico en español, rellena imágenes y músculo desde el diccionario</div>
            <div id="dict-migrate-status" style="margin-top:4px;font-size:10px;font-family:'JetBrains Mono',monospace;color:rgba(255,255,255,0.35);letter-spacing:0.2px">{dictMigrateStatus}
              {#if dictSkippedNames.length > 0}
                <button id="ver-mas-link" onclick={() => showSkippedOverlay = true} style="background:none;border:none;color:{accent};cursor:pointer;font-size:10px;font-family:'JetBrains Mono',monospace;text-decoration:underline;padding:0;margin-left:4px">ver más</button>
              {/if}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
            <button id="dict-migrate-btn" onclick={() => runDictMigration(false)} style="padding:7px 14px;border-radius:8px;border:0.5px solid {accent}55;cursor:pointer;background:transparent;color:{accent};font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:600;white-space:nowrap">Aplicar</button>
            <button id="dict-force-btn" onclick={() => runDictMigration(true)} style="padding:7px 14px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.1);cursor:pointer;background:transparent;color:rgba(255,255,255,0.5);font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:600;white-space:nowrap">Forzar</button>
          </div>
        </div>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;margin:16px 20px 40px">
        <div style="font-size:10px;color:rgba(255,255,255,0.3);font-family:'JetBrains Mono',monospace">{APP_VERSION_STR}</div>
        <button onclick={refresh} style="padding:5px 10px;border-radius:6px;border:0.5px solid rgba(255,255,255,0.08);cursor:pointer;background:transparent;color:rgba(255,255,255,0.4);font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:500">↻</button>
      </div>
    {/if}
  </div>
</div>

{#if showSkippedOverlay}
  <div id="skipped-overlay" style="position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;padding:24px" onclick={() => showSkippedOverlay = false}>
    <div style="background:#141414;border-radius:24px;padding:28px 24px;max-width:340px;width:100%;border:0.5px solid rgba(255,255,255,0.08);box-shadow:0 20px 60px rgba(0,0,0,0.5)" onclick={(e) => e.stopPropagation()}>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="font-family:'Space Grotesk',sans-serif;font-size:16px;font-weight:600;color:#fafafa">Sin coincidencia en diccionario</div>
        <button id="skipped-close-btn" onclick={() => showSkippedOverlay = false} style="background:none;border:none;color:rgba(255,255,255,0.4);cursor:pointer;font-size:18px;padding:4px">✕</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        {#each dictSkippedNames as name}
          <div style="padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:10px;font-size:13px;color:#fafafa;font-family:'Space Grotesk',sans-serif">{name}</div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .you-tab-btn {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: -0.1px;
    touch-action: manipulation;
  }
  .you-tab-active {
    background: #262626;
    color: #fafafa;
  }
  .you-card {
    margin: 0 20px;
    background: #141414;
    border-radius: 18px;
    border: 0.5px solid rgba(255,255,255,0.06);
  }
  .you-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 0.5px solid rgba(255,255,255,0.04);
  }
</style>
