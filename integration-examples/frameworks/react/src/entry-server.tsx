import { renderToString } from 'react-dom/server';
import { renderSvg } from '@draftably/runtime';
import { App } from './App';
import { sources } from '../../sources.js';

export async function render() {
  const svgs = await Promise.all(
    sources.map(async (source, i) => {
      const result = await renderSvg(source, { target: 'inline', idPrefix: `d${i}` });
      return result.ok ? result.value.svg : '';
    }),
  );
  return renderToString(<App svgs={svgs} />);
}
