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
- **`GITHUB_TOKEN` cannot write to this repo.** It is a GitHub App installation
  token (empty `x-oauth-scopes` is the tell) and ref writes return 403
  `Resource not accessible by integration`, even though the API reports
  `permissions: {push: true}`. Pushing requires a real PAT with `repo` scope
  instead. Never store the PAT in `.git/config`; push with a one-off URL:
  `git push https://x-access-token:$PAT@github.com/amkyawdev/amkyaw-editor.git <branch>`.
- `remote.origin.fetch` was narrowed to `+refs/heads/main:...`, so no other
  remote-tracking refs existed and `git status` could not report ahead/behind.
  Widened to `+refs/heads/*:refs/remotes/origin/*`.
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
