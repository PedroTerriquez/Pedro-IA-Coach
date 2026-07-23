<script lang="ts">
  let { message, style = '', class: className = '' }: {
    message: string
    style?: string
    class?: string
  } = $props()
</script>

<div class="empty-state {className}" data-component="EmptyState" {style}>
  {message}
</div>

<style>
  .empty-state {
    padding: 40px 20px;
    text-align: center;
    font-size: 13px;
    color: rgba(255,255,255,0.4);
  }
</style>
