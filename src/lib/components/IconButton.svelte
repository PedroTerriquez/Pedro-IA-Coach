<script lang="ts">
  import Icon from './Icon.svelte'

  let { icon, label, size = 'md', variant = 'default', disabled = false, id = undefined, iconSize = undefined, onclick }: {
    icon: string
    /** Always required: the button has no visible text */
    label: string
    /** md = 56 square (dock) · sm = 44 round, no fill */
    size?: 'md' | 'sm'
    variant?: 'default' | 'primary' | 'filled'
    disabled?: boolean
    id?: string
    iconSize?: number
    onclick?: (e: MouseEvent) => void
  } = $props()
</script>

<button
  {id}
  type="button"
  class="ib {size} {variant}"
  aria-label={label}
  {disabled}
  {onclick}
  data-component="IconButton"
><Icon name={icon} size={iconSize ?? (size === 'md' ? 22 : 18)} /></button>

<style>
  .ib {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border: 0;
    padding: 0;
    cursor: pointer;
    color: var(--text);
  }
  .md { width: 56px; height: 56px; border-radius: var(--radius-lg); background: var(--cv-fill-2); }
  .md.primary { background: var(--accent); color: var(--bg); }
  .sm { width: 44px; height: 44px; border-radius: 50%; background: none; color: var(--text-tertiary); }
  .sm.filled { background: var(--cv-fill-3); color: var(--text); }
  .ib:disabled { opacity: 0.3; cursor: default; }
</style>
