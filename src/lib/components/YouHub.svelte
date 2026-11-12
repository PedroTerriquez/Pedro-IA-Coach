<script lang="ts">
  import type { Program } from '$lib/types'
  import { programMeta } from '$lib/program-utils'
  import { cloudState, uploadStatusLabel } from '$lib/cloud'
  import PageHeader from './PageHeader.svelte'
  import YouScreen from './YouScreen.svelte'
  import ProgramCard from './ProgramCard.svelte'
  import NavGroup from './NavGroup.svelte'
  import NavRow from './NavRow.svelte'
  import CloudCard from './CloudCard.svelte'
  import AccountSheet from './AccountSheet.svelte'

  type View = 'datos' | 'programas' | 'ejercicios' | 'ajustes' | 'copia'

  let { userName, subtitle, activeProgram, programCount, profileFilled, exerciseCount, onnavigate }: {
    userName: string
    subtitle: string
    activeProgram: Program | null
    programCount: number
    profileFilled: number
    exerciseCount: number
    onnavigate: (view: View) => void
  } = $props()

  let accountOpen = $state(false)
  let accountMode = $state<'crear' | 'entrar'>('crear')

  function openCreate() {
    accountMode = 'crear'
    accountOpen = true
  }
  let account = $derived($cloudState.account)
  // The user in the label and the email under it: both on one line each at 390 px.
  let accountLabel = $derived(account ? `Cuenta · ${account.username}` : 'Cuenta')
</script>

<YouScreen gap={28} id="you-hub">
  <PageHeader eyebrow="Tú" title="{userName}." sub={subtitle} />

  {#if !account}
    <CloudCard oncreate={openCreate} />
  {/if}

  {#if activeProgram}
    <ProgramCard program={activeProgram} meta={programMeta(activeProgram)} isActive>
      <NavRow id="you-row-programas" label="Ver y cambiar programas" value={programCount} onclick={() => onnavigate('programas')} />
    </ProgramCard>
  {:else}
    <NavGroup>
      <NavRow id="you-row-programas" label="Programas" sub="Ninguno activo. Elige cuál usar." value={programCount} onclick={() => onnavigate('programas')} />
    </NavGroup>
  {/if}

  <NavGroup>
    <NavRow id="you-row-datos" label="Mis datos" value="{profileFilled} de 7" onclick={() => onnavigate('datos')} />
    <NavRow id="you-row-ejercicios" label="Ejercicios" value={exerciseCount} onclick={() => onnavigate('ejercicios')} />
    <NavRow id="you-row-ajustes" label="Ajustes" onclick={() => onnavigate('ajustes')} />
    {#if account}
      <NavRow id="you-row-cuenta" label={accountLabel} sub={account.email} value={uploadStatusLabel($cloudState.status)} chevron={false} />
      <NavRow id="you-row-copia" label="Copia de seguridad" onclick={() => onnavigate('copia')} />
    {:else}
      <NavRow id="you-row-copia" label="Copia de seguridad" sub="Tus datos viven solo en este teléfono" onclick={() => onnavigate('copia')} />
    {/if}
  </NavGroup>
</YouScreen>

<AccountSheet bind:open={accountOpen} bind:mode={accountMode} />
