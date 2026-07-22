<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { ROUTES } from '$lib/routes'

  onMount(() => {
    goto(ROUTES.today, { replaceState: true })
  })
</script>
