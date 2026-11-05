import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Draftably VitePress image example',
  description: 'Generated Draftably SVG images in VitePress',
  base: '/manual/',
  srcDir: 'generated-docs',
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/manual/favicon.svg' }]],
  vite: {
    plugins: [
      {
        name: 'example-dev-icon',
        apply: 'serve',
        // VitePress adds site head tags after hydration in development.
        transformIndexHtml: () => [
          {
            tag: 'link',
            attrs: { rel: 'icon', type: 'image/svg+xml', href: '/manual/favicon.svg' },
            injectTo: 'head',
          },
        ],
      },
    ],
  },
});
