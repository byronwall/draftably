import { importD2Experimental } from '../import/d2-importer';

// D2 detects browsers by `window`; workers expose the same Worker API through `self`.
Object.assign(globalThis, { window: self });

self.onmessage = async (event: MessageEvent<{ source: string; title: string }>) => {
  self.postMessage(await importD2Experimental(event.data.source, event.data.title));
};
