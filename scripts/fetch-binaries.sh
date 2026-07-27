#!/usr/bin/env bash
# Downloads the standalone yt-dlp / ffmpeg / deno for one platform into
# src-tauri/binaries/<platform>/ so `tauri build` bundles a self-contained app.
#
# Usage (macOS / Linux / Git Bash): bash scripts/fetch-binaries.sh {windows|macos|linux}
# Usage (Windows PowerShell):       pwsh -File scripts/fetch-binaries.ps1 -Platform <windows|macos|linux>
#
# ffmpeg comes from ffmpeg-static (native per-arch static builds), so modern
# macOS (Apple Silicon) gets a real arm64 binary — no Rosetta required.
set -euo pipefail

PLATFORM="${1:?usage: fetch-binaries.sh <windows|macos|linux>}"
DEST="src-tauri/binaries/$PLATFORM"
TMP=".engines-tmp"
rm -rf "$TMP"
mkdir -p "$DEST" "$TMP"

echo "Fetching engines for $PLATFORM into $DEST"

FFMPEG_BASE="https://github.com/eugeneware/ffmpeg-static/releases/latest/download"

# Download a gzip'd binary and decompress it to a destination path.
gz_to() { # <url> <outfile>
  curl -fL "$1" -o "$TMP/dl.gz"
  gzip -dc "$TMP/dl.gz" > "$2"
}

# Extract a .zip. Git Bash's tar is GNU tar (no zip), so Windows uses PowerShell
# Expand-Archive; unzip is reliable on macOS/Linux runners.
unzip_to() { # <zipfile> <destdir>
  if [ "$PLATFORM" = "windows" ]; then
    powershell -NoProfile -Command "Expand-Archive -Force -LiteralPath '$1' -DestinationPath '$2'"
  else
    unzip -o "$1" -d "$2"
  fi
}

case "$PLATFORM" in
  windows)
    curl -fL "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -o "$DEST/yt-dlp.exe"
    gz_to "$FFMPEG_BASE/ffmpeg-win32-x64.gz" "$DEST/ffmpeg.exe"
    curl -fL "https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip" -o "$TMP/deno.zip"
    unzip_to "$TMP/deno.zip" "$DEST"
    ;;
  macos)
    # arm64 across the board (modern Macs): yt-dlp_macos is universal, ffmpeg and
    # deno are native arm64 — nothing needs Rosetta.
    curl -fL "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos" -o "$DEST/yt-dlp"
    gz_to "$FFMPEG_BASE/ffmpeg-darwin-arm64.gz" "$DEST/ffmpeg"
    curl -fL "https://github.com/denoland/deno/releases/latest/download/deno-aarch64-apple-darwin.zip" -o "$TMP/deno.zip"
    unzip_to "$TMP/deno.zip" "$DEST"
    chmod +x "$DEST/yt-dlp" "$DEST/ffmpeg" "$DEST/deno"
    ;;
  linux)
    curl -fL "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp" -o "$DEST/yt-dlp"
    gz_to "$FFMPEG_BASE/ffmpeg-linux-x64.gz" "$DEST/ffmpeg"
    curl -fL "https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip" -o "$TMP/deno.zip"
    unzip_to "$TMP/deno.zip" "$DEST"
    chmod +x "$DEST/yt-dlp" "$DEST/ffmpeg" "$DEST/deno"
    ;;
  *)
    echo "unknown platform: $PLATFORM" >&2
    exit 1
    ;;
esac

rm -rf "$TMP"
echo "Done:"
ls -la "$DEST"
