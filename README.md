# Amkyaw Editor

A mobile-first, browser-based video and animation editor. It runs entirely on the
device: WebGL2 for preview, FFmpeg.wasm for export, IndexedDB for storage, and a
service worker for offline use. There is no backend.

Live-ready on Vercel — `vercel.json` sets the build, the SPA rewrite, and the
cross-origin isolation headers FFmpeg.wasm needs.

## Why it is built this way

| Decision | Reason |
| --- | --- |
| WebGL2 preview, 2D canvas export | Preview needs shader effects; export needs cheap per-frame readback. |
| Frames as the canonical time unit | Avoids float drift when trimming, scrubbing and exporting. |
| Wall-clock playback accumulator | Dropped animation frames do not slow the timeline down. |
| One shared `BottomSheet` | The drag gesture and backdrop mount once, so switching panels does not replay the entrance animation. |
| Pointer Events for all gestures | One code path serves mouse, touch and pen, and `setPointerCapture` keeps drags alive off-element. |
| Blobs in IndexedDB, ids in the project | Reloading restores media without re-importing. |

## Getting started

```bash
npm install
npm run dev        # http://localhost:12000
npm run build      # typecheck + production build into dist/
npm run preview    # serve the built app on :4173
npm test           # vitest (36 tests)
```

Node 20+ is required.

## Project layout

```
public/
  manifest.json          PWA manifest (installable, standalone)
  sw.js                  service worker source (injectManifest)
  icons/                 192 / 512 / maskable PNGs + SVG
  workers/
    render.worker.js     OffscreenCanvas frame rendering
    thumbnail.worker.js  timeline thumbnail strip generation
    ffmpeg.worker.js     FFmpeg.wasm export off the main thread
  assets/templates/      starter project JSON blueprints
  assets/fonts/          optional self-hosted webfonts

src/
  animations/            easing curves, keyframe evaluation, presets, registry
  components/
    mobile/              BottomSheet, MobileToolbar, PinchViewport,
                         TouchTimeline, FloatingMenu, MobileSheets
    Timeline/            desktop timeline with keyframe diamonds
    Viewport/            canvas surface, desktop + mobile preview
    Sidebar/             layers, inspector, media bin, export
    common/              NumberDrag, Slider, Toasts
  core/                  renderer, scene-graph, compositor, time-controller,
                         audio-mixer, ffmpeg-manager, export-pipeline, effects
  mobile/                performance monitor, memory manager, gestures,
                         haptics, orientation, wake lock, file system
  hooks/                 timeline, animation, playback, gestures, long press,
                         responsive, keyboard shortcuts, editor session
  store/                 project, editor, history, ui (zustand)
  lib/                   math, time, id, throttle, storage (Dexie)
  types/                 layer, animation, track, effect, project
  styles/                globals.css, safe-area.css
```

## Mobile behaviour

* **Safe areas** — `--safe-top/bottom/left/right` from `env(safe-area-inset-*)`
  drive `.safe-frame`, `.bottom-dock` and the toolbar offset, so nothing hides
  under a notch or the home indicator.
* **Thumb reach** — the primary toolbar sits at the bottom edge; panels open as
  drag-up sheets with velocity-aware snapping.
* **Gestures** — pinch to zoom the preview, drag the ruler to scrub, long-press
  for a context menu, double-tap to toggle zoom.
* **Haptics** — `navigator.vibrate` fires on step changes, not on every move.
* **Screen awake** — the wake lock is acquired during playback and export, and
  re-acquired on visibility change because browsers drop it when hidden.
* **Memory** — `MemoryManager` enforces an LRU budget derived from
  `navigator.deviceMemory`, and the performance monitor flags a degraded preview
  below 24 fps.

## Export

Frames are composited at project resolution on a 2D canvas, converted to raw
RGBA, then handed to FFmpeg.wasm in a worker. Supported formats: MP4 (H.264),
WebM (VP9), animated GIF, animated WebP, and PNG sequence.

`vercel.json` and the Vite dev/preview servers send `Cross-Origin-Opener-Policy:
same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. Those headers make
`SharedArrayBuffer` available, which is what the multi-threaded FFmpeg core
requires. Without them export still works, but single-threaded and slower.

On phones the finished file is offered through the native share sheet
(`navigator.share`) and falls back to a download.

## Keyboard shortcuts (desktop)

| Key | Action |
| --- | --- |
| `Space` / `K` | Play or pause |
| `←` / `→` | Step one frame |
| `Shift` + `←` / `→` | Step ten frames |
| `V` / `H` / `T` | Select, hand, text tool |
| `⌘Z` / `Ctrl+Z` | Undo |

## Deploying to Vercel

```bash
npm i -g vercel
vercel          # preview deployment
vercel --prod   # production deployment
```

Vercel reads `vercel.json`: `npm run build` produces `dist/`, everything outside
`/assets`, `/workers`, `/icons` and the PWA files rewrites to `/index.html`, and
the isolation headers are applied to all routes. If a preview deployment has
Deployment Protection enabled, automated checks need a Protection Bypass secret
sent as the `x-vercel-protection-bypass` header.

## Testing

`npm test` covers the pure logic that is easy to get subtly wrong: frame/time
conversion and timecode round-tripping, easing curves, keyframe interpolation
and clamping, scene-graph flattening and parent/child ordering, animated track
resolution, and project store mutations. Rendering and export need a real GPU
and are verified manually.
