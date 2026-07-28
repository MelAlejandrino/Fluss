# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Fluss is

A cross-platform desktop app (Tauri 2 + React 19 + TypeScript) that is a **UI/UX layer around `yt-dlp`** (with bundled FFmpeg). It does not reimplement media extraction. See `PLAN.md` §9 "Important Scope Decision": never write custom extractors, HLS/DASH, signature deciphering, or codec handling — shell out to `yt-dlp`/FFmpeg and manage the process, config, queue, and progress.

## Current state

MVP 0–9 are implemented: real yt-dlp analysis and downloads, progress events, cancellation, queue, history, settings, packaging. `PLAN.md` remains the spec; the code now largely matches it.

## Commands

```
npm run tauri dev     # run the desktop app (spawns vite on :1420, then Tauri)
npm run tauri build   # build distributable
npm run dev           # vite frontend only, no Tauri shell
npm run build         # tsc type-check + vite build (the "lint"/typecheck gate)
npm test              # vitest (frontend unit tests)
cd src-tauri && cargo test    # Rust unit tests
```
No ESLint. `npm run build` + both test suites are the correctness gate.

## Architecture — the one hard rule

**`.tsx` = UI only. All logic lives in `.ts`.** No `invoke()`, `useEffect`, data fetching, validation, or business logic in `.tsx`. Full ruleset, directory layout, hook/store/API patterns, and the Rust `src-tauri` module structure are in `ARCHITECTURE.md` — read it before adding frontend or Rust code.

- All Tauri `invoke()` calls go through the single `src/lib/api.ts` wrapper. Never `import { invoke }` anywhere else.
- Never show raw yt-dlp/OS output as a primary error message. Run it through `friendlyError()` in `src/lib/errors.ts`; the raw text goes in `errorDetails()` behind a "View details" disclosure.
- Global state: Zustand stores in `src/stores/`. Real-time download progress comes via Tauri **events** (subscribe in hooks), not polling.
- State ownership: pages/components consume hooks; hooks own state, effects, and error normalization.

## Security (Rust side)

Never build yt-dlp commands via shell interpolation (`sh -c "yt-dlp {url}"`). Use `Command::new(path).args(structured_args)`. URLs are data. The frontend sends structured options only; Rust constructs the actual arguments. Resolve bundled binary paths dynamically per-platform — never hardcode. See `PLAN.md` §39, §28.

## Gotchas

- `vite.config.ts` pins port 1420 with `strictPort` — Tauri depends on this.
- `src-tauri/binaries/` holds only `.gitkeep`s; `scripts/fetch-binaries.{ps1,sh}` pull yt-dlp/ffmpeg/deno at build time. `binaries::resolve` falls back to PATH when nothing is bundled, so dev works without running the script.
- Adding a Tauri plugin means three edits: `src-tauri/Cargo.toml`, the `.plugin()` line in `lib.rs`, and a permission in `src-tauri/capabilities/default.json`. Forgetting the capability fails at runtime, not build time.

## Design docs

- `DESIGN.md` — brand, colors, typography, component visual specs
- `DESIGN_PATTERN.md` — page/section layout, spacing, motion, responsive/a11y patterns
- `PLAN.md` — full product spec (navigation, download flow, queue, settings, history, binary bundling)
