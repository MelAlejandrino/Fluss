# Fluss

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./public/FLUSS_LOGO.png">
    <source media="(prefers-color-scheme: light)" srcset="./public/FLUSS_LOGO.png">
    <img alt="Fluss" src="./public/FLUSS_LOGO.png" width="96" height="96">
  </picture>
</p>

<p align="center">
  <strong>A minimal desktop media downloader</strong><br>
  Paste a link. Preview what's there. Download it — as video or audio.
</p>

<p align="center">
  <a href="https://github.com/MelAlejandrino/Fluss/releases/latest"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/MelAlejandrino/Fluss?style=flat&label=version&color=455548&labelColor=f0ede9"></a>
  <a href="https://github.com/MelAlejandrino/Fluss"><img alt="GitHub last commit" src="https://img.shields.io/github/last-commit/MelAlejandrino/Fluss?style=flat&color=455548&labelColor=f0ede9"></a>
  <img alt="License" src="https://img.shields.io/badge/license-MIT-455548?style=flat&labelColor=f0ede9">
  <img alt="Platform" src="https://img.shields.io/badge/platform-Windows%20|%20macOS%20|%20Linux-455548?style=flat&labelColor=f0ede9">
</p>

---

## Overview

Fluss is a desktop application that turns media URLs into downloaded files — no ads, no sign‑ups, no distractions. Paste a link, see a preview of the media, pick your quality, and download. It handles video (MP4) and audio (MP3), runs downloads one at a time with a queue, and keeps a persistent history of everything you've grabbed.
Built with [Tauri 2](https://tauri.app/) and [React 19](https://react.dev/), Fluss bundles its own copies of [yt-dlp](https://github.com/yt-dlp/yt-dlp) and [FFmpeg](https://ffmpeg.org/) — nothing extra to install.

<p align="center">
  <img src="./public/Fluss App Screenshots/Fluss Home Page With Link Single.png" alt="Fluss Home Page — single link analysis" width="350">
  <img src="./public/Fluss App Screenshots/Fluss Home Page With Link Bulk.png" alt="Fluss Home Page — bulk link analysis" width="350">
  <br>
  <em>The home page — paste a single link to preview before downloading, or bulk-import multiple URLs to analyze and download together.</em>
</p>

---

## Screenshots

| Downloading | History |
|---|---|
| <img src="./public/Fluss App Screenshots/Fluss Download Page with a downloading video.png" alt="Downloads page with active download" width="350"> | <img src="./public/Fluss App Screenshots/Fluss History Page.png" alt="History page showing past downloads" width="350"> |
| Live progress with speed, size, and ETA. | Everything you've downloaded, ready to open or download again. |

---

## Features

- **URL analysis** — paste a link and instantly see the title, thumbnail, and duration
- **Download as MP4 or MP3** — choose quality up to the source maximum
- **Live progress** — track speed, file size, and ETA; cancel at any time
- **Download queue** — one download at a time, auto‑advances to the next
- **Persistent history** — browse, open, reveal in folder, re‑download, or remove
- **Desktop notifications** — real OS notifications on completion or failure
- **Custom title bar** -- native-feeling window controls (minimize, maximize, close, drag-to-move)
- **Settings** -- default download folder, theme (light / dark / system), auto-start, notifications
- **Self-updating** -- checks for updates on launch; installs and restarts automatically
- **Error messages for humans** -- plain-language explanations with details tucked behind a reveal
- **Custom context menu** -- paste-and-analyze, open / show in folder / retry, and more
- **Bundled engines** -- yt-dlp + FFmpeg ship with the app; zero setup

---

## Install

| Platform | File | Notes |
|----------|------|-------|
| **Windows** | `.exe` or `.msi` | SmartScreen may prompt -- click **More info -> Run anyway** |
| **macOS** (Apple Silicon) | `.dmg` | Unsigned build -- right-click -> **Open** on first launch (or run `xattr -cr /Applications/Fluss.app`) |
| **Linux** | `.AppImage` or `.deb` | Make AppImage executable: `chmod +x Fluss*.AppImage` |

> **Update from v0.2.0:** Versions before v0.3.1 shipped without an updater. If you're on 0.2.0 or older, download the latest installer manually from the [releases page](https://github.com/MelAlejandrino/Fluss/releases). Every version after 0.3.1 updates itself.

---

## Build from source

```bash
# Prerequisites: Node.js >= 22, Rust toolchain, Tauri system dependencies
npm install
npm run tauri dev     # Development
npm run tauri build   # Distribution build
```

See the [ARCHITECTURE.md](./ARCHITECTURE.md) and [DESIGN.md](./DESIGN.md) for code conventions, directory structure, and the design system.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | [Tauri 2](https://tauri.app/) (Rust) |
| Frontend | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Build | [Vite 7](https://vitejs.dev/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| State | [Zustand](https://github.com/pmndrs/zustand) |
| Icons | [Lucide React](https://lucide.dev/) |
| Download engine | [yt-dlp](https://github.com/yt-dlp/yt-dlp) + [FFmpeg](https://ffmpeg.org/) (bundled) |

---

## Design

Fluss is designed as a **glanceable background utility** -- it sits beside a browser, often in the tray, and gets checked rather than read. Neutral layered surfaces in OKLCH, depth from layering rather than shadows, and a single accent green reserved entirely for state, so anything green on screen means something is flowing or finished. One typeface (Geist) carries the interface; Geist Mono is used only for data that must not reflow -- URLs, paths, byte counts, speeds. Every screen is composed from the primitives in `src/components/ui/`. See [DESIGN.md](./DESIGN.md) for the full system and [DESIGN_PATTERN.md](./DESIGN_PATTERN.md) for layout patterns.

---

## Architecture

The codebase enforces a clean separation: **`.tsx` files contain UI only; all logic lives in `.ts` files.** Components never call Tauri APIs, mutate state, or handle side effects -- hooks and stores do that. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full guide.

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release notes.

---

<p align="center">
  <sub>Built by <a href="https://github.com/MelAlejandrino">MelAlejandrino</a>. Licensed under MIT.</sub>
</p>

