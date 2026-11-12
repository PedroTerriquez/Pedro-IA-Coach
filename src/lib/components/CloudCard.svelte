<script lang="ts">
  import Card from './Card.svelte'
  import Lead from './Lead.svelte'
  import Button from './Button.svelte'

  // Tú without an account: invites to protect the user and keep a cloud copy.
  let { oncreate }: { oncreate: () => void } = $props()
</script>

<div id="cloud-card">
  <Card title="Guarda tus datos en la nube">
    <Lead size={14}>Protege tu usuario con correo y contraseña y recupera todo en otro teléfono.</Lead>
    <Button size="pill" variant="primary" id="cloud-card-create" onclick={oncreate}>Crear cuenta</Button>
  </Card>
</div>
