# Project memory — amkyaw-editor

Mobile-first browser video/animation editor. Vite + React 18 + TS + Tailwind 3,
zustand stores, WebGL2 preview, FFmpeg.wasm export, Dexie/IndexedDB storage, PWA.

## Commands
- `npm run dev` — Vite on :12000 with COOP/COEP headers
- `npm run build` — `tsc --noEmit && vite build` (build fails if types fail)
- `npm test` — vitest, 36 tests, `tests/**/*.test.ts`
- `npm run preview` — serves dist on :4173

## Environment quirks (cost real time to discover)
- The git remote is `amkyawdev/amkyaw-editor` and the clone is shallow (grafted).
- **Pushes fail with 403.** The `GITHUB_TOKEN` is a GitHub App installation
  token: it authenticates as user `amkyawdev` and the API reports
  `permissions: {push: true}` on the repo, but ref writes still return
  `Resource not accessible by integration`. `x-oauth-scopes` is empty, which is
  the tell that it is an App token, not a PAT. The 403 comes from the App
  installation's *contents: write* grant, not from the token being expired.
  Fix is outside the agent: grant the App Contents write, or supply a PAT with
  `repo` scope (e.g. via a registered secret) and use it in the remote URL.
- The pre-existing remote URL had a stale embedded token; it was replaced with
  `${GITHUB_TOKEN}` via `git remote set-url`.
- Vite dev/preview need `allowedHosts: true` or the sandbox runtime host is
  rejected with "Blocked request. This host is not allowed."
- `vercel.json` must not contain a `$schema` key; Vercel's validator rejects it.

## Conventions and decisions
- Frames are the canonical time unit; seconds only at the edges (`src/lib/time.ts`).
- Pointer Events only (no TouchEvents) for gestures — one path for mouse/touch/pen.
- One shared `BottomSheet` instance in `MobileSheets` so switching panels does
  not replay the entrance animation.
- Workers live in `public/workers/` as plain JS (not bundled, not typechecked).
  Worker code that needs types belongs under `src/`.
- `public/` is copied verbatim — files there are never compiled.
- Easing is authored on the *outgoing* keyframe (the segment it starts).
- Effects in the export pipeline are limited to what canvas 2D filters support;
  vignette runs as a second pass with `source-atop`.
