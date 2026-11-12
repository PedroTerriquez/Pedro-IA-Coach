<script lang="ts">
  import type { Program } from '$lib/types'
  import { programMeta } from '$lib/program-utils'
  import { cloudState, uploadStatusLabel } from '$lib/cloud'
  import PageHeader from './PageHeader.svelte'
  import YouScreen from './YouScreen.svelte'
  import ProgramCard from './ProgramCard.svelte'
  import NavGroup from './NavGroup.svelte'
  import NavRow from './NavRow.svelte'
  import { settings } from '$lib/stores/settings'
  import CloudCard from './CloudCard.svelte'
  import VerifiedCard from './VerifiedCard.svelte'
  import VerifiedBadge from './VerifiedBadge.svelte'
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

  // «Tu cuenta está lista» stays until «Listo»; a reload shows only the row.
  let justVerified = $state(false)

  function openAccount(mode: 'crear' | 'entrar') {
    accountMode = mode
    accountOpen = true
  }
  let account = $derived($cloudState.account)
  let statusLabel = $derived(uploadStatusLabel($cloudState.status))
  // The user in the label and the email under it: both on one line each at 390 px.
  let accountLabel = $derived(account ? `Cuenta · ${account.username}` : 'Cuenta')
</script>

<YouScreen gap={28} id="you-hub">
  <PageHeader eyebrow="Tú" title="{userName}." sub={subtitle} />

  {#if !account}
    <CloudCard username={$settings.username || ''} oncreate={() => openAccount('crear')} onlogin={() => openAccount('entrar')} />
  {:else if justVerified}
    <VerifiedCard username={account.username} {statusLabel} pending={$cloudState.status.pending || !$cloudState.status.lastAt} onclose={() => (justVerified = false)} />
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
      <NavRow id="you-row-cuenta" label={accountLabel} sub={account.email} chevron={false}>
        {#snippet trailing()}
          <span class="acct-v"><VerifiedBadge /><span class="acct-status">{statusLabel}</span></span>
        {/snippet}
      </NavRow>
      <NavRow id="you-row-copia" label="Copia de seguridad" onclick={() => onnavigate('copia')} />
    {:else}
      <NavRow id="you-row-copia" label="Copia de seguridad" sub="Tus datos viven solo en este teléfono" onclick={() => onnavigate('copia')} />
    {/if}
  </NavGroup>
</YouScreen>

<AccountSheet bind:open={accountOpen} bind:mode={accountMode} oncreated={() => (justVerified = true)} />

<style>
  .acct-v { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
  .acct-v :global([data-component='VerifiedBadge']) { align-self: flex-end; }
  .acct-status { font-family: var(--font-mono); font-size: 15px; letter-spacing: -0.02em; color: var(--text-secondary); white-space: nowrap; }
</style>
