<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { ROUTES } from '$lib/routes'
  import { getSettings } from '$lib/storage'

  onMount(async () => {
    const s = await getSettings()
    const isNew = (!s.userName || s.userName === 'Pedro') && !s.age
    goto(isNew ? ROUTES.you : ROUTES.today, { replaceState: true })
  })
</script>
