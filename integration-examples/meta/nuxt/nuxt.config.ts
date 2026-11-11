// The Nuxt host proof. `app/proof/` holds the shared Vue proof page; the runner copies it in.
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  devtools: { enabled: false },
  telemetry: false,
  // Real stylesheets: inlined styles would need the per-request nonce.
  css: ['@draftably/runtime/host.css', '~/proof/proof.css'],
  features: { inlineStyles: false },
});
