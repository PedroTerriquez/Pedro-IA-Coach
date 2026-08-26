<script lang="ts">
  import { importWithAI, generateProgramWithAI, programCoach, type ProgramOverrides } from '$lib/ai'
  import { subscribePush } from '$lib/push'
  import { onMount } from 'svelte'
  import { settings } from '$lib/stores/settings'
  import { toast } from '$lib/stores/ui'
  import * as Storage from '$lib/storage'
  import { generateId, getAll, put } from '$lib/db'
  import SectionLabel from '$lib/components/SectionLabel.svelte'
  import Icon from '$lib/components/Icon.svelte'

  import SegmentedControl from '$lib/components/SegmentedControl.svelte'
  import EmptyState from '$lib/components/EmptyState.svelte'
  import SearchInput from '$lib/components/SearchInput.svelte'
  import StatBlock from '$lib/components/StatBlock.svelte'
  import StatsGrid from '$lib/components/StatsGrid.svelte'
  import CenterDialog from '$lib/components/CenterDialog.svelte'
  import ProfileCard from '$lib/components/ProfileCard.svelte'
  import QuickSettingsCard from '$lib/components/QuickSettingsCard.svelte'
  import ProgramCard from '$lib/components/ProgramCard.svelte'
  import ProgramEditor from '$lib/components/ProgramEditor.svelte'
  import ProgramEditorIACard from '$lib/components/ProgramEditorIACard.svelte'
  import ExerciseListItem from '$lib/components/ExerciseListItem.svelte'
  import NormalizeCard from '$lib/components/NormalizeCard.svelte'
  import NewExerciseForm from '$lib/components/NewExerciseForm.svelte'
  import ProgramCreateForm from '$lib/components/ProgramCreateForm.svelte'
  import Button from '$lib/components/Button.svelte'
  import TextArea from '$lib/components/TextArea.svelte'
  import DataImportSection from '$lib/components/DataImportSection.svelte'
  import DataExportSection from '$lib/components/DataExportSection.svelte'
  import { computeStreakWeeks, trainingDaysPerWeek } from '$lib/streak'
  import { lastAIExchange, DEBUG_PASSWORD, formatExchange, type AIExchange } from '$lib/stores/debug'
  import DebugAIToggle from '$lib/components/DebugAIToggle.svelte'
  import CyberpunkCard from '$lib/components/CyberpunkCard.svelte'
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
  let editProgram = $state<Program | null>(null)
  let showEditor = $state(false)
  let coachInput = $state('')
  let coachStatus = $state('')
  let coachResponseVisible = $state(false)
  let coachResponseText = $state('')
  let coachProvider = $state('')
  let programSubTab = $state<'manual' | 'ia'>('manual')
  let generateDaysPerWeek = $state<number | null>(null)
  let generateEquipment = $state<string | null>(null)
  let generateFocus = $state<string[]>([])
  let generateLimitations = $state<string[]>([])
  let generatingProgram = $state(false)
  let generateStatus = $state('')

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

  // Debug IA state
  let debugPass = $state('')
  let debugShow = $state(false)
  let debugExchange: AIExchange | null = $derived($lastAIExchange)
  let debugText = $derived(formatExchange(debugExchange))

  let accent = $derived($settings.accentColor || '#d4ff3a')
  let units = $derived($settings.units || 'kg')

  let stats = $derived.by(() => {
    if (!loaded || allLogs.length === 0) return { streak: 0, totalWorkouts: 0, weeks: 0, distinctExercises: 0 }
    const dates = [...new Set(allLogs.map(l => l.date))].sort()
    const distinctIds = new Set(allLogs.map(l => l.exerciseId))
    const today = new Date()
    const activeProgram = programs.find(p => p.id === $settings.activeProgramId)
    const streak = computeStreakWeeks(allLogs, trainingDaysPerWeek(activeProgram, $settings.currentWeekIdx || 0), getToday())
    const firstDate = new Date(dates[0])
    const weeksDiff = Math.max(1, Math.floor((today.getTime() - firstDate.getTime()) / (7 * 86400000)))
    return { streak, totalWorkouts: dates.length, weeks: weeksDiff, distinctExercises: distinctIds.size }
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

  async function onAccentChange(val: string) {
    await settings.update({ accentColor: val })
    document.documentElement.style.setProperty('--accent', val)
  }

  async function toggleWatch() {
    await settings.update({ hasWatch: !$settings.hasWatch })
  }

  async function onFontScaleChange(val: number) {
    await settings.update({ fontScale: val })
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
    const name = newProgramName.trim()
    if (name) {
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
        }],
        createdAt: new Date().toISOString()
      }
      await Storage.saveProgram(program)
      newProgramName = ''
      toast.show('Programa creado')
      refresh()
    } else {
      editProgram = null
      showEditor = true
    }
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
      weeks: JSON.parse(JSON.stringify(p.weeks)),
      createdAt: new Date().toISOString()
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

  function openEditor(p: Program | null) {
    editProgram = p
    showEditor = true
  }

  async function submitCoach() {
    const text = coachInput.trim()
    if (!text) { coachStatus = '⚠️ Escribe tu pregunta o petición'; return }
    const activeProgram = programs.find(p => p.id === $settings.activeProgramId)
    if (!activeProgram) { coachStatus = '⚠️ No hay un programa activo'; return }
    coachStatus = '⏳ Conectando con la IA…'
    coachResponseVisible = false
    let progressStarted = false
    const waitTimer = setTimeout(() => { if (!progressStarted) coachStatus = '⏳ Esperando la IA…' }, 3000)
    try {
      const result = await programCoach(text, activeProgram, (cur, total) => {
        progressStarted = true
        coachStatus = `⚡ Generando ejercicios ${cur}/${total}`
      })
      if (result.program) {
        coachStatus = `✅ Nuevo programa "${result.program.name}" creado y activado`
        programSubTab = 'manual'
        refresh()
      } else {
        coachResponseText = result.message || 'Listo.'
        coachProvider = result._provider || ''
        coachResponseVisible = true
        coachStatus = ''
      }
    } catch (err: any) {
      coachStatus = `❌ ${err.message}`
    }
    clearTimeout(waitTimer)
    coachInput = ''
  }

  async function submitGenerate() {
    generatingProgram = true
    generateStatus = '⏳ Conectando con la IA…'
    let progressStarted = false
    const waitTimer = setTimeout(() => { if (generatingProgram && !progressStarted) generateStatus = '⏳ Esperando la IA…' }, 3000)
    try {
      const overrides: ProgramOverrides = {}
      if (generateDaysPerWeek) overrides.daysPerWeek = generateDaysPerWeek
      if (generateEquipment) overrides.equipment = generateEquipment
      if (generateFocus.length) overrides.focus = generateFocus
      if (generateLimitations.length) overrides.limitations = generateLimitations

      const program = await generateProgramWithAI(overrides, (cur, total) => {
        progressStarted = true
        generateStatus = `⚡ Generando ejercicios ${cur}/${total}`
      })
      generateStatus = `✅ "${program.name}" generado con ${program.weeks.length} semana(s)`
      programSubTab = 'manual'
      refresh()
    } catch (err: any) {
      generateStatus = `❌ ${err.message}`
    } finally {
      generatingProgram = false
      clearTimeout(waitTimer)
    }
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

  // ── Debug IA ──
  async function activateDebug() {
    if (debugPass.trim() !== DEBUG_PASSWORD) {
      toast.show('Contraseña incorrecta', true)
      return
    }
    await settings.update({ debugAI: true })
    debugPass = ''
    toast.show('Debug IA activado')
  }

  async function deactivateDebug() {
    await settings.update({ debugAI: false })
    debugShow = false
    toast.show('Debug IA desactivado')
  }

  async function submitAIImport() {
    const text = aiInput.trim()
    if (!text) { aiStatus = '⚠️ Pega tu rutina primero'; return }
    importingAI = true
    aiStatus = '⏳ Conectando con la IA…'
    let progressStarted = false
    const waitTimer = setTimeout(() => { if (importingAI && !progressStarted) aiStatus = '⏳ Esperando la IA…' }, 3000)
    try {
      const program = await importWithAI(text, (cur, total) => {
        progressStarted = true
        aiStatus = `⚡ Generando ejercicios ${cur}/${total}`
      })
      aiStatus = `✅ Importado "${program.name}" con ${program.weeks.length} semana(s)`
      aiInput = ''
      programSubTab = 'manual'
      refresh()
    } catch (err: any) {
      aiStatus = `❌ ${err.message}`
    } finally {
      importingAI = false
      clearTimeout(waitTimer)
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
    dictMigrateStatus = '⏳ Corrigiendo ejercicios…'
    try {
      const result = await Storage.migrateExercisesToDictionary({ force })
      if (result.dictMissing) {
        dictMigrateStatus = '❌ No se pudo cargar el diccionario'
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
        <Icon name="pencil" size={22} color="rgba(255,255,255,0.3)" />
      </button>
    </div>
  </div>

  <div class="section-pad">
    <SegmentedControl
      options={[
        { label: 'Perfil', value: 'perfil' },
        { label: 'Programas', value: 'programas' },
        { label: 'Ejercicios', value: 'ejercicios', id: 'you-tab-ejercicios' },
        { label: 'Datos', value: 'datos' }
      ]}
      bind:value={activeTab}
    />
  </div>

  <div class="tab-content">
    {#if activeTab === 'perfil'}
      <div class="section-label-wrap"><SectionLabel {accent}>Mis datos</SectionLabel></div>
      <div class="section-pad">
        <ProfileCard
          {height} {weight} {sex} {age} {goal} {experience} {occupation}
          {accent}
          onsave={saveProfileField}
        />
      </div>

      <div class="section-label-wrap"><SectionLabel {accent}>Ajustes rápidos</SectionLabel></div>
      <div class="section-pad">
        <QuickSettingsCard
          {units} {accent}
          hasWatch={$settings.hasWatch}
          notifPermission={typeof Notification !== 'undefined' ? Notification.permission : 'default'}
          language={$settings.language || 'es'}
          fontScale={$settings.fontScale || 1}
          ontoggleunits={toggleUnits}
          onaccentchange={onAccentChange}
          ontogglewatch={toggleWatch}
          onnotifclick={onNotifClick}
          togglelang={toggleLang}
          onfontscalechange={onFontScaleChange}
        />
      </div>

      {#if loaded}
        <div class="section-label-wrap"><SectionLabel {accent}>Estadísticas</SectionLabel></div>
          <StatsGrid columns={4} variant="card">
            <StatBlock value={stats.streak} label="Racha" size="md" />
            <StatBlock value={stats.totalWorkouts} label="Entrenos" size="md" />
            <StatBlock value={stats.weeks} label="Semanas" size="md" />
            <StatBlock value={stats.distinctExercises} label="Ejercicios" size="md" />
          </StatsGrid>
      {/if}

    {:else if activeTab === 'programas'}
      <div class="section-pad">
        <SegmentedControl
          options={[
            { label: 'Manual', value: 'manual' },
            { label: 'IA Powered', value: 'ia' }
          ]}
          bind:value={programSubTab}
        />
      </div>

      {#if programSubTab === 'manual'}
        <div class="section-pad-sm">
          <ProgramCreateForm
            bind:value={newProgramName}
            oncreate={createNewProgram}
          />
        </div>

        {#if programs.length === 0}
          <EmptyState message="No hay programas todavía. Crea o importa uno." />
        {:else}
          <div class="program-list">
            {#each programs as p (p.id)}
              <ProgramCard
                program={p}
                isActive={$settings.activeProgramId === p.id}
                {accent}
                lang={$settings.language || 'es'}
                totalExercises={getTotalExercises(p)}
                onactivate={activateProgram}
                onedit={openEditor}
                onduplicate={duplicateProgram}
                ondelete={deleteProgram}
              />
            {/each}
          </div>
        {/if}

      {:else if programSubTab === 'ia'}
        <div class="ia-free-banner">
          Gratis por tiempo limitado
        </div>

        <CyberpunkCard label="ROUTINE_IMPORT v1.0" {accent}>
          <div class="coach-top-row">
            <div class="coach-badge">
              <span class="badge-dot" style="background:{accent}"></span>
              {importingAI ? 'PROCESSING' : 'IMPORT READY'}
            </div>
            <DebugAIToggle label="Import IA" {accent} />
          </div>
          <div class="card-subtitle">Describe tu rutina como se la dirías a un entrenador. La IA creará el programa y los ejercicios automáticamente.</div>
          <div class="ai-textarea-wrap">
            <TextArea value={aiInput} rows={8} placeholder="Ejemplo:&#10;Lunes - Pecho y Triceps&#10;Press banca 4x8-10&#10;Press inclinado 3x10&#10;Aperturas 3x12&#10;Fondos 3x10&#10;Patada triceps 3x12" oninput={(val) => aiInput = val} />
          </div>
          <div id="ai-status" class="status-text">{aiStatus}</div>
          <div class="submit-wrap-ia">
            <Button variant="primary" {accent} fullWidth onclick={submitAIImport} disabled={importingAI}>{importingAI ? '⏳ Procesando…' : 'Importar con IA'}</Button>
          </div>
        </CyberpunkCard>

        <CyberpunkCard label="PROGRAM_GENERATOR v1.0" {accent}>
          <div class="coach-top-row">
            <div class="coach-badge">
              <span class="badge-dot" style="background:{accent}"></span>
              {generatingProgram ? 'GENERATING' : 'GENERATOR READY'}
            </div>
            <DebugAIToggle label="Program Creator IA" {accent} />
          </div>
          <div class="card-subtitle">La IA crea un programa completo basado en tu perfil y preferencias.</div>

          <div class="chip-group">
            <div class="chip-group-label">Días por semana</div>
            <div class="chip-row">
              {#each [3, 4, 5, 6] as d}
                <button class="chip-btn" class:chip-active={generateDaysPerWeek === d} onclick={() => generateDaysPerWeek = generateDaysPerWeek === d ? null : d}>{d}d</button>
              {/each}
            </div>
          </div>

          <div class="chip-group">
            <div class="chip-group-label">Equipo</div>
            <div class="chip-row">
              {#each [{ v: 'gym', l: 'Gimnasio' }, { v: 'mancuernas', l: 'Mancuernas' }, { v: 'calistenia', l: 'Calistenia' }] as e}
                <button class="chip-btn" class:chip-active={generateEquipment === e.v} onclick={() => generateEquipment = generateEquipment === e.v ? null : e.v}>{e.l}</button>
              {/each}
            </div>
          </div>

          <div class="chip-group">
            <div class="chip-group-label">Enfoque</div>
            <div class="chip-row">
              {#each [{ v: 'full', l: 'Cuerpo completo' }, { v: 'chest', l: 'Pecho' }, { v: 'back', l: 'Espalda' }, { v: 'legs', l: 'Piernas' }, { v: 'shoulders', l: 'Hombros' }, { v: 'arms', l: 'Brazos' }, { v: 'core', l: 'Abdomen' }] as f}
                <button class="chip-btn" class:chip-active={generateFocus.includes(f.v)} onclick={() => { generateFocus = generateFocus.includes(f.v) ? generateFocus.filter(v => v !== f.v) : [...generateFocus, f.v] }}>{f.l}</button>
              {/each}
            </div>
          </div>

          <div class="chip-group">
            <div class="chip-group-label">Zonas con molestia</div>
            <div class="chip-row">
              {#each ['Espalda', 'Hombro', 'Rodilla', 'Cadera', 'Cuello', 'Muñeca', 'Codo', 'Tobillo'] as part}
                <button class="chip-btn" class:chip-active={generateLimitations.includes(part)} onclick={() => { generateLimitations = generateLimitations.includes(part) ? generateLimitations.filter(p => p !== part) : [...generateLimitations, part] }}>{part}</button>
              {/each}
            </div>
          </div>

          <div class="status-text">{generateStatus}</div>
          <div class="submit-wrap-ia">
            <Button variant="primary" {accent} fullWidth onclick={submitGenerate} disabled={generatingProgram}>{generatingProgram ? '⏳ Generando…' : 'Generar programa con IA'}</Button>
          </div>
        </CyberpunkCard>

        <ProgramEditorIACard
          {accent}
          {coachInput}
          {coachStatus}
          {coachResponseVisible}
          {coachResponseText}
          {coachProvider}
          oninput={(val) => coachInput = val}
          onsubmit={submitCoach}
        />
      {/if}

    {:else if activeTab === 'ejercicios'}
      <div class="section-pad-sm">
        <NormalizeCard
          {accent}
          migrateStatus={dictMigrateStatus}
          skippedNames={dictSkippedNames}
          onforce={() => runDictMigration(true)}
          onshowskipped={() => showSkippedOverlay = true}
        />
      </div>

      <div class="ex-header">
        <div id="ex-count" class="ex-count">{exercises.length} ejercicios</div>
        <Button variant="primary" {accent} onclick={() => showNewExercise = !showNewExercise}>+ Nuevo</Button>
      </div>

      {#if showNewExercise}
        <NewExerciseForm
          bind:name={newExerciseName}
          bind:muscle={newExerciseMuscle}
          onsave={saveNewExercise}
          oncancel={resetNewExercise}
        />
      {/if}

      <div class="exercise-search-wrap"><SearchInput value={exerciseSearch} placeholder="Buscar ejercicio…" oninput={(val) => exerciseSearch = val} /></div>

      {#if loaded && exercises.length === 0}
        <EmptyState message="No hay ejercicios todavía. Crea tu primero." />
      {:else if filteredExercises.length === 0}
        <EmptyState message="Ningún ejercicio coincide con la búsqueda." />
      {:else}
        <div class="exercise-list-wrap">
          {#each filteredExercises as ex (ex.id)}
            <ExerciseListItem
              exercise={ex}
              expanded={expandedExerciseId === ex.id}
              editing={editingExerciseId === ex.id}
              {editName} {editMuscle} {editImgUrl} {editTips} {editAlts}
              ontoggle={toggleExpanded}
              onbeginedit={() => beginEdit(ex)}
              oncanceledit={cancelEdit}
              onsaveedit={() => saveEdit(ex)}
              ondelete={deleteExerciseConfirm}
              onaddalt={addAlt}
              onremovealt={removeAlt}
              oneditnameinput={(val) => editName = val}
              oneditmuscleinput={(val) => editMuscle = val}
              oneditimgurlinput={(val) => editImgUrl = val}
              onedittipsinput={(val) => editTips = val}
              oneditaltschange={(alts) => editAlts = alts}
            />
          {/each}
        </div>
      {/if}

    {:else if activeTab === 'datos'}
      <div class="section-label-wrap"><SectionLabel {accent}>Importar</SectionLabel></div>
      <div class="card section-card">
        <DataImportSection
          {accent}
          {exercisesImportStatus}
          {jsonImportStatus}
          onexercisesimport={onExercisesImport}
          onlogsimport={onLogsImport}
        />
      </div>

      <div class="section-label-wrap"><SectionLabel {accent}>Exportar</SectionLabel></div>
      <div class="card section-card">
        <DataExportSection
          {accent}
          {exercisesExportStatus}
          {jsonExportStatus}
          onexercisesexport={onExercisesExport}
          onlogsexport={onLogsExport}
        />
      </div>

      <div id="debug-ai-section" class="section-label-wrap"><SectionLabel {accent}>Debug IA</SectionLabel></div>
      <div class="card section-card">
        {#if !$settings.debugAI}
          <div class="card-content">
            <div class="card-subtitle">Activa el modo debug para inspeccionar el prompt enviado y la respuesta cruda de la IA en cada conexión.</div>
            <div class="debug-pass-row">
              <input
                id="debug-pass-input"
                type="password"
                placeholder="Contraseña"
                autocomplete="off"
                bind:value={debugPass}
                onkeydown={(e) => { if (e.key === 'Enter') activateDebug() }}
              />
              <Button variant="secondary" {accent} onclick={activateDebug}>Activar</Button>
            </div>
          </div>
        {:else}
          <div class="debug-active-row">
            <div class="flex-1">
              <div class="debug-status"><span class="debug-dot"></span>Debug IA activo</div>
              <div class="card-subtitle">{debugExchange ? `Último intercambio: ${debugExchange.label} · ${debugExchange.ts}` : 'Esperando la primera conexión con la IA…'}</div>
            </div>
            {#if debugExchange}
              <Button variant="secondary" {accent} onclick={() => debugShow = !debugShow}>{debugShow ? 'Ocultar' : 'Mostrar'}</Button>
            {/if}
            <Button variant="ghost" onclick={deactivateDebug}>Desactivar</Button>
          </div>
          {#if debugShow}
            <textarea id="debug-ai-output" readonly spellcheck="false" value={debugText}></textarea>
          {/if}
        {/if}
      </div>
    {/if}
  </div>
</div>

<CenterDialog id="skipped-overlay" open={showSkippedOverlay} onclose={() => showSkippedOverlay = false}>
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

<ProgramEditor
  bind:open={showEditor}
  program={editProgram}
  {accent}
  onsave={() => { showEditor = false; editProgram = null; refresh() }}
/>

<style>
  .tab-content { margin-top: 20px; padding: 0 20px; }
  .section-label-wrap { margin: 20px 0 10px; padding: 0; }
  .section-label-wrap:first-child { margin-top: 0; }
  .section-card { margin: 0 0 20px; }
  .card-content { padding: 14px 16px; }
  .page-header-title { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .username-field { outline: none; border: 0; display: inline-block; min-width: 50px; }
  .edit-btn { background: none; border: 0; cursor: pointer; flex-shrink: 0; margin-top: 6px; padding: 0; }
  .section-pad { margin: 0 0 20px; }
  .section-pad-sm { padding: 0; margin-bottom: 12px; }
  .stack { display: flex; flex-direction: column; gap: 8px; }
  .program-list { padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .ai-textarea-wrap { margin-top: 10px; }
  .ex-header { display: flex; justify-content: space-between; align-items: center; padding: 0 0 12px; }
  .ex-count { font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.6px; text-transform: uppercase; color: rgba(255,255,255,0.5); font-weight: 500; }
  .exercise-list-wrap { display: flex; flex-direction: column; gap: 8px; padding: 0 0 20px; }
  .exercise-search-wrap { margin: 0 0 10px; }
  .dialog-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .dialog-title { font-family: var(--font-sans); font-size: 16px; font-weight: 600; color: var(--text); }
  .dialog-close { background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; font-size: 18px; padding: 4px; }
  .skipped-item { padding: 10px 12px; background: rgba(255,255,255,0.04); border-radius: 10px; font-size: 13px; color: var(--text); font-family: var(--font-sans); }
  .chip-group { margin-top: 14px; }
  .chip-group-label { font-size: 11px; color: rgba(255,255,255,0.5); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: 500; }
  .chip-row { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip-btn {
    padding: 6px 14px;
    border-radius: 9999px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.04);
    color: rgba(255,255,255,0.6);
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }
  .chip-btn.chip-active {
    background: var(--accent);
    color: #0a0a0a;
    border-color: var(--accent);
    font-weight: 600;
  }
  .ia-free-banner {
    margin: 0 0 14px;
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 700;
    font-family: var(--font-sans);
    text-align: center;
    letter-spacing: 0.3px;
    background: linear-gradient(135deg, rgba(0,220,130,0.22) 0%, rgba(0,180,255,0.15) 100%);
    color: #00e88a;
    border: 1px solid rgba(0,232,138,0.3);
  }

  .coach-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .coach-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.7);
  }
  .badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    animation: dot-blink 1s step-end infinite;
  }
  @keyframes dot-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  .submit-wrap-ia { margin-top: 12px; }

  .debug-pass-row { display: flex; gap: 8px; margin-top: 12px; }
  .debug-pass-row input {
    flex: 1;
    min-width: 0;
    padding: 10px 12px;
    border-radius: 10px;
    border: 0.5px solid rgba(255,255,255,0.08);
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
    font-family: var(--font-mono);
    outline: none;
    box-sizing: border-box;
  }
  .debug-active-row { display: flex; align-items: center; gap: 8px; padding: 14px 16px 4px; }
  .debug-status {
    display: flex;
    align-items: center;
    gap: 7px;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 600;
    color: #00e88a;
    margin-bottom: 4px;
  }
  .debug-dot {
    width: 7px;
    height: 7px;
    border-radius: 9999px;
    background: #00e88a;
    box-shadow: 0 0 6px #00e88a;
    flex-shrink: 0;
  }
  #debug-ai-output {
    display: block;
    width: calc(100% - 32px);
    margin: 10px 16px 14px;
    height: 320px;
    resize: vertical;
    border-radius: 10px;
    border: 0.5px solid rgba(255,255,255,0.08);
    background: var(--bg);
    color: rgba(255,255,255,0.75);
    font-size: 10px;
    line-height: 1.5;
    font-family: var(--font-mono);
    padding: 10px;
    box-sizing: border-box;
    outline: none;
    white-space: pre;
    overflow: auto;
  }
</style>
