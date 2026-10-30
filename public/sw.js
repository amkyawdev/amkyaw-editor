/* eslint-env serviceworker */
/**
 * Amkyaw Editor service worker.
 *
 * Uses vite-plugin-pwa's injectManifest strategy: `self.__WB_MANIFEST` is
 * replaced at build time with the hashed asset list. Navigation requests use a
 * network-first strategy so users always pick up new deploys; hashed assets are
 * cache-first because their filenames are content-addressed.
 */
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

const VERSION = 'v1'
const RUNTIME_CACHE = `amkyaw-runtime-${VERSION}`
const FFMPEG_CACHE = `amkyaw-ffmpeg-${VERSION}`

self.skipWaiting()
cleanupOutdatedCaches()

precacheAndRoute(self.__WB_MANIFEST)

// SPA navigations: network first, fall back to the precached shell offline.
const navigationHandler = createHandlerBoundToURL('/index.html')
registerRoute(new NavigationRoute(navigationHandler, { denylist: [/^\/api\//, /^\/workers\//] }))

registerRoute(
  ({ url }) => url.pathname.startsWith('/workers/'),
  new StaleWhileRevalidate({ cacheName: `${RUNTIME_CACHE}-workers` }),
)

// FFmpeg core is ~30 MB; keep it around so exports work offline.
registerRoute(
  ({ url }) => url.hostname === 'unpkg.com' || url.hostname.endsWith('ffmpeg'),
  new CacheFirst({
    cacheName: FFMPEG_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true }),
    ],
  }),
)

registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: `${RUNTIME_CACHE}-fonts`,
    plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  }),
)

registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: `${RUNTIME_CACHE}-images`,
    plugins: [new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
)

registerRoute(
  ({ url }) => url.pathname.startsWith('/assets/templates/'),
  new NetworkFirst({
    cacheName: `${RUNTIME_CACHE}-templates`,
    plugins: [new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 7 })],
  }),
)

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
  if (event.data?.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
    )
  }
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key.startsWith('amkyaw-') && !key.endsWith(VERSION))
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})
