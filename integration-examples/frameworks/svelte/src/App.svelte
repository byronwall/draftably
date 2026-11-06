<script>
  import { DraftDiagram } from '@draftably/svelte';
  import { DraftEditor } from '@draftably/svelte/editor';
  import { recordChange, sources, updated } from '../../sources.js';

  let { svgs = [] } = $props();
  let list = $state(sources);
  let edits = $state(sources.slice(0, 2));
  const record = result => (window.__updates ??= []).push(result.status);
</script>

<main>
  <button id="update" onclick={() => (list = [updated, ...list.slice(1)])}>Update first</button>
  <button id="remove" onclick={() => (list = list.slice(0, 2))}>Remove last</button>
  {#each list as source, i (i)}
    <DraftDiagram {source} label={`Diagram ${i + 1}`} outline={i === 0 ? 'visible' : undefined} svg={svgs[i]} onupdate={record} />
  {/each}
  {#each edits as source, i (i)}
    <DraftEditor
      {source}
      style="height: 20rem"
      onchange={next => {
        recordChange(i, next);
        edits = edits.map((s, j) => (j === i ? next : s));
      }}
    />
  {/each}
</main>
