import { render as renderApp } from 'svelte/server';
import { renderSvg } from '@draftably/runtime';
import App from './App.svelte';
import { sources } from '../../sources.js';

export async function render() {
  const svgs = await Promise.all(
    sources.map(async (source, i) => {
      const result = await renderSvg(source, { target: 'inline', idPrefix: `d${i}` });
      return result.ok ? result.value.svg : '';
    }),
  );
  return renderApp(App, { props: { svgs } }).body;
}
