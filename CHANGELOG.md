# Changelog

The release workflow pulls the notes for a tag from the matching `## vX.Y.Z`
section below. Keep the newest version at the top.

## v0.7.0

**Fixes**
- **Cancelled downloads left a stray image behind.** Embedding cover art (new in
  v0.6.0) writes the thumbnail as a file first, so cancelling a download — an MP3
  especially — left a leftover `.webp` or `.png` in your folder. Fluss now keeps
  every working file out of your download folder entirely, so only the finished
  file ever appears there.
- **Leftover `.part` files were never cleaned up after a successful retry.** If
  you cancelled a download and downloaded it again, the abandoned partial stayed
  in your folder for good. Finishing a download now clears its own leftovers.
  Other downloads' files are left alone, including ones still in progress.
- "Keep partial files" now keeps only genuinely unfinished downloads, not
  scaffolding from a download that completed.

**Features**
- New **Update engine** button in Settings → Engine. Sites change how they serve
  media and a newer engine is usually the fix, so this is the first thing to try
  if downloads stop working — no reinstall needed. It reports honestly when the
  engine was installed by a package manager and can't update itself.

## v0.6.0

**Fixes**
- **YouTube downloads failing with "Sign in to confirm you're not a bot" or
  missing quality options.** Fluss was not fetching the challenge-solver script
  yt-dlp needs to decipher YouTube's signatures. Without it, most formats were
  silently dropped and many videos wouldn't download at all. Fluss now requests
  it automatically — nothing to configure.
- Errors caused by a site rate-limiting Fluss now say so, and say to wait,
  instead of claiming the video was private or removed.

**Features**
- Downloaded files now carry their title, uploader, date and cover art, so they
  look right in your player and file manager. Chapters are included for videos
  that have them.
- New **Use my browser sign-in** setting (Settings → Engine) for the rare video
  still blocked as a bot. It borrows the session from the browser you're already
  signed in with. Off by default; Fluss picks the browser that works on your
  system, so there is nothing to choose.

## v0.5.0

**Fixes**
- **A failed download could delete your media.** When "Keep partial files" was
  off, a failed download swept the output directory and removed every video and
  audio file modified in the last 24 hours — and the default output directory is
  your Videos folder. Cleanup is now limited to yt-dlp's own `.part`,
  `.part-FragN`, and `.ytdl` intermediates. **Please update.**
- **Download history could be wiped.** If a download finished before the History
  page had ever been opened, Fluss saved its empty in-memory list over the real
  file. History is now read at startup, is never saved before it has been read,
  and keeps anything recorded while that read is in flight.
- Settings and history are written atomically, so a crash or power loss during a
  save can no longer leave a half-written file behind.
- A file that exists but can't be read is no longer silently replaced — Fluss
  reports it and offers "Start fresh" rather than overwriting what's there.
- Failed saves are reported instead of failing silently. Previously a change
  could look applied and then be gone on restart.
- Analysis now gives up after 90 seconds instead of leaving the app on
  "Analyzing…" forever with no way out but restarting.
- Reloading with downloads in progress used the browser's own prompt, which
  looked out of place. It now uses Fluss's dialog and stops the downloader
  cleanly instead of leaving it running unattached.
- A second right-click on a download or history entry showed the generic menu
  instead of that item's own.
- Very slow transfer speeds displayed "undefined".

**Features**
- **Ctrl/Cmd + N** starts a new download from anywhere — clears the URL field,
  the previous preview, and the bulk list, and puts the cursor back in the box.

**Internal**
- The release build now runs the full test suite before producing installers.

**Install**
- Windows: run the `.exe` (or `.msi`) installer (SmartScreen: More info → Run anyway)
- macOS (Apple Silicon): open the `.dmg`, drag Fluss to Applications. This build
  is unsigned, so first launch: right-click the app → **Open** (or run
  `xattr -cr /Applications/Fluss.app` to clear quarantine).
- Linux: `.AppImage` (chmod +x, run) or `.deb`.

## v0.4.0

**Features**
- Bulk download mode — paste multiple URLs at once and download them all in
  sequence. A segmented control on Home lets you switch between single-URL
  preview and a scrollable multi-URL list, both sharing the same format,
  quality, and folder settings.
- Live metadata resolution during download — yt-dlp now reports the title and
  thumbnail as soon as it resolves them, so bulk-queued items (which skip the
  upfront analyze step) show a real name and thumbnail instead of a raw URL and
  an empty frame.
- Reusable Thumbnail component with a 16:9 aspect-ratio frame and a fallback
  icon, used by download cards and bulk items alike.

**Fixes**
- Deduplicate URLs in bulk mode — a stray double-paste no longer downloads the
  same video twice.
- Disabled "Download" button when no valid URLs are entered, preventing
  submission of an empty list.

**Install**
- Windows: run the `.exe` (or `.msi`) installer (SmartScreen: More info → Run anyway)
- macOS (Apple Silicon): open the `.dmg`, drag Fluss to Applications. This build
  is unsigned, so first launch: right-click the app → **Open** (or run
  `xattr -cr /Applications/Fluss.app` to clear quarantine).
- Linux: `.AppImage` (make it executable: `chmod +x Fluss*.AppImage`) or `.deb`

## v0.3.2

**Fixes**
- "Open file" and "Show in folder" work for downloads whose title contains an
  emoji. yt-dlp was reporting the finished file's path with the emoji stripped
  out, so Fluss remembered a name that didn't exist on disk and both actions
  came back with "This file was moved or deleted." Re-download anything already
  in your history to repair its stored path.

**Install**
- Windows: run the `.exe` (or `.msi`) installer (SmartScreen: More info → Run anyway)
- macOS (Apple Silicon): open the `.dmg`, drag Fluss to Applications. This build
  is unsigned, so first launch: right-click the app → **Open** (or run
  `xattr -cr /Applications/Fluss.app` to clear quarantine).
- Linux: `.AppImage` (make it executable: `chmod +x Fluss*.AppImage`) or `.deb`

## v0.3.1

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
