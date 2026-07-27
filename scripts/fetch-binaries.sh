#!/usr/bin/env bash
# Downloads the standalone yt-dlp / ffmpeg / deno for one platform into
# src-tauri/binaries/<platform>/ so `tauri build` bundles a self-contained app.
# Called by the release workflow: scripts/fetch-binaries.sh {windows|macos|linux}
set -euo pipefail

PLATFORM="${1:?usage: fetch-binaries.sh <windows|macos|linux>}"
DEST="src-tauri/binaries/$PLATFORM"
# Relative temp dir (in the repo) so Windows tools resolve paths without any
# POSIX<->Windows translation.
TMP=".engines-tmp"
rm -rf "$TMP"
mkdir -p "$DEST" "$TMP"

echo "Fetching engines for $PLATFORM into $DEST"

# Extract a .zip. Git Bash's tar is GNU tar (no zip support), so on Windows use
# PowerShell's Expand-Archive; unzip is reliable on macOS/Linux runners.
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
    curl -fL "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" -o "$TMP/ffmpeg.zip"
    unzip_to "$TMP/ffmpeg.zip" "$TMP/ffmpeg"
    cp "$TMP"/ffmpeg/ffmpeg-*-essentials_build/bin/ffmpeg.exe "$DEST/ffmpeg.exe"
    curl -fL "https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip" -o "$TMP/deno.zip"
    unzip_to "$TMP/deno.zip" "$DEST"
    ;;
  macos)
    # macos-latest runners are arm64. yt-dlp_macos is a universal binary.
    curl -fL "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos" -o "$DEST/yt-dlp"
    # NOTE: evermeet ships an x86_64 ffmpeg (runs on arm via Rosetta). Swap for
    # a native arm64 static build if you want to drop the Rosetta dependency.
    curl -fL "https://evermeet.cx/ffmpeg/getrelease/zip" -o "$TMP/ffmpeg.zip"
    unzip_to "$TMP/ffmpeg.zip" "$DEST"
    curl -fL "https://github.com/denoland/deno/releases/latest/download/deno-aarch64-apple-darwin.zip" -o "$TMP/deno.zip"
    unzip_to "$TMP/deno.zip" "$DEST"
    chmod +x "$DEST/yt-dlp" "$DEST/ffmpeg" "$DEST/deno"
    ;;
  linux)
    curl -fL "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp" -o "$DEST/yt-dlp"
    curl -fL "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz" -o "$TMP/ffmpeg.tar.xz"
    tar -xf "$TMP/ffmpeg.tar.xz" -C "$TMP"
    cp "$TMP"/ffmpeg-*-amd64-static/ffmpeg "$DEST/ffmpeg"
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
