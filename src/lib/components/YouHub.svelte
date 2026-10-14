<script lang="ts">
  import type { Program } from '$lib/types'
  import { programMeta } from '$lib/program-utils'
  import PageHeader from './PageHeader.svelte'
  import YouScreen from './YouScreen.svelte'
  import ProgramCard from './ProgramCard.svelte'
  import NavGroup from './NavGroup.svelte'
  import NavRow from './NavRow.svelte'

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
</script>

<YouScreen gap={28} id="you-hub">
  <PageHeader eyebrow="Tú" title="{userName}." sub={subtitle} />

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
    <NavRow id="you-row-copia" label="Copia de seguridad" sub="Tus datos viven solo en este teléfono" onclick={() => onnavigate('copia')} />
  </NavGroup>
</YouScreen>
