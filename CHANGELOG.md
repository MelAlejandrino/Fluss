# Changelog

The release workflow pulls the notes for a tag from the matching `## vX.Y.Z`
section below. Keep the newest version at the top.

## v0.3.0

Fluss can now update itself, and a few rough edges found by finally testing the
pages are gone.

**Features**
- Fluss installs its own updates. "Check for updates" (and the check on launch)
  now downloads a signed build and restarts into it, instead of sending you to
  the releases page to fetch an installer by hand. Updating from **0.2.0 to this
  version is still manual** — 0.2.0 shipped without an updater to do it with;
  every version after this one updates itself.

**Fixes**
- Pressing Enter twice in the URL field no longer starts two analyses of the
  same link. The button greyed itself out, but the field didn't, so a key repeat
  launched a second one.
- The History page shows placeholder rows while it reads from disk instead of
  flashing "No history yet" at you first.
- The About section and the update check report the real version. Previously
  anything not installed from a release installer claimed to be 0.1.0 and
  offered an update it already had.

**Install**
- Windows: run the `.exe` (or `.msi`) installer (SmartScreen: More info → Run anyway)
- macOS (Apple Silicon): open the `.dmg`, drag Fluss to Applications. This build
  is unsigned, so first launch: right-click the app → **Open** (or run
  `xattr -cr /Applications/Fluss.app` to clear quarantine).
- Linux: `.AppImage` (make it executable: `chmod +x Fluss*.AppImage`) or `.deb`

## v0.2.0

Better behaviour when things go wrong, a real right-click menu, and a handful
of rough edges smoothed out.

**Features**
- Custom right-click menu throughout the app, replacing the browser one. It
  adapts to what you click: paste-and-analyze on the URL field, open / show in
  folder / copy path / retry on downloads and history entries, and navigation
  anywhere else.
- Failed downloads now explain themselves — a plain-language reason, the raw
  engine output tucked behind "View details", and a Retry button. Previously a
  failure showed only a red "Failed" chip.
- Error messages are written for people, not parsed from yt-dlp. Unavailable or
  private media, age restrictions, unsupported links, network trouble, timeouts,
  a full disk, missing write permission, and unavailable qualities each get
  their own message.
- Desktop notifications are real OS notifications now, and failures notify too
  (previously only successes did, and only as an in-app toast).
- Fluss asks before quitting while a download is running, and cleans up partial
  files left behind by a failed or cancelled download.
- Downloads default to your Videos folder.
- Diagnostic logging to a file, so a misbehaving download can be reported.
  URLs are deliberately excluded — they can carry access tokens.

**Fixes**
- The download folder is checked before a download starts, so a folder that was
  moved or deleted fails immediately with a clear message instead of an opaque
  engine error minutes later.
- Focusing the URL field no longer nudges the heading and Analyze button.
- The sidebar collapses to icons on narrow windows instead of crowding the page.
- Escape closes the quit confirmation, which is also now dismissable by clicking
  outside it and readable by screen readers.

**Install**
- Windows: run the `.exe` (or `.msi`) installer (SmartScreen: More info → Run anyway)
- macOS (Apple Silicon): open the `.dmg`, drag Fluss to Applications. This build
  is unsigned, so first launch: right-click the app → **Open** (or run
  `xattr -cr /Applications/Fluss.app` to clear quarantine).
- Linux: `.AppImage` (make it executable: `chmod +x Fluss*.AppImage`) or `.deb`

## v0.1.0

First release of Fluss — a minimal desktop media downloader powered by yt-dlp
and FFmpeg.

**Features**
- Paste a URL, analyze, and preview title / thumbnail / duration
- Download as MP4 (with quality up to the source max) or MP3
- Live progress with speed, size, and ETA; cancel in progress
- Download queue (one at a time, auto-advances)
- Persistent history with open / show in folder / download again / remove
- Custom window title bar (minimize / maximize / close, drag-to-move)
- Settings: default folder, theme (light/dark/system), auto-start, notifications
- Update check on launch + manual "Check for updates", with an About section
  (version, developer, repository link)
- yt-dlp, FFmpeg, and Deno bundled — nothing to install

**Install**
- Windows: run the `.exe` (or `.msi`) installer (SmartScreen: More info → Run anyway)
- macOS (Apple Silicon): open the `.dmg`, drag Fluss to Applications. This build
  is unsigned, so first launch: right-click the app → **Open** (or run
  `xattr -cr /Applications/Fluss.app` to clear quarantine).
- Linux: `.AppImage` (make it executable: `chmod +x Fluss*.AppImage`) or `.deb`
