<script lang="ts">
  import { avatarHue } from '$lib/league'

  let { username = '', size = 40, today = false }: {
    username: string
    size?: number
    today?: boolean
  } = $props()

  const initial = $derived(username ? username[0].toUpperCase() : '?')
</script>

<span class="avatar" data-component="Avatar" style="--h:{avatarHue(username)};--s:{size}px">
  {initial}
  {#if today}<i class="today" data-today></i>{/if}
</span>

<style>
  .avatar {
    position: relative;
    flex-shrink: 0;
    width: var(--s);
    height: var(--s);
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: oklch(0.27 0.035 var(--h));
    color: oklch(0.86 0.06 var(--h));
    font-family: var(--font-sans);
    font-weight: 600;
    font-size: calc(var(--s) * 0.4);
    line-height: 1;
  }
  /* --ring is the surface the avatar sits on, so the dot looks cut out of it. */
  .today {
    position: absolute;
    right: -1px;
    bottom: -1px;
    width: calc(var(--s) * 0.3);
    height: calc(var(--s) * 0.3);
    min-width: 10px;
    min-height: 10px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 2.5px var(--ring, var(--bg));
  }
</style>
