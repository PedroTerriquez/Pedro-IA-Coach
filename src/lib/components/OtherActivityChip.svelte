<script lang="ts">
  import Icon from './Icon.svelte'

  // «Otra actividad» beside the day's title in Hoy (Nuevo · Hoy actividades)
  let { onclick }: { onclick: () => void } = $props()
</script>

<button type="button" class="chip" data-component="OtherActivityChip" aria-label="Otra actividad" {onclick}>
  <span class="ic"><Icon name="plus" size={18} /></span>
  <span class="l">Otra<br />actividad</span>
</button>

<style>
  .chip {
    flex-shrink: 0; align-self: flex-start; margin-top: 10px; min-height: 56px; padding: 8px 14px 8px 8px;
    display: flex; align-items: center; gap: 10px;
    border: 0; border-radius: 18px; cursor: pointer; text-align: left;
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 38%, transparent);
    color: var(--text); font-family: inherit; font-size: 14px; font-weight: 600; line-height: 1.15; letter-spacing: -0.1px;
  }
  .chip:active { transform: scale(0.97); }
  .ic { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; flex-shrink: 0; background: var(--accent); color: var(--bg); }
  @media (max-width: 340px) {
    .chip { margin-top: 4px; min-height: 52px; padding: 6px 10px 6px 6px; gap: 8px; font-size: 13px; }
    .ic { width: 36px; height: 36px; border-radius: 11px; }
  }
</style>
