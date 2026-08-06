<script lang="ts">
  let {
    value = '',
    placeholder = '',
    rows = 4,
    compact = false,
    oninput = () => {}
  }: {
    value?: string
    placeholder?: string
    rows?: number
    compact?: boolean
    oninput?: (val: string) => void
  } = $props()
</script>

<textarea
  class="textarea-field"
  class:textarea-compact={compact}
  data-component="TextArea"
  {value}
  {placeholder}
  {rows}
  oninput={(e) => oninput((e.target as HTMLTextAreaElement).value)}
></textarea>

<style>
  .textarea-field {
    width: 100%;
    padding: 10px 12px;
    border-radius: 10px;
    border: 0.5px solid rgba(255,255,255,0.1);
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
    font-family: var(--font-sans);
    outline: none;
    resize: vertical;
    box-sizing: border-box;
    line-height: 1.5;
  }
  .textarea-compact {
    font-size: 12px;
    padding: 8px 10px;
  }
</style>
