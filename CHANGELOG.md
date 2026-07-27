# Changelog

The release workflow pulls the notes for a tag from the matching `## vX.Y.Z`
section below. Keep the newest version at the top.

## v0.1.0

First release of Fluss — a minimal desktop media downloader powered by yt-dlp
and FFmpeg.

**Features**
- Paste a URL, analyze, and preview title / thumbnail / duration
- Download as MP4 (with quality up to the source max) or MP3
- Live progress with speed, size, and ETA; cancel in progress
- Download queue (one at a time, auto-advances)
- Persistent history with open / show in folder / download again / remove
- Settings: default folder, theme (light/dark/system), auto-start, notifications
- yt-dlp, FFmpeg, and Deno bundled — nothing to install

**Install**
- Windows: run the `.exe` (or `.msi`) installer
- macOS: open the `.dmg` and drag Fluss to Applications
- Linux: use the `.AppImage` or `.deb`
