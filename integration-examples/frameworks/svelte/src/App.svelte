<script>
  import { DraftDiagram } from '@draftably/svelte';
  import { sources, updated } from '../../sources.js';

  let { svgs = [] } = $props();
  let list = $state(sources);
  const record = result => (window.__updates ??= []).push(result.status);
</script>

<main>
  <button id="update" onclick={() => (list = [updated, ...list.slice(1)])}>Update first</button>
  <button id="remove" onclick={() => (list = list.slice(0, 2))}>Remove last</button>
  {#each list as source, i (i)}
    <DraftDiagram {source} label={`Diagram ${i + 1}`} svg={svgs[i]} onupdate={record} />
  {/each}
</main>
