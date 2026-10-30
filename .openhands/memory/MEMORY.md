# Project memory — amkyaw-editor

Mobile-first video editor UI (Alight Motion / CapCut class). Vite + React 18 +
TS + Tailwind 3 + zustand + framer-motion + lucide-react. Front-end only with
mock data — no backend, no WebGL, no FFmpeg. Dark cinematic theme (violet
#7C3AED → pink #EC4899 gradient, cyan #06B6D4 playhead), 390x844 baseline.

The original engine build (WebGL renderer, scene graph, FFmpeg.wasm export,
Dexie storage, workers) was replaced in the 2026-10-30 redesign; those modules
and the @ffmpeg/dexie/nanoid deps are gone. Do not reintroduce them unless the
user asks for real media processing.

Live: https://amkyaw-editor.vercel.app

## Commands
- `npm run dev` — Vite on :12000 with COOP/COEP headers
- `npm run build` — `tsc --noEmit && vite build` (build fails if types fail)
- `npm test` — vitest, 30 tests, `tests/**/*.test.ts`
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

## Vercel
- Project `amkyaw-editor` (`prj_R2wiyH4njOHtNt5YmtZdSbDgasrW`), team scope
  `amkyaw` = `team_4v526bPF6Q5bxVC2AhZC1Wa1`. Framework detected as vite.
- Live at **https://amkyaw-editor.vercel.app** (production alias, publicly
  reachable). The generated `*-amkyaw.vercel.app` and per-branch
  `*-git-<branch>-amkyaw.vercel.app` aliases are behind SSO
  (`ssoProtection.deploymentType = all_except_custom_domains`), so they return
  a Vercel login page. Use the bare `amkyaw-editor.vercel.app` host to check
  the app, or add a protection-bypass secret for the others.
- Git production branch is `main`, but the first deployment was built from
  `feat/mobile-first-editor` and still became the production alias because the
  project had no prior production deployment.
- Deploy without the CLI (it hangs fetching packages) via
  `POST https://api.vercel.com/v13/deployments?teamId=<team>` with
  `{"name","project","target","gitSource":{"type":"github","repoId":<id>,"ref":"<branch>"}}`.
  Poll `GET /v13/deployments/<id>?teamId=<team>` for `status: READY`.
- `vercel.json` in the repo is honoured: output dir `dist`, SPA rewrite to
  `/index.html`, and COOP/COEP headers are live (confirmed on the deployment).

## Conventions and decisions
- All editor code lives in `src/editor/` with its own zustand store; only
  `lib/math`, `lib/throttle`, `mobile/haptics`, `hooks/useGestures` and
  `hooks/useKeyboardShortcuts` are shared.
- Seconds (not frames) are the time unit in this UI.
- Pointer Events only (no TouchEvents) for gestures — one path for mouse/touch/pen.
- One shared `BottomSheet` in `SheetHost` so switching tools does not replay the
  entrance animation.
- `useGestures` takes an optional external ref; do NOT assign to the returned
  ref's `.current` (it is a `RefObject` and readonly under `strict`).
- Tailwind: the `fontWeight` scale must stay in the config or `font-label` etc.
  fail the build with a postcss error.
- `public/` is copied verbatim and never compiled.
