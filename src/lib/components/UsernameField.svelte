<script lang="ts">
  import TextInput from './TextInput.svelte'

  const MAX_LENGTH = 20
  // Shared TextInput at this view's 52 px touch size; 16 px also keeps iOS from zooming in.
  const FIELD = 'height:52px;padding:0 64px 0 16px;border:0;border-radius:16px;background:rgba(255,255,255,0.06);font-family:var(--font-mono);font-size:16px'

  let { value = $bindable(''), id = undefined, error = '', oninput = undefined }: {
    value: string
    id?: string
    error?: string
    oninput?: (val: string) => void
  } = $props()
</script>

<div class="username-field" data-component="UsernameField">
  <div class="wrap">
    <TextInput {id} bind:value placeholder="tu_usuario" maxlength={MAX_LENGTH} autocomplete="off" style={FIELD} {oninput} autofocus />
    <span class="count">{value.length}/{MAX_LENGTH}</span>
  </div>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</div>

<style>
  .username-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .wrap { position: relative; }
  .wrap :global(input) { text-align: left; }
  .count {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-muted);
    pointer-events: none;
  }
  .error {
    margin: 0;
    padding: 0 4px;
    font-size: 13px;
    color: var(--text-secondary);
    text-align: left;
  }
</style>
