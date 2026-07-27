# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Fluss is

A cross-platform desktop app (Tauri 2 + React 19 + TypeScript) that is a **UI/UX layer around `yt-dlp`** (with bundled FFmpeg). It does not reimplement media extraction. See `PLAN.md` §9 "Important Scope Decision": never write custom extractors, HLS/DASH, signature deciphering, or codec handling — shell out to `yt-dlp`/FFmpeg and manage the process, config, queue, and progress.

## Current state

The repo is still the stock Tauri scaffold (`src/App.tsx` is the greet demo, `src-tauri/src/lib.rs` has only `greet`). The four docs describe the **target** architecture, not what exists yet. When building, follow the docs; don't assume the described directories/files exist.

## Commands

```
npm run tauri dev     # run the desktop app (spawns vite on :1420, then Tauri)
npm run tauri build   # build distributable
npm run dev           # vite frontend only, no Tauri shell
npm run build         # tsc type-check + vite build (this is the "lint"/typecheck gate)
```
No test runner or ESLint is wired up yet. `npm run build` (tsc, strict mode) is the only current correctness check.

## Architecture — the one hard rule

**`.tsx` = UI only. All logic lives in `.ts`.** No `invoke()`, `useEffect`, data fetching, validation, or business logic in `.tsx`. Full ruleset, directory layout, hook/store/API patterns, and the Rust `src-tauri` module structure are in `ARCHITECTURE.md` — read it before adding frontend or Rust code.

- All Tauri `invoke()` calls go through the single `src/lib/api.ts` wrapper. Never `import { invoke }` anywhere else.
- Global state: Zustand stores in `src/stores/`. Real-time download progress comes via Tauri **events** (subscribe in hooks), not polling.
- State ownership: pages/components consume hooks; hooks own state, effects, and error normalization.

## Security (Rust side)

Never build yt-dlp commands via shell interpolation (`sh -c "yt-dlp {url}"`). Use `Command::new(path).args(structured_args)`. URLs are data. The frontend sends structured options only; Rust constructs the actual arguments. Resolve bundled binary paths dynamically per-platform — never hardcode. See `PLAN.md` §39, §28.

## Gotchas

- The `@/` → `src/` path alias is used throughout the docs but is **not yet configured** in `tsconfig.json` or `vite.config.ts`. Add it to both before relying on it.
- Tailwind, shadcn/ui, Zustand, React Hook Form + Zod are in the planned stack but **not yet installed** (see `package.json`). Add them when first needed.
- `vite.config.ts` pins port 1420 with `strictPort` — Tauri depends on this.

## Design docs

- `DESIGN.md` — brand, colors, typography, component visual specs
- `DESIGN_PATTERN.md` — page/section layout, spacing, motion, responsive/a11y patterns
- `PLAN.md` — full product spec (navigation, download flow, queue, settings, history, binary bundling)
