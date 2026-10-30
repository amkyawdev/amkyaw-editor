# Bundled fonts

Drop self-hosted `.woff2` files here and reference them from `src/styles/globals.css`
with an `@font-face` rule. The service worker caches `request.destination === 'font'`
with a cache-first strategy, so once a font has been used it works offline.

The editor defaults to `Inter` and falls back through
`system-ui → -apple-system → Segoe UI → sans-serif` (see `tailwind.config.js`),
so shipping a webfont is optional.
