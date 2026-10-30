# Amkyaw Editor

A mobile-first video editor UI built with React, TypeScript and Tailwind CSS.
Dark, cinematic, and designed around a 390×844 iPhone baseline.

![stack](https://img.shields.io/badge/React-18-7C3AED) ![stack](https://img.shields.io/badge/TypeScript-5-06B6D4) ![stack](https://img.shields.io/badge/Tailwind-3-EC4899)

## Live

**https://amkyaw-editor.vercel.app**

## Design system

| Token | Value | Use |
| --- | --- | --- |
| `base` | `#0A0A0F` | App background |
| `surface1` | `#14141C` | Cards, bars |
| `surface2` | `#1E1E2A` | Elevated panels |
| `edge` | `#2A2A3A` | 1px dividers |
| `primary` | `#7C3AED` | Buttons, active states, selection |
| gradient | `135deg, #7C3AED → #EC4899` | Primary actions, Export |
| `secondary` | `#06B6D4` | Playhead, sliders, timecode |
| `success` / `warning` / `danger` | `#10B981` / `#F59E0B` / `#EF4444` | Status |
| `ink` / `muted` / `disabled` | `#F5F5F7` / `#8B8B9E` / `#4A4A5A` | Text tiers |

Radii: 12px cards, 16px sheets, 20px buttons, 999px pills.
Shadow: `0 8px 32px rgba(0,0,0,0.4)`. Glass: `rgba(30,30,42,0.7)` + `blur(20px)`.
Active glow: `0 0 20px rgba(124,58,237,0.4)`.

Type: Inter / SF Pro Display. 11px micro, 13px body, 15px button, 18px title, 22px screen.
Weights 400 / 500 / 600 / 700, exposed as `font-body`, `font-label`, `font-btn`, `font-head`.

## Layout (portrait 390×844)

```
┌─────────────────────────────┐
│ TOP BAR 56px   name · undo · export (glass)
├─────────────────────────────┤
│ VIEWPORT  flex-1  pinch-zoom, checkerboard, handles
├─────────────────────────────┤
│ PLAYBACK 48px  clock · play · duration + cyan bar
├─────────────────────────────┤
│ TIMELINE 160px  48px gutter + scrolling clips + playhead
├─────────────────────────────┤
│ TOOLBAR 64px  Layer · Effects · Text · Transform · Settings
└─────────────────────────────┘
        safe-area-inset-bottom
```

The viewport is the only element that flexes, so the timeline and toolbar never
move as the preview resizes.

## Interactions

| Gesture | Result |
| --- | --- |
| Tap a clip | Select it; trim handles appear |
| Drag a clip horizontally | Move it along the timeline |
| Long-press a clip | Context menu: duplicate, split at playhead, delete |
| Drag the ruler | Scrub the playhead |
| Pinch the preview | Zoom 0.5×–4× |
| Double-tap the preview | Toggle 2× / reset |
| Swipe down on the preview | Reset zoom |
| Drag the sheet handle down | Dismiss the sheet |

Motion: `scale(0.95)` on press with a 150ms ease-out spring, sheets slide up over
300ms `cubic-bezier(0.32,0.72,0,1)`, panels fade+slide in 200ms. Haptics fire via
`navigator.vibrate` on selection, step changes and errors.

## UX principles applied

1. **Thumb zone** — every primary action is in the bottom 40% of the screen.
2. **Touch targets** — 44px minimum, 48px for the primary transport and Export.
3. **No critical action top-right** — Export is duplicated conceptually but the
   toolbar owns the reachable path; the top bar holds only frequent-but-safe actions.
4. **No hover states** — all feedback is press/active or focus-visible.
5. **Progressive disclosure** — advanced controls live in bottom sheets.
6. **Long-press for context** — never right-click.
7. **Empty states** — gradient illustration plus "Tap + to add your first clip".
8. **Loading** — shimmer skeletons, never spinners.
9. **Errors** — toasts anchored above the toolbar, auto-dismissing at 3s (4.2s for errors).

## Project layout

```
src/
  editor/
    EditorApp.tsx          shell: phone-first, desktop side-by-side
    useEditorStore.ts      zustand store: project, transport, history, toasts
    types.ts               types, colour map, clock formatting
    mockData.ts            3 sample layers, 5 clips, 10 effects
    components/
      TopBar.tsx           inline-editable name, undo/redo, Export
      Viewport.tsx         pinch zoom, checkerboard, selection handles
      PlaybackBar.tsx      transport + cyan progress bar
      Timeline.tsx         ruler scrub, clips, drag-move, playhead
      LayerInspector.tsx   X/Y/Scale/Rotation/Opacity + keyframe diamonds
      ToolBar.tsx          5 tools, active glow
      BottomSheet.tsx      drag-to-dismiss sheet
      ContextMenu.tsx      long-press menu, edge-clamped
      Toasts.tsx           tone-coloured, above the toolbar
      EmptyState.tsx  Skeleton.tsx
      AddSheet / EffectsSheet / TextSheet / TransformSheet /
      SettingsSheet / ExportSheet / SheetHost
  hooks/
    useGestures.ts         pointer gestures: tap, double-tap, long-press, pan, pinch
    useKeyboardShortcuts.ts
  mobile/haptics.ts        vibration patterns + step-change feedback
  lib/                     math, throttle, time
  styles/                  globals.css (tokens), safe-area.css
```

## Getting started

```bash
npm install
npm run dev        # http://localhost:12000
npm run build      # typecheck + production build into dist/
npm run preview    # serve the build on :4173
npm test           # vitest, 30 tests
```

Node 20+ required.

## Tests

`npm test` covers the logic that is easy to get subtly wrong: clock and duration
formatting, the layer/clip/effect reducers, undo/redo (including redo-stack
invalidation), clip split bounds, clip drag clamping, zoom clamping, and mock
project integrity (every clip resolves to a real layer, ids unique).

## Keyboard (desktop)

| Key | Action |
| --- | --- |
| `Space` | Play / pause |
| `←` / `→` | Step one frame |
| `Shift` + `←` / `→` | Step one second |
| `⌘Z` / `Ctrl+Z` | Undo (`Shift` to redo) |
| `Escape` | Close the open sheet |

## Deploying

```bash
vercel --prod
```

`vercel.json` sets `npm run build`, the `dist` output directory, the SPA rewrite,
and long-lived caching for hashed assets. This is a front-end-only app with mock
data — there is no backend, and nothing is uploaded.
