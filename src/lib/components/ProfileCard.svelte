<script lang="ts">
  import CardRow from './CardRow.svelte'
  import TextInput from './TextInput.svelte'

  let {
    height = $bindable(''),
    weight = $bindable(''),
    sex = $bindable(''),
    age = $bindable(''),
    goal = $bindable(''),
    experience = $bindable(''),
    occupation = $bindable(''),
    accent = 'var(--accent)',
    onsave = (_field: string, _value: string) => {}
  }: {
    height: string
    weight: string
    sex: string
    age: string
    goal: string
    experience: string
    occupation: string
    accent?: string
    onsave?: (field: string, value: string) => void
  } = $props()
</script>

<div class="card" data-component="ProfileCard">
  <CardRow label="Estatura">
    <TextInput id="height-input" type="number" mono bind:value={height} onblur={() => onsave('height', height)} style="width:72px;text-align:right" />
    <span class="unit-label">cm</span>
  </CardRow>
  <CardRow label="Peso">
    <TextInput id="weight-input" type="number" mono bind:value={weight} onblur={() => onsave('weight', weight)} style="width:72px;text-align:right" />
    <span class="unit-label">kg</span>
  </CardRow>
  <CardRow label="Sexo">
    <select id="sex-input" class="input-field" bind:value={sex} onchange={() => onsave('sex', sex)}>
      <option value="">Seleccionar</option>
      <option value="Masculino">Masculino</option>
      <option value="Femenino">Femenino</option>
      <option value="Otro">Otro</option>
    </select>
  </CardRow>
  <CardRow label="Edad">
    <TextInput id="age-input" type="number" mono bind:value={age} onblur={() => onsave('age', age)} style="width:72px;text-align:right" />
  </CardRow>
  <CardRow label="Objetivo">
    <select id="goal-input" class="input-field" bind:value={goal} onchange={() => onsave('goal', goal)}>
      <option value="">Seleccionar</option>
      <option value="hipertrofia">Hipertrofia</option>
      <option value="fuerza">Fuerza</option>
      <option value="perdida de grasa">Pérdida de grasa</option>
      <option value="recomposicion">Recomposición</option>
      <option value="rendimiento">Rendimiento</option>
    </select>
  </CardRow>
  <CardRow label="Experiencia">
    <select id="exp-input" class="input-field" bind:value={experience} onchange={() => onsave('experience', experience)}>
      <option value="">Seleccionar</option>
      <option value="principiante">Principiante</option>
      <option value="intermedio">Intermedio</option>
      <option value="avanzado">Avanzado</option>
    </select>
  </CardRow>
  <CardRow label="Profesión" last={true}>
    <TextInput id="occ-input" type="text" bind:value={occupation} onblur={() => onsave('occupation', occupation)} placeholder="Ej: Ingeniero, oficinista, repartidor…" style="width:160px" />
  </CardRow>
</div>

<style>
  .unit-label { font-size: 12px; color: rgba(255,255,255,0.55); font-family: var(--font-mono); }
</style>
