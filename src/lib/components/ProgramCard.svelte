<script lang="ts">
  import type { Program } from '$lib/types'
  import Button from './Button.svelte'

  let {
    program,
    isActive = false,
    accent = 'var(--accent)',
    totalExercises = 0,
    lang = 'es',
    onactivate = () => {},
    onedit = () => {},
    onduplicate = () => {},
    ondelete = () => {}
  }: {
    program: Program
    isActive?: boolean
    accent?: string
    totalExercises?: number
    lang?: string
    onactivate?: (id: string) => void
    onedit?: (p: Program) => void
    onduplicate?: (p: Program) => void
    ondelete?: (p: Program) => void
  } = $props()

  function fmtDate(iso: string): string {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleString(lang, {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }
</script>

<div class="card program-item" class:active={isActive} style={isActive ? `border-color:${accent}55` : ''} data-component="ProgramCard" data-program-id={program.id}>
  <div class="prog-head">
    <div class="prog-name" title={program.name}>{program.name}</div>
    {#if isActive}
      <span class="prog-badge" style="background:{accent}22;color:{accent}">Activo</span>
    {/if}
  </div>
  <div class="prog-meta">{program.weeks.length} semana(s) · {totalExercises} ejercicios totales</div>
  {#if program.createdAt && fmtDate(program.createdAt)}
    <div class="prog-date">Creado el {fmtDate(program.createdAt)}</div>
  {/if}
  <div class="prog-actions">
    {#if !isActive}
      <Button size="sm" variant="secondary" style="flex:1;min-width:0;background:{accent}22;color:{accent}" onclick={() => onactivate(program.id)}>Activar</Button>
    {/if}
    <Button size="sm" variant="secondary" style="flex:1;min-width:0" onclick={() => onedit(program)}>Editar</Button>
    <Button size="sm" variant="secondary" style="flex:1;min-width:0" onclick={() => onduplicate(program)}>Duplicar</Button>
    <Button size="sm" variant="danger" style="flex:1;min-width:0" onclick={() => ondelete(program)}>Eliminar</Button>
  </div>
</div>

<style>
  .program-item { padding: 14px; display: flex; flex-direction: column; gap: 6px; border: 1.5px solid transparent; transition: border-color 0.2s; }
  .program-item.active { border-color: var(--accent); }
  .prog-head { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .prog-name { font-family: var(--font-sans); font-size: 14px; font-weight: 600; color: #fafafa; letter-spacing: -0.3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; flex: 1; }
  .prog-badge { flex-shrink: 0; font-size: 10px; font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase; padding: 3px 8px; border-radius: 9999px; }
  .prog-meta { font-size: 11px; color: rgba(255,255,255,0.45); }
  .prog-date { font-size: 11px; color: rgba(255,255,255,0.45); }
  .prog-actions { display: flex; gap: 6px; margin-top: 4px; }
</style>
