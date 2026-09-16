<script lang="ts">
  let { label, size = 'md', onclick }: {
    label: string
    size?: 'sm' | 'md'
    onclick?: () => void
  } = $props()
</script>

<button class="del-btn {size}" type="button" aria-label={label} {onclick} data-component="DeleteButton">✕</button>

<style>
  .del-btn {
    background: none;
    border: 0;
    color: #ff6b6b;
    cursor: pointer;
    padding: 4px;
    flex-shrink: 0;
    line-height: 1;
  }
  .md { font-size: 14px; }
  .sm { font-size: 12px; padding: 2px 4px; }
</style>
