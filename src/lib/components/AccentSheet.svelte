<script lang="ts">
  import { ACCENT_PRESETS } from '$lib/settings-options'
  import Sheet from './Sheet.svelte'
  import Icon from './Icon.svelte'

  // 5 colours + «Otro» (free picker). Applies on tap; the sheet stays to show the preview.
  let { open = $bindable(false), value, onpick }: {
    open: boolean
    value: string
    onpick: (color: string) => void
  } = $props()

  let isPreset = $derived(ACCENT_PRESETS.some(p => p.color.toLowerCase() === value.toLowerCase()))
</script>

<Sheet bind:open title="Color de la app" id="accent-sheet">
  <div class="acc" role="radiogroup" aria-label="Color de la app">
    {#each ACCENT_PRESETS as p}
      {@const on = p.color.toLowerCase() === value.toLowerCase()}
      <button type="button" class:on role="radio" aria-checked={on} onclick={() => onpick(p.color)}><i style="background:{p.color}"></i>{p.name}</button>
    {/each}
    <label class="other" class:on={!isPreset}>
      <i class="oth" style={isPreset ? '' : `background:${value}`}>{#if isPreset}<Icon name="plus" size={18} />{/if}</i>Otro
      <input type="color" {value} aria-label="Otro color" oninput={(e) => onpick((e.target as HTMLInputElement).value)} />
    </label>
  </div>
  <div class="prev">
    <span class="lbl">Vista previa</span>
    <span class="btn-prev">Empezar con Press Banca</span>
  </div>
  <p class="cap">Se aplica al tocar. Solo cambia el botón principal y el punto de «Programa activo». «Otro» abre el selector de color.</p>
</Sheet>

<style>
  .acc { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 4px; }
  .acc button, .other {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    min-height: 84px;
    padding-top: 6px;
    border: 0;
    background: none;
    font-size: 12px;
    color: var(--text-secondary);
    text-align: center;
    cursor: pointer;
  }
  .acc i { width: 44px; height: 44px; border-radius: 50%; display: block; }
  .acc i.oth { display: grid; place-items: center; border: 1px dashed var(--cv-ring-current); color: var(--text-secondary); }
  .acc .on { color: var(--text); font-weight: 600; }
  .acc .on i { box-shadow: 0 0 0 3px var(--surface), 0 0 0 5px var(--text); }
  .other input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .prev { display: flex; flex-direction: column; gap: 8px; padding: 16px; border-radius: var(--radius-lg); background: var(--cv-fill-1); }
  .lbl { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); }
  .btn-prev { display: flex; align-items: center; justify-content: center; height: 52px; border-radius: var(--cv-radius-field); background: var(--accent); color: var(--bg); font-size: 16px; font-weight: 600; }
  .cap { margin-bottom: -8px; font-size: 13px; line-height: 1.45; text-align: center; color: var(--text-tertiary); }
</style>
