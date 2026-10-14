<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { Program } from '$lib/types'
  import Button from './Button.svelte'
  import IconButton from './IconButton.svelte'

  // isActive = the big card («Programa activo» dot, name, meta and rows below);
  // otherwise a row of «Otros programas» with Activar and ⋯.
  let { program, meta, isActive = false, onactivate = undefined, onmore = undefined, children }: {
    program: Program
    meta: string
    isActive?: boolean
    onactivate?: () => void
    onmore?: () => void
    /** Active card: NavRows under the name */
    children?: Snippet
  } = $props()
</script>

{#if isActive}
  <section class="pg active" data-component="ProgramCard" data-program-id={program.id}>
    <div class="pg-top">
      <span class="act"><i></i>Programa activo</span>
      {#if onmore}<IconButton icon="more" size="sm" iconSize={20} label="Más opciones" onclick={onmore} />{/if}
    </div>
    <div class="pg-id">
      <div class="pg-n">{program.name}</div>
      <div class="pg-m">{meta}</div>
    </div>
    {#if children}<div class="pg-rows">{@render children()}</div>{/if}
  </section>
{:else}
  <div class="pr" data-component="ProgramCard" data-program-id={program.id}>
    <span class="txt"><span class="pr-n">{program.name}</span><span class="pr-m">{meta}</span></span>
    <Button size="pill" variant="secondary" onclick={onactivate}>Activar</Button>
    <IconButton icon="more" size="sm" iconSize={20} label="Más opciones" onclick={onmore} />
  </div>
{/if}

<style>
  .pg { display: flex; flex-direction: column; gap: 14px; padding-top: 18px; border-radius: var(--radius-2xl); background: var(--surface); overflow: hidden; }
  .pg-top, .pg-id { padding: 0 18px; }
  .pg-top { display: flex; align-items: center; justify-content: space-between; min-height: 24px; margin: -10px -6px -10px 0; padding-right: 0; }
  .act { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); white-space: nowrap; }
  .act i { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
  .pg-n { font-size: 26px; font-weight: 700; letter-spacing: -0.8px; line-height: 1.1; overflow-wrap: anywhere; }
  .pg-m { margin-top: 6px; font-family: var(--font-mono); font-size: 13px; color: var(--text-tertiary); }
  .pg-rows { display: flex; flex-direction: column; border-top: 0.5px solid var(--border-medium); }
  .pg-rows > :global(* + *) { border-top: 0.5px solid var(--border-medium); }
  .pr { display: grid; grid-template-columns: minmax(0, 1fr) auto 44px; align-items: center; gap: 8px; min-height: 72px; padding: 8px 6px 8px 16px; }
  .txt { min-width: 0; }
  .pr-n { display: block; font-size: 16px; font-weight: 500; letter-spacing: -0.2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pr-m { display: block; margin-top: 3px; font-size: 13px; color: var(--text-tertiary); }
</style>
