---
'@draftably/runtime': minor
'@draftably/editor': minor
'@draftably/react': minor
'@draftably/solid': minor
'@draftably/vue': minor
'@draftably/svelte': minor
---

**One host contract for every framework.** `<draft-diagram>` and `<draft-editor>` now give every
host the same things: every option, every event as a `draft-<name>` event, a `status` attribute,
one camera, geometry, and your own content on a node through `data-draft-slot` children. The
React, Solid, Vue and Svelte packages map these to each framework's idiom and add nothing that
plain DOM cannot reach. The framework guide has a complete, type-checked recipe for each
framework and for plain HTML, and the stack is proven on server-rendered, hydrated pages in Vite,
Next.js, SolidStart, Nuxt and SvelteKit under a strict nonce CSP.

Also in this release:

- `@draftably/react/server` exports `renderSvg` for React Server Components. The main entry is a
  client module, so a Next.js server component cannot call its exports.
- The built worker URLs start with `./`. A bundler with an `assets` alias (Nuxt) no longer drops
  the viewer's and the editor's workers.
- The Solid wrappers write no `style=""` when `style` is unset, so a strict CSP logs no violation.

### Breaking changes

The packages are 0.x, so this minor release carries every break, with no shims.

| Change                                                  | Before                                        | After                                                           |
| ------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------- |
| `draft-change` detail and the wrappers' change callback | the source string                             | `{ source }`                                                    |
| Setting `options`, `label` or `outline` on the viewer   | re-mounts the viewer and loses the camera     | applies live; only `execution` and `render.fonts` re-mount      |
| `ViewerOptions.toolbar: false`                          | no toolbar is built                           | the toolbar is built and hidden                                 |
| `MountedEditor.session`                                 | the editor's internal store                   | removed; use the handle's methods                               |
| `MountOptions` for `mountEditor`                        | every session option, including `urlState`    | `storageKey`, `openLink`, `confirm`, `onInteract`, `detail`     |
| `MountedEditor.update(source)`                          | resolves to nothing                           | resolves to `{ status, revision }`                              |
| Editor zoom range                                       | 0.08–4                                        | 0.02–8, as the viewer                                           |
| Camera event reason                                     | `'user' \| 'resize' \| 'fit' \| 'api'`        | adds `'restore'`                                                |
| Viewer `camera` event during a pan                      | once, on pointer-up                           | at most once per animation frame                                |
| `viewer.fit()`                                          | returns nothing; fits 92 % of the view        | returns a `MoveResult`; 32 px padding                           |
| `link` on `<draft-diagram>`                             | reachable only through `el.viewer.on('link')` | `draft-link`, a cancelable event: call `event.preventDefault()` |
| `<draft-editor>` DOM                                    | the editor's DOM in the element's children    | in its shadow root; children are slot content                   |
| Editor styles                                           | one sheet on the page                         | adopted in the element's shadow root                            |
| Editor color properties                                 | on `.draft-editor`                            | on `:host`; set them on `draft-editor`                          |
| Viewer viewport and frame                               | `overflow: hidden`                            | `overflow: clip`                                                |

#### The change callback receives `{ source }`

```tsx
// Before
<DraftEditor source={source} onChange={next => setSource(next)} />;
editor.addEventListener('draft-change', e => save((e as CustomEvent<string>).detail));

// After
<DraftEditor source={source} onChange={({ source }) => setSource(source)} />;
editor.addEventListener('draft-change', e => save(e.detail.source));
```

Every wrapper event prop now receives the event's `detail`, so this holds for Solid `onChange`,
Vue `@change` and Svelte `onchange` too.

#### Options apply live

```ts
// Before: each set re-mounted the viewer, so a React parent that passed a new object on every
// render lost the camera on every render.
diagram.options = { toolbar: false };

// After: a new object with the same values does nothing; `label`, `outline`, `toolbar`,
// callbacks and render settings apply live. Only `execution` and `render.fonts` re-mount.
diagram.options = { toolbar: false };
```

`toolbar: false` now builds a hidden toolbar, so a later `toolbar: true` shows it without a
re-mount. Hide it with CSS if you relied on its absence from the DOM.

#### The editor handle replaces `session`

```ts
// Before
const editor = mountEditor(host, { source, onChange, urlState: false });
editor.session.fitView(); // the internal store, typed as public
await editor.update(next);

// After
const editor = mountEditor(host, { source, onChange });
editor.fit();
editor.select(['api']);
const result = await editor.update(next); // { status: 'committed' | 'error' | 'destroyed', revision }
```

The handle has `getCamera`, `setCamera`, `fit(ids?, options?)`, `reveal(id, options?)`,
`geometry()`, `select`, `selection`, `anchor` and `on(type, listener)`, as the viewer does.

#### One camera and one zoom range

```ts
// Before: fit() returned nothing and filled 92 % of the view; the editor zoomed 0.08–4.
viewer.fit();

// After
const moved = viewer.fit(['api', 'db'], { padding: 48, maxZoom: 1 }); // 'moved' | 'unchanged' | 'missing' | 'pending'
viewer.on('camera', ({ camera, reason }) => save(camera)); // reason may be 'restore'
```

A `camera` listener now hears a pan as it happens, at most once per frame, not once at the end.
Handle `'restore'` wherever you switch on the reason.

#### Links are cancelable events on the element

```ts
// Before
diagram.viewer!.on('link', event => {
  event.preventDefault();
  router.push(event.href);
});

// After
diagram.addEventListener('draft-link', event => {
  event.preventDefault();
  router.push(event.detail.href);
});
```

`viewer.on('link')` still works and still carries `preventDefault()`; listeners on the element now
survive a re-mount.

#### The editor renders in a shadow root

```css
/* Before: page CSS could reach the editor's DOM, and its tokens sat on .draft-editor. */
.draft-editor {
  --accent: #0f766e;
}

/* After: set tokens on the element. Children are slot content, not the editor's DOM. */
draft-editor {
  --accent: #0f766e;
}
draft-editor[data-theme='dark'] {
  /* the dark set */
}
```

Code that queried the editor's DOM from the page (`document.querySelector('.canvas')`) must go
through `el.shadowRoot`, or better, through the handle. Import `@draftably/runtime/host.css` once
per page: it reserves both elements' heights and hides slot content until they load.

#### `overflow: clip`

The viewer's viewport and frame use `overflow: clip`, so focus in off-screen slot content never
scrolls the diagram. A host rule that scrolled the element's frame no longer can.
