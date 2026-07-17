<script lang="ts">
  import { resolveExerciseMedia } from '$lib/data/exercise-dictionary'
  import { buildAIDictionary } from '$lib/brain/dictionary'
  import { AI_SYSTEM_PROMPT } from '$lib/brain/prompts'
  import { PUSH_SERVER_URL } from '$lib/config'
  import { APP_VERSION, installPWA } from '$lib/pwa'
  import { subscribePush } from '$lib/push'
  import { onMount } from 'svelte'
  import { settings } from '$lib/stores/settings'
  import { toast } from '$lib/stores/ui'
  import * as Storage from '$lib/storage'
  import { generateId, getAll, put } from '$lib/db'
  import SectionLabel from '$lib/components/SectionLabel.svelte'
  import Chip from '$lib/components/Chip.svelte'
  import ExerciseRow from '$lib/components/ExerciseRow.svelte'
  import SegmentedControl from '$lib/components/SegmentedControl.svelte'
  import ActionRow from '$lib/components/ActionRow.svelte'
  import EmptyState from '$lib/components/EmptyState.svelte'
  import StatBlock from '$lib/components/StatBlock.svelte'
  import CenterDialog from '$lib/components/CenterDialog.svelte'
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
    <div class="page-header-title">
      <span id="user-name" class="username-field" contenteditable role="textbox" aria-multiline="false" tabindex="0" style="caret-color:{accent}"
        onblur={async (e) => { const v = (e.target as HTMLElement).textContent?.trim() || 'Pedro'; userName = v; await saveProfileField('userName', v) }}
        onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur() } }}
      >{userName}</span>
      <button id="user-edit-btn" class="edit-btn" aria-label="Editar nombre"
        onclick={() => { const el = document.getElementById('user-name'); if (el) { el.focus(); const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(el); range.collapse(false); sel?.removeAllRanges(); sel?.addRange(range) } }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
      </button>
    </div>
  </div>

  <div class="section-pad">
    <SegmentedControl
      options={[
        { label: 'Perfil', value: 'perfil' },
        { label: 'Programas', value: 'programas' },
        { label: 'Ejercicios', value: 'ejercicios' },
        { label: 'Datos', value: 'datos' }
      ]}
      bind:value={activeTab}
    />
  </div>

  <div class="tab-content">
    {#if activeTab === 'perfil'}
      <div class="section-label-wrap"><SectionLabel {accent}>Mis datos</SectionLabel></div>
      <div id="you-profile-card" class="card section-card">
        <div class="card-row"><div class="card-label">Estatura</div><div class="card-row-right"><input id="height-input" class="input-field-mono" type="number" bind:value={height} onblur={() => saveProfileField('height', height)} style="width:72px;text-align:right"><span class="unit-label">cm</span></div></div>
        <div class="card-row"><div class="card-label">Peso</div><div class="card-row-right"><input id="weight-input" class="input-field-mono" type="number" bind:value={weight} onblur={() => saveProfileField('weight', weight)} style="width:72px;text-align:right"><span class="unit-label">kg</span></div></div>
        <div class="card-row"><div class="card-label">Sexo</div><select id="sex-input" class="input-field" bind:value={sex} onchange={() => saveProfileField('sex', sex)}><option value="">Seleccionar</option><option value="Masculino">Masculino</option><option value="Femenino">Femenino</option><option value="Otro">Otro</option></select></div>
        <div class="card-row"><div class="card-label">Edad</div><input id="age-input" class="input-field-mono" type="number" bind:value={age} onblur={() => saveProfileField('age', age)} style="width:72px;text-align:right"></div>
        <div class="card-row"><div class="card-label">Objetivo</div><select id="goal-input" class="input-field" bind:value={goal} onchange={() => saveProfileField('goal', goal)}><option value="">Seleccionar</option><option value="hipertrofia">Hipertrofia</option><option value="fuerza">Fuerza</option><option value="perdida de grasa">Pérdida de grasa</option><option value="recomposicion">Recomposición</option><option value="rendimiento">Rendimiento</option></select></div>
        <div class="card-row"><div class="card-label">Experiencia</div><select id="exp-input" class="input-field" bind:value={experience} onchange={() => saveProfileField('experience', experience)}><option value="">Seleccionar</option><option value="principiante">Principiante</option><option value="intermedio">Intermedio</option><option value="avanzado">Avanzado</option></select></div>
        <div class="card-row card-row-last"><div class="card-label">Profesión</div><input id="occ-input" class="input-field" type="text" bind:value={occupation} onblur={() => saveProfileField('occupation', occupation)} placeholder="Ej: Ingeniero, oficinista, repartidor…" style="width:160px;text-align:right"></div>
      </div>

      <div class="section-label-wrap"><SectionLabel {accent}>Ajustes rápidos</SectionLabel></div>
      <div id="you-quick-card" class="card section-card">
        <div class="card-row"><div class="card-label">Unidades</div><button id="units-btn" class="btn-toggle" onclick={toggleUnits}>{units === 'kg' ? 'Kilogramos (kg)' : 'Libras (lb)'}</button></div>
        <div class="card-row"><div class="card-label">Color de acento</div><div class="card-row-right"><input type="color" id="accent-input" value={accent} oninput={onAccentChange} class="accent-picker"></div></div>
        <div class="card-row"><div class="card-label">Smartwatch</div><button id="watch-toggle-btn" class="btn-toggle" style="background:{$settings.hasWatch ? accent+'22' : 'transparent'};color:{$settings.hasWatch ? accent : 'rgba(255,255,255,0.55)'}">{$settings.hasWatch ? 'Sí' : 'No'}</button></div>
        <div class="card-row"><div class="card-label">Notificaciones</div><button id="notif-perm-btn" class="btn-toggle" style="background:{permActive() ? accent+'22' : 'transparent'};color:{permActive() ? accent : 'rgba(255,255,255,0.55)'}">{permLabel()}</button></div>
        <div class="card-row"><div class="card-label">Idioma</div><button id="lang-toggle-btn" class="btn-toggle">{$settings.language === 'en' ? 'English' : 'Español'}</button></div>
        <div class="card-row card-row-last"><div class="card-label">Instalar app</div><button id="install-btn" class="btn-toggle" onclick={() => installPWA()}>Añadir</button></div>
      </div>

      {#if loaded}
        <div class="section-label-wrap"><SectionLabel {accent}>Estadísticas</SectionLabel></div>
        <div class="card stats-card">
          <StatBlock value={stats.streak} label="Racha" size="md" />
          <StatBlock value={stats.totalWorkouts} label="Entrenos" size="md" />
          <StatBlock value={stats.weeks} label="Semanas" size="md" />
          <StatBlock value={stats.distinctExercises} label="Ejercicios" size="md" />
        </div>
      {/if}

      <div class="footer-bar">
        <div class="version-text">{APP_VERSION_STR}</div>
        <button id="refresh-btn" class="refresh-btn" onclick={refresh}>↻</button>
      </div>

    {:else if activeTab === 'programas'}
      <div class="section-pad-sm">
        <div class="card program-create-card">
          <div class="row">
            <input bind:value={newProgramName} placeholder="Nombre del nuevo programa" class="text-input" style="flex:1">
            <button onclick={createNewProgram} class="btn-accent">+ Nuevo</button>
          </div>
        </div>
      </div>

      {#if programs.length === 0}
        <EmptyState message="No hay programas todavía. Crea o importa uno." />
      {:else}
        <div class="program-list">
          {#each programs as p (p.id)}
            {@const isActive = $settings.activeProgramId === p.id}
            <div class="card program-item" data-program-id={p.id}>
              <div class="flex-1">
                <div class="row">
                  <div class="program-name">{p.name}</div>
                  {#if isActive}
                    <span class="pill" style="background:{accent}22;color:{accent}">ACTIVO</span>
                  {/if}
                </div>
                <div class="program-meta">{p.weeks.length} semana(s) · {getTotalExercises(p)} ejercicios totales</div>
              </div>
              {#if !isActive}
                <button class="btn-action" style="background:{accent}22;color:{accent}" onclick={() => activateProgram(p.id)}>Activar</button>
              {/if}
              <button class="btn-action btn-dup" onclick={() => duplicateProgram(p)}>Duplicar</button>
              <button class="btn-action btn-del" onclick={() => deleteProgram(p)}>Eliminar</button>
            </div>
          {/each}
        </div>
      {/if}

      <div class="section-pad-bot">
        <div id="you-prog-coach-card" class="card coach-card">
          <div class="card-content">
            <div class="row">
              <span class="coach-icon" style="background:{accent}1f">
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><path d="M2.5 8.2c0-2.8 2.9-5 6.5-5s6.5 2.2 6.5 5-2.9 5-6.5 5c-.7 0-1.4-.08-2-.23L3.2 14.7l.5-2.4C2.95 11.4 2.5 9.9 2.5 8.2z" stroke="{accent}" stroke-width="1.5" stroke-linejoin="round" fill="none"/><circle cx="9" cy="8.2" r="0.95" fill="{accent}"/><circle cx="6" cy="8.2" r="0.95" fill="{accent}"/><circle cx="12" cy="8.2" r="0.95" fill="{accent}"/></svg>
              </span>
              <div>
                <div class="card-title">Coach IA de programas</div>
                <div class="card-subtitle">Pregunta o pide cambios en tu rutina.</div>
              </div>
            </div>
            <textarea id="prog-coach-input" bind:value={coachInput} rows="4" placeholder='Ej: "Cambia press banca por press inclinado", "¿Está balanceada mi rutina?"' class="textarea-field"></textarea>
            <div id="prog-coach-status" class="status-text">{coachStatus}</div>
          </div>
          <button id="prog-coach-btn" class="btn-accent-full" onclick={submitCoach}>Enviar al coach</button>
          {#if coachResponseVisible}
            <div id="prog-coach-response" class="coach-response-wrap">
              <div class="coach-response-box" style="border-left-color:{accent}">
                <div class="coach-response-label" style="color:{accent}">Coach IA</div>
                <div id="prog-coach-response-text" class="coach-response-text">{coachResponseText}</div>
                <div class="coach-response-provider-wrap">
                  <span id="prog-coach-provider" class="coach-response-provider">{coachProvider}</span>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>

    {:else if activeTab === 'ejercicios'}
      <div class="ex-header">
        <div id="ex-count" class="ex-count">{exercises.length} ejercicios</div>
        <button class="btn-accent" onclick={() => showNewExercise = !showNewExercise}>+ Nuevo</button>
      </div>

      {#if showNewExercise}
        <div class="card new-ex-card">
          <div class="card-title">Nuevo ejercicio</div>
          <div class="stack">
            <input class="input-field" bind:value={newExerciseName} placeholder="Nombre del ejercicio">
            <input class="input-field" bind:value={newExerciseMuscle} placeholder="Músculo (ej: Pecho, Espalda)">
            <div class="row">
              <button onclick={saveNewExercise} class="btn-primary-cta">Guardar</button>
              <button onclick={resetNewExercise} class="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      {/if}

      <input type="text" bind:value={exerciseSearch} placeholder="Buscar ejercicio…" class="search-input">

      {#if loaded && exercises.length === 0}
        <EmptyState message="No hay ejercicios todavía. Crea tu primero." />
      {:else if filteredExercises.length === 0}
        <EmptyState message="Ningún ejercicio coincide con la búsqueda." />
      {:else}
        <div class="exercise-list-wrap">
          {#each filteredExercises as ex (ex.id)}
            <div class="card exercise-item" data-exercise-id={ex.id}>
              <button class="exercise-toggle" onclick={() => toggleExpanded(ex.id)}>
                {#if resolveExerciseMedia(ex).imgUrl}
                  <img src={resolveExerciseMedia(ex).imgUrl} alt="" class="exercise-img">
                {:else}
                  <div class="exercise-img-placeholder"></div>
                {/if}
                <div class="exercise-info">
                  <div class="exercise-name">{ex.name}</div>
                  <div class="exercise-muscle">{ex.muscle}</div>
                </div>
                <span class="exercise-chevron">{expandedExerciseId === ex.id ? '▲' : '▼'}</span>
              </button>

              {#if expandedExerciseId === ex.id}
                <div class="exercise-expanded">
                  {#if editingExerciseId === ex.id}
                    <div class="stack edit-stack">
                      <input class="input-field" bind:value={editName} placeholder="Nombre">
                      <input class="input-field" bind:value={editMuscle} placeholder="Músculo">
                      <input class="input-field" bind:value={editImgUrl} placeholder="URL de imagen">
                      <textarea bind:value={editTips} rows="3" placeholder="Consejos (uno por línea)" class="input-field textarea-field-sm"></textarea>
                      <div>
                        <div class="alt-label">Alternativas</div>
                        {#each editAlts as alt, i}
                          <div class="alt-row">
                            <input bind:value={editAlts[i].name} placeholder="Nombre" class="input-sm">
                            <input bind:value={editAlts[i].reason} placeholder="Razón" class="input-sm input-sm-alt">
                            <button onclick={() => removeAlt(i)} class="alt-remove">✕</button>
                          </div>
                        {/each}
                        <button onclick={addAlt} class="btn-add-alt">+ Añadir alternativa</button>
                      </div>
                      <div class="row">
                        <button onclick={() => saveEdit(ex)} class="btn-primary-cta">Guardar</button>
                        <button onclick={cancelEdit} class="btn-secondary">Cancelar</button>
                      </div>
                    </div>
                  {:else}
                    <div class="row edit-actions">
                      <button onclick={() => beginEdit(ex)} class="btn-secondary">Editar</button>
                      <button onclick={() => deleteExerciseConfirm(ex)} class="btn-danger">Eliminar</button>
                    </div>
                    {#if ex.tips && ex.tips.length > 0}
                      <div class="tips-section">
                        <div class="section-sublabel">Consejos</div>
                        {#each ex.tips as tip}
                          <div class="tip-item">• {tip}</div>
                        {/each}
                      </div>
                    {/if}
                    {#if ex.alternatives && ex.alternatives.length > 0}
                      <div class="alts-section">
                        <div class="section-sublabel">Alternativas</div>
                        {#each ex.alternatives as alt}
                          <div class="alt-item">
                            <div class="alt-item-name">{alt.name}</div>
                            {#if alt.reason}<div class="alt-item-reason">{alt.reason}</div>{/if}
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
      <div class="section-label-wrap"><SectionLabel {accent}>Importar con IA</SectionLabel></div>
      <div class="card section-card">
        <div class="card-content">
          <div class="card-title">Pega tu rutina en texto</div>
          <div class="card-subtitle">Describe tu rutina como se la dirías a un entrenador. La IA creará el programa y los ejercicios automáticamente.</div>
          <textarea id="ai-input" bind:value={aiInput} rows="8" placeholder="Ejemplo:&#10;Lunes - Pecho y Triceps&#10;Press banca 4x8-10&#10;Press inclinado 3x10&#10;Aperturas 3x12&#10;Fondos 3x10&#10;Patada triceps 3x12" class="textarea-field textarea-lg"></textarea>
          <div id="ai-status" class="status-text">{aiStatus}</div>
        </div>
        <button id="ai-import-btn" class="btn-accent-full" onclick={submitAIImport} disabled={importingAI} style="cursor:{importingAI ? 'default' : 'pointer'};background:{importingAI ? 'rgba(255,255,255,0.08)' : accent};color:{importingAI ? 'rgba(255,255,255,0.5)' : '#0a0a0a'}">{importingAI ? '⏳ Procesando…' : 'Importar con IA'}</button>
      </div>

      <div class="section-label-wrap"><SectionLabel {accent}>Importar</SectionLabel></div>
      <div class="card section-card">
        <ActionRow title="Ejercicios (JSON)" description="Importa solo ejercicios desde un archivo JSON" status={exercisesImportStatus} {accent}>
          {#snippet button()}
            <input type="file" id="exercises-import-input" accept=".json" style="display:none" onchange={onExercisesImport} />
            <button onclick={() => document.getElementById('exercises-import-input')?.click()} class="btn-accent-sm">Importar</button>
          {/snippet}
        </ActionRow>
        <ActionRow title="Logs+ajustes JSON" description="Restaura toda la base de datos desde un JSON" status={jsonImportStatus} {accent}>
          {#snippet button()}
            <input type="file" id="json-import-input" accept=".json" style="display:none" onchange={onLogsImport} />
            <button id="json-import-btn" onclick={() => document.getElementById('json-import-input')?.click()} class="btn-accent-sm">Importar JSON</button>
          {/snippet}
        </ActionRow>
      </div>

      <div class="section-label-wrap"><SectionLabel {accent}>Exportar</SectionLabel></div>
      <div class="card section-card">
        <ActionRow title="Ejercicios JSON" description="Descarga solo los ejercicios como JSON" status={exercisesExportStatus} {accent}>
          {#snippet button()}
            <button onclick={onExercisesExport} class="btn-accent-sm">Exportar JSON</button>
          {/snippet}
        </ActionRow>
        <ActionRow title="Logs+ajustes JSON" description="Descarga toda la base de datos como JSON" status={jsonExportStatus} {accent}>
          {#snippet button()}
            <button id="json-export-btn" onclick={onLogsExport} class="btn-accent-sm">Exportar JSON</button>
          {/snippet}
        </ActionRow>
      </div>

      <div class="section-label-wrap"><SectionLabel {accent}>Mantenimiento</SectionLabel></div>
      <div class="card section-card">
        <div class="maint-row">
          <div class="flex-1">
            <div class="card-title">Normalizar ejercicios con diccionario</div>
            <div class="card-subtitle">Renombra al canónico en español, rellena imágenes y músculo desde el diccionario</div>
            <div id="dict-migrate-status" class="status-text">{dictMigrateStatus}
              {#if dictSkippedNames.length > 0}
                <button id="ver-mas-link" class="ver-mas" style="color:{accent}" onclick={() => showSkippedOverlay = true}>ver más</button>
              {/if}
            </div>
          </div>
          <div class="maint-actions">
            <button id="dict-migrate-btn" class="btn-maint" style="border-color:{accent}55;color:{accent}" onclick={() => runDictMigration(false)}>Aplicar</button>
            <button id="dict-force-btn" class="btn-maint btn-maint-alt" onclick={() => runDictMigration(true)}>Forzar</button>
          </div>
        </div>
      </div>

      <div class="footer-bar footer-bar-bot">
        <div class="version-text">{APP_VERSION_STR}</div>
        <button onclick={refresh} class="refresh-btn">↻</button>
      </div>
    {/if}
  </div>
</div>

<CenterDialog open={showSkippedOverlay} onclose={() => showSkippedOverlay = false}>
  <div class="dialog-header">
    <div class="dialog-title">Sin coincidencia en diccionario</div>
    <button id="skipped-close-btn" class="dialog-close" onclick={() => showSkippedOverlay = false}>✕</button>
  </div>
  <div class="stack">
    {#each dictSkippedNames as name}
      <div class="skipped-item">{name}</div>
    {/each}
  </div>
</CenterDialog>

<style>
  .tab-content { margin-top: 20px; }
  .section-label-wrap { margin-bottom: 10px; }
  .section-card { margin: 0 20px; }
  .card-content { padding: 14px 16px; }
  .page-header-title { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .username-field { outline: none; border: 0; display: inline-block; min-width: 50px; }
  .edit-btn { background: none; border: 0; cursor: pointer; flex-shrink: 0; margin-top: 6px; padding: 0; }
  .section-pad { margin: 0 20px; }
  .section-pad-sm { padding: 0 20px; margin-bottom: 12px; }
  .section-pad-bot { margin: 20px 20px 0; }
  .card-label { font-family: 'Space Grotesk', sans-serif; font-size: 13.5px; color: #fafafa; font-weight: 500; }
  .card-row { display: flex; align-items: center; justify-content: space-between; padding: 11px 0; border-bottom: 0.5px solid rgba(255,255,255,0.06); }
  .card-row:last-child, .card-row-last { border-bottom: 0; }
  .card-row-right { display: flex; align-items: center; gap: 4px; }
  .unit-label { font-size: 12px; color: rgba(255,255,255,0.55); font-family: 'JetBrains Mono', monospace; }
  .btn-toggle { padding: 6px 12px; border-radius: 8px; border: 0.5px solid rgba(255,255,255,0.1); cursor: pointer; background: transparent; color: rgba(255,255,255,0.55); font-family: 'Space Grotesk', sans-serif; font-size: 12px; font-weight: 600; }
  .accent-picker { width: 40px; height: 28px; border: 0.5px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 0; background: transparent; cursor: pointer; }
  .stats-card { margin: 0 20px; padding: 16px 14px; display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; }
  .footer-bar { display: flex; align-items: center; justify-content: space-between; margin: 16px 20px 0; }
  .footer-bar-bot { margin: 16px 20px 40px; }
  .version-text { font-size: 10px; color: rgba(255,255,255,0.3); font-family: 'JetBrains Mono', monospace; }
  .refresh-btn { padding: 5px 10px; border-radius: 6px; border: 0.5px solid rgba(255,255,255,0.08); cursor: pointer; background: transparent; color: rgba(255,255,255,0.4); font-family: 'Space Grotesk', sans-serif; font-size: 11px; font-weight: 500; }
  .row { display: flex; gap: 10px; align-items: center; }
  .flex-1 { flex: 1; min-width: 0; }
  .stack { display: flex; flex-direction: column; gap: 8px; }
  .text-input { padding: 10px 12px; border-radius: 10px; border: 0.5px solid rgba(255,255,255,0.1); background: #0a0a0a; color: #fafafa; font-size: 14px; outline: none; box-sizing: border-box; font-family: 'Space Grotesk', sans-serif; }
  .btn-accent { flex-shrink: 0; padding: 10px 18px; border-radius: 10px; border: 0; cursor: pointer; background: var(--accent, #d4ff3a); color: #0a0a0a; font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 700; }
  .program-list { padding: 0 20px; display: flex; flex-direction: column; gap: 8px; }
  .program-item { margin: 0 20px; padding: 14px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .program-name { font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 600; color: #fafafa; letter-spacing: -0.3px; }
  .program-meta { font-size: 11px; color: rgba(255,255,255,0.45); margin-top: 2px; }
  .btn-action { padding: 8px 14px; border-radius: 8px; border: 0; cursor: pointer; font-size: 13px; font-family: 'Space Grotesk', sans-serif; }
  .btn-dup { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6); }
  .btn-del { background: rgba(255,107,107,0.12); color: #ff6b6b; }
  .program-create-card { margin: 0 20px; padding: 14px 16px; }
  .coach-card { margin: 0 20px; overflow: hidden; }
  .coach-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .card-title { font-size: 12px; color: #fafafa; font-weight: 600; font-family: 'Space Grotesk', sans-serif; }
  .card-subtitle { font-size: 10px; color: rgba(255,255,255,0.45); margin-top: 2px; line-height: 1.4; }
  .textarea-field { width: 100%; margin-top: 10px; padding: 10px 12px; border-radius: 10px; border: 0.5px solid rgba(255,255,255,0.1); background: #0a0a0a; color: #fafafa; font-size: 13px; font-family: 'Space Grotesk', sans-serif; outline: none; resize: vertical; box-sizing: border-box; line-height: 1.5; }
  .textarea-lg { padding: 12px; line-height: 1.6; }
  .textarea-field-sm { resize: vertical; font-family: inherit; }
  .status-text { margin-top: 4px; font-size: 10px; font-family: 'JetBrains Mono', monospace; color: rgba(255,255,255,0.35); letter-spacing: 0.2px; min-height: 14px; }
  .btn-accent-full { margin: 0 16px 14px; width: calc(100% - 32px); padding: 10px; border-radius: 10px; border: 0; cursor: pointer; background: var(--accent, #d4ff3a); color: #0a0a0a; font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 700; }
  .coach-response-wrap { padding: 0 16px 14px; }
  .coach-response-box { padding: 12px 14px; background: rgba(255,255,255,0.03); border-radius: 10px; border-left: 3px solid; }
  .coach-response-label { font-size: 10px; font-family: 'JetBrains Mono', monospace; letter-spacing: 1.2px; text-transform: uppercase; font-weight: 600; margin-bottom: 6px; }
  .coach-response-text { font-size: 13px; color: rgba(255,255,255,0.85); line-height: 1.5; font-family: 'Space Grotesk', sans-serif; white-space: pre-wrap; }
  .coach-response-provider-wrap { margin-top: 6px; }
  .coach-response-provider { font-size: 9px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.6px; color: rgba(255,255,255,0.3); text-transform: uppercase; }
  .ex-header { display: flex; justify-content: space-between; align-items: center; padding: 0 20px 12px; }
  .ex-count { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 1.6px; text-transform: uppercase; color: rgba(255,255,255,0.5); font-weight: 500; }
  .new-ex-card { margin: 0 20px 12px; padding: 14px 16px; }
  .search-input { margin: 0 20px 10px; padding: 10px 14px; border-radius: 10px; border: 0.5px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: #fafafa; font-family: 'Space Grotesk', sans-serif; font-size: 14px; outline: none; width: calc(100% - 40px); box-sizing: border-box; }
  .exercise-list-wrap { display: flex; flex-direction: column; gap: 8px; padding: 0 20px 20px; }
  .exercise-item { margin: 0 20px; padding: 0; overflow: hidden; }
  .exercise-toggle { width: 100%; background: transparent; border: 0; cursor: pointer; padding: 14px; display: flex; align-items: center; gap: 12px; color: inherit; text-align: left; font-family: inherit; }
  .exercise-img { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex-shrink: 0; background: #0a0a0a; }
  .exercise-img-placeholder { width: 44px; height: 44px; border-radius: 8px; flex-shrink: 0; background: #0a0a0a; }
  .exercise-info { flex: 1; min-width: 0; text-align: left; }
  .exercise-name { font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 600; color: #fafafa; letter-spacing: -0.3px; }
  .exercise-muscle { font-size: 11px; color: rgba(255,255,255,0.45); margin-top: 2px; }
  .exercise-chevron { font-size: 10px; color: rgba(255,255,255,0.3); font-family: 'JetBrains Mono', monospace; }
  .exercise-expanded { padding: 0 14px 14px; border-top: 0.5px solid rgba(255,255,255,0.04); }
  .edit-stack { margin-top: 12px; }
  .edit-actions { margin-top: 12px; }
  .btn-primary-cta { flex: 1; padding: 10px; border-radius: 10px; border: 0; cursor: pointer; background: var(--accent, #d4ff3a); color: #0a0a0a; font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 700; }
  .btn-secondary { flex: 1; padding: 10px; border-radius: 10px; border: 0; cursor: pointer; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6); font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 600; }
  .btn-danger { flex: 1; padding: 10px; border-radius: 10px; border: 0; cursor: pointer; background: rgba(255,107,107,0.12); color: #ff6b6b; font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 600; }
  .section-sublabel { font-size: 10px; color: rgba(255,255,255,0.4); font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 4px; }
  .tips-section { margin-top: 10px; }
  .tip-item { font-size: 12px; color: rgba(255,255,255,0.7); padding: 4px 0; border-bottom: 0.5px solid rgba(255,255,255,0.03); }
  .alts-section { margin-top: 10px; }
  .alt-item { padding: 6px 0; border-bottom: 0.5px solid rgba(255,255,255,0.03); }
  .alt-item-name { font-size: 13px; color: #fafafa; font-weight: 600; }
  .alt-item-reason { font-size: 11px; color: rgba(255,255,255,0.5); }
  .alt-label { font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 4px; }
  .alt-row { display: flex; gap: 6px; align-items: center; margin-bottom: 4px; }
  .input-sm { flex: 1; padding: 8px 10px; border-radius: 8px; border: 0.5px solid rgba(255,255,255,0.1); background: #0a0a0a; color: #fafafa; font-size: 13px; outline: none; box-sizing: border-box; font-family: 'Space Grotesk', sans-serif; }
  .input-sm-alt { border-color: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); font-size: 12px; }
  .alt-remove { background: none; border: 0; color: #ff6b6b; cursor: pointer; font-size: 16px; padding: 4px; }
  .btn-add-alt { width: 100%; padding: 8px; border-radius: 8px; border: 0.5px dashed rgba(255,255,255,0.15); cursor: pointer; background: transparent; color: rgba(255,255,255,0.5); font-size: 12px; }
  .section-card { background: #141414; border-radius: 16px; border: 0.5px solid rgba(255,255,255,0.06); overflow: hidden; }
  .btn-accent-sm { padding: 7px 14px; border-radius: 8px; border: 0; cursor: pointer; background: var(--accent, #d4ff3a); color: #0a0a0a; font-family: 'Space Grotesk', sans-serif; font-size: 12px; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
  .maint-row { padding: 14px 16px; display: flex; align-items: center; gap: 12px; }
  .maint-actions { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
  .btn-maint { padding: 7px 14px; border-radius: 8px; border: 0.5px solid; cursor: pointer; background: transparent; font-family: 'Space Grotesk', sans-serif; font-size: 12px; font-weight: 600; white-space: nowrap; }
  .btn-maint-alt { border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); }
  .ver-mas { background: none; border: none; cursor: pointer; font-size: 10px; font-family: 'JetBrains Mono', monospace; text-decoration: underline; padding: 0; margin-left: 4px; }
  .dialog-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .dialog-title { font-family: 'Space Grotesk', sans-serif; font-size: 16px; font-weight: 600; color: #fafafa; }
  .dialog-close { background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; font-size: 18px; padding: 4px; }
  .skipped-item { padding: 10px 12px; background: rgba(255,255,255,0.04); border-radius: 10px; font-size: 13px; color: #fafafa; font-family: 'Space Grotesk', sans-serif; }
</style>
