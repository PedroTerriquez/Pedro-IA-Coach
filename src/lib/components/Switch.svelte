<script lang="ts">
  let { checked = false, label, disabled = false, id = undefined, onchange }: {
    checked?: boolean
    /** Accessible name — the switch has no visible text of its own */
    label: string
    disabled?: boolean
    id?: string
    onchange: (checked: boolean) => void
  } = $props()
</script>

<button
  {id}
  type="button"
  role="switch"
  aria-checked={checked}
  aria-label={label}
  class="sw"
  class:on={checked}
  {disabled}
  onclick={() => onchange(!checked)}
  data-component="Switch"
><i></i></button>

<style>
  .sw {
    width: 51px;
    height: 31px;
    flex-shrink: 0;
    display: flex;
    padding: 2px;
    border: 0;
    border-radius: var(--radius-full);
    background: var(--cv-line-strong);
    cursor: pointer;
    transition: background 0.2s;
  }
  .sw i { width: 27px; height: 27px; border-radius: 50%; background: var(--text); transition: transform 0.2s var(--ease-smooth); }
  .sw.on { background: var(--text); }
  .sw.on i { background: var(--bg); transform: translateX(20px); }
  .sw:disabled { opacity: 0.4; cursor: default; }
</style>
