# Bundled engine binaries

These ship inside the Fluss installer so end users never install anything.
`bundle.resources` in `tauri.conf.json` copies this folder into the app; the
resolver (`src/binaries.rs`) looks up `binaries/<platform>/<name>` at runtime,
falling back to PATH during development.

## What to place where

```
binaries/
├── windows/   yt-dlp.exe   ffmpeg.exe   deno.exe
├── macos/     yt-dlp       ffmpeg       deno
└── linux/     yt-dlp       ffmpeg       deno
```

### Why deno

Current yt-dlp needs a JavaScript runtime to fully extract YouTube's format
list (including 1440p/2160p). Without one it warns and may drop high-res
formats. Bundling **deno** makes high-res extraction reliable on machines that
don't have it. At MVP 9 the resolver will pass `--js-runtimes deno:<path>` to
both the analyze and download commands when the bundled deno is present.

- **deno**: https://github.com/denoland/deno/releases/latest (single self-contained binary)

You only need the folder for the platform you're building an installer on
(you build the Windows installer on Windows, etc.), so each build naturally
bundles just its own binaries.

## IMPORTANT: use the STANDALONE binaries, not the pip one

The `yt-dlp.exe` that `pip install yt-dlp` creates is a tiny launcher that
depends on your local Python — it will NOT run on a user's machine. Download
the self-contained builds instead:

- **yt-dlp**: https://github.com/yt-dlp/yt-dlp/releases/latest
  - Windows: `yt-dlp.exe`  ·  macOS: `yt-dlp_macos` (rename to `yt-dlp`)  ·  Linux: `yt-dlp`
- **ffmpeg** (static build):
  - Windows: https://www.gyan.dev/ffmpeg/builds/ (grab `ffmpeg.exe` from the bin folder)
  - macOS/Linux: static builds from https://ffmpeg.org/download.html

On macOS/Linux, make them executable: `chmod +x yt-dlp ffmpeg`.

## Then

`npm run tauri build` — the installer now carries the engine. Nothing for the
user to install.
