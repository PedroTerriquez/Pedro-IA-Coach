<script lang="ts">
  import Card from './Card.svelte'
  import Lead from './Lead.svelte'
  import Button from './Button.svelte'
  import VerifiedBadge from './VerifiedBadge.svelte'

  // Right after creating the account (Cuenta v2): «Listo» leaves only the row.
  let { username, statusLabel, pending, onclose }: {
    username: string
    /** «Guardado hoy 18:42» · «Pendiente de subir» */
    statusLabel: string
    pending: boolean
    onclose: () => void
  } = $props()
</script>

<div id="cloud-verified">
  <Card>
    <VerifiedBadge />
    <h3>Tu cuenta está lista</h3>
    {#if pending}
      <Lead size={14}>Tu usuario <b class="who">{username}</b> está protegido. Tus datos se subirán en cuanto haya conexión.</Lead>
    {:else}
      <Lead size={14}>Tus datos de <b class="who">{username}</b> ya están en la nube. Puedes recuperarlos en otro teléfono.</Lead>
    {/if}
    <div class="foot">
      <span class="status">{statusLabel}</span>
      <Button size="pill" variant="secondary" id="cloud-verified-done" onclick={onclose}>Listo</Button>
    </div>
  </Card>
</div>

<style>
  h3 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.2; }
  .who { font-family: var(--font-mono); font-weight: 600; color: var(--text); }
  .foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 4px; }
  .status { font-family: var(--font-mono); font-size: 13px; color: var(--text-secondary); white-space: nowrap; }
</style>
