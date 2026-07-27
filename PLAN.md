# Fluss — Desktop Media Downloader

> **Medien im Fluss.**
>
> A modern, minimal desktop media downloader powered by `yt-dlp` and `FFmpeg`.

---

# 1. Project Overview

**Fluss** is a modern, polished, cross-platform desktop application that provides a simple graphical interface for downloading online media.

The application is primarily a **UI/UX layer around `yt-dlp`**.

Fluss does **not** attempt to reimplement the complex media extraction and downloading functionality provided by `yt-dlp`.

Instead, Fluss provides:

* A modern desktop UI
* URL input and analysis
* Media metadata preview
* Format selection
* Quality selection
* Download location selection
* Download queue management
* Real-time download progress
* Download cancellation
* Download history
* Settings
* Bundled `yt-dlp`
* Bundled `FFmpeg`

The core philosophy is:

> **Paste → Choose → Download**

The user should never need to open a terminal or understand how `yt-dlp` works.

---

# 2. Product Vision

Fluss should feel like a premium, modern desktop utility rather than a technical downloader.

The application should be:

* Minimal
* Fast
* Beautiful
* Easy to understand
* Responsive
* Reliable
* Cross-platform

The user should be able to open Fluss and immediately understand what to do.

The primary workflow should be:

```text
Paste URL
    ↓
Analyze
    ↓
Preview media
    ↓
Choose format
    ↓
Choose quality
    ↓
Choose location
    ↓
Download
    ↓
Track progress
    ↓
Open file
```

The UI should hide technical complexity.

The user should not need to understand:

* yt-dlp format IDs
* FFmpeg commands
* Codec selection
* DASH
* HLS
* Adaptive streaming
* Extraction methods

These details belong entirely to the backend.

---

# 3. Project Name

## Name

**Fluss**

German for:

> Flow

The name represents:

* Media flowing into the user's library
* A smooth download process
* Download queues
* Data streams
* A simple workflow

## Brand Direction

The visual identity should communicate:

* Flow
* Movement
* Simplicity
* Precision
* Calmness
* Modern German software design

Avoid making the application visually stereotypically German.

Do not overuse:

* German flags
* Black/red/yellow
* Gothic typography
* Heavy industrial visuals

The German inspiration should primarily come through the name and the minimalist product aesthetic.

---

# 4. Core Technology Stack

## Desktop

Use:

* Tauri 2.x

Reasons:

* Lightweight
* Cross-platform
* Rust backend
* Web-based frontend
* Small application footprint
* Native desktop integration

Target platforms:

* Windows
* macOS
* Linux

Windows should be the initial development and testing platform.

The architecture should remain cross-platform from the beginning.

---

# 5. Frontend Stack

Use:

* React
* TypeScript
* Vite

Styling:

* Tailwind CSS

UI components:

* shadcn/ui
* Radix UI

Icons:

* Lucide React

Optional:

* Zustand
* React Hook Form
* Zod
* Motion

Do not add libraries unless they provide clear value.

Keep the frontend simple and maintainable.

---

# 6. Backend Stack

Use:

* Rust
* Tauri commands
* Tauri events

Rust is responsible for:

* Launching `yt-dlp`
* Launching and managing processes
* Capturing stdout
* Capturing stderr
* Parsing progress
* Parsing metadata
* Managing download tasks
* Cancelling downloads
* Resolving bundled binaries
* Filesystem operations
* Application-level settings
* Emitting events to React

The Rust layer should act as the bridge between the UI and external media tools.

---

# 7. External Tools

Fluss uses:

## yt-dlp

Responsible for:

* URL extraction
* Media metadata
* Available formats
* Video downloading
* Audio downloading
* Playlist support in future versions
* Site support

## FFmpeg

Responsible for:

* Merging video and audio streams
* Media conversion
* Audio extraction
* Post-processing

Do not reimplement these systems.

Fluss is a GUI and orchestration layer.

---

# 8. Core Architecture

```text
┌────────────────────────────────────────────┐
│                  Fluss UI                  │
│                                            │
│  React + TypeScript                        │
│                                            │
│  Home                                      │
│  Downloads                                 │
│  History                                   │
│  Settings                                  │
│                                            │
└──────────────────────┬─────────────────────┘
                       │
                       │ Tauri Commands
                       │ Tauri Events
                       ▼
┌────────────────────────────────────────────┐
│                Fluss Core                  │
│                                            │
│  Rust + Tauri                              │
│                                            │
│  Downloader Service                        │
│  Process Manager                           │
│  Progress Parser                           │
│  Binary Resolver                           │
│  File Manager                              │
│  Settings Manager                          │
│                                            │
└──────────────────────┬─────────────────────┘
                       │
                       │ Child Process
                       ▼
┌────────────────────────────────────────────┐
│                   yt-dlp                   │
│                                            │
│  Metadata                                  │
│  Extraction                                │
│  Download                                  │
└──────────────────────┬─────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────┐
│                  FFmpeg                    │
│                                            │
│  Merge                                     │
│  Convert                                   │
│  Extract                                   │
└────────────────────────────────────────────┘
```

---

# 9. Important Scope Decision

The most important project decision is:

> **Fluss is a UI around yt-dlp, not a replacement for yt-dlp.**

Do NOT implement:

* Custom YouTube extraction
* Signature deciphering
* Custom site extractors
* Custom HLS implementation
* Custom DASH implementation
* Custom media stream downloading
* Custom codec handling

Do NOT attempt to reproduce yt-dlp's functionality.

Instead:

```text
Fluss
  │
  ├── UI
  ├── UX
  ├── Process Management
  ├── Configuration
  └── Download Management
          │
          ▼
       yt-dlp
          │
          ▼
       FFmpeg
```

---

# 10. Application Navigation

MVP navigation:

```text
Home
Downloads
History
Settings
```

Recommended sidebar:

```text
┌────────────────────┐
│  ≋  Fluss          │
│                    │
│  + New Download    │
│                    │
│  Home              │
│  Downloads         │
│  History           │
│                    │
│                    │
│  Settings          │
└────────────────────┘
```

The exact iconography should be decided during UI implementation.

The navigation should remain minimal.

---

# 11. Home Page

The Home page is the main entry point.

The primary action should be immediately visible.

Initial state:

```text
┌──────────────────────────────────────────────┐
│  Fluss                           ⚙ Settings  │
│                                              │
│                                              │
│             Download in flow.                │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Paste a video URL...                   │  │
│  └────────────────────────────────────────┘  │
│                                              │
│                 [ Analyze ]                  │
│                                              │
└──────────────────────────────────────────────┘
```

Keep the initial screen clean.

Do not show advanced options until a URL has been analyzed.

---

# 12. URL Input

The URL input should:

* Accept pasted URLs
* Trim whitespace
* Validate non-empty input
* Support Enter to analyze
* Support Ctrl+V / Cmd+V
* Show loading state
* Prevent duplicate analysis requests

Example:

```text
https://www.youtube.com/watch?v=...
```

The application should avoid hardcoding YouTube-only validation if yt-dlp supports additional sites.

The product can be branded as:

> Fluss — Media Downloader

rather than:

> Fluss — YouTube Downloader

This keeps the architecture extensible.

MVP may initially focus on YouTube.

---

# 13. Media Analysis

When the user selects **Analyze**, the Rust backend should execute yt-dlp in metadata-only mode.

Conceptually:

```bash
yt-dlp --dump-single-json --no-download "<URL>"
```

No media should be downloaded during analysis.

The backend should return normalized metadata.

Potential metadata:

```text
title
description
thumbnail
duration
uploader
channel
channel_url
webpage_url
upload_date
view_count
formats
```

The frontend should not directly depend on raw yt-dlp JSON.

Normalize the response.

Example:

```ts
interface VideoMetadata {
  id: string;
  title: string;
  thumbnailUrl?: string;
  duration?: number;
  uploader?: string;
  webpageUrl: string;
  formats: VideoFormat[];
}
```

---

# 14. Media Preview

After analysis, display:

```text
┌─────────────────────────────────────────────┐
│                                             │
│  ┌─────────────┐                            │
│  │             │  Video Title               │
│  │  Thumbnail  │  Channel Name              │
│  │             │  12:32                     │
│  └─────────────┘                            │
│                                             │
└─────────────────────────────────────────────┘
```

Show:

* Thumbnail
* Title
* Duration
* Uploader/channel

Do not overwhelm the user with metadata.

Additional metadata can be placed behind a details action in the future.

---

# 15. Format Selection

MVP formats:

```text
MP4
MP3
```

Future:

```text
MKV
WebM
M4A
```

The user should see human-friendly options.

Never expose raw format IDs in the main UI.

Do not show:

```text
137+140
248+251
bestvideo+bestaudio
```

Instead:

```text
MP4
MP3
```

The Rust backend converts these selections into yt-dlp arguments.

---

# 16. Quality Selection

MVP:

```text
Best available
1080p
720p
480p
360p
```

If a selected quality is unavailable, handle it gracefully.

Possible behavior:

```text
1080p unavailable

Choose another quality.
```

Or automatically fall back to the closest available quality.

The exact behavior should be decided during implementation.

Do not make the user manually select format IDs.

---

# 17. Download Location

Use a native folder picker.

Default:

```text
User Downloads directory
```

Example UI:

```text
Save to

[ ~/Downloads                 📁 ]
```

The user should be able to select another directory.

Persist the selected location.

Do not store downloaded media inside the application data directory.

---

# 18. Download Flow

The complete flow:

```text
Paste URL
      ↓
Analyze
      ↓
yt-dlp metadata
      ↓
Display preview
      ↓
Select format
      ↓
Select quality
      ↓
Choose folder
      ↓
Start download
      ↓
Create download task
      ↓
Launch yt-dlp
      ↓
Parse progress
      ↓
Emit Tauri events
      ↓
Update React UI
      ↓
Download complete
      ↓
Show completed state
```

---

# 19. Download Queue

Implement a queue.

MVP behavior:

```text
1 active download
N queued downloads
```

Example:

```text
Downloading

Video A
██████████████░░░░ 72%


Queued

Video B
Video C
Video D
```

When Video A completes:

```text
Video A → Completed
Video B → Downloading
Video C → Queued
Video D → Queued
```

Do not implement concurrent downloads in MVP.

---

# 20. Download Model

Use a strongly typed model.

Example:

```ts
interface DownloadItem {
  id: string;

  url: string;

  title?: string;
  thumbnailUrl?: string;

  format: "mp4" | "mp3";
  quality?: string;

  outputDirectory: string;

  status:
    | "queued"
    | "analyzing"
    | "downloading"
    | "processing"
    | "completed"
    | "failed"
    | "cancelled";

  progress: number;

  downloadedBytes?: number;
  totalBytes?: number;

  speed?: number;
  eta?: number;

  filePath?: string;

  error?: string;

  createdAt: string;
  completedAt?: string;
}
```

---

# 21. Download Progress

Show:

* Percentage
* Progress bar
* Download speed
* Downloaded size
* Total size
* ETA

Example:

```text
Video Title
1080p MP4

████████████████░░░░ 78%

78%
4.2 MB/s
245 MB / 312 MB
~18 seconds remaining
```

The frontend should never parse raw yt-dlp terminal output.

The Rust backend is responsible for parsing progress.

---

# 22. Tauri Events

Use Tauri events for real-time progress.

Conceptually:

```text
Rust
  │
  │ emit("download-progress")
  ▼
React
  │
  ├── Update percentage
  ├── Update speed
  ├── Update ETA
  └── Update status
```

Event payload:

```ts
interface DownloadProgressEvent {
  downloadId: string;
  progress: number;
  speed?: number;
  downloadedBytes?: number;
  totalBytes?: number;
  eta?: number;
  status: string;
}
```

Avoid excessive event frequency.

Throttle updates if necessary.

Target approximately:

```text
5–10 UI updates per second
```

---

# 23. Process Management

Every active download should correspond to a managed child process.

Conceptually:

```text
DownloadTask
      │
      ▼
ChildProcess
      │
      ├── stdout
      ├── stderr
      └── exit status
```

The Rust process manager should:

* Spawn yt-dlp
* Track process
* Capture stdout
* Capture stderr
* Parse progress
* Detect completion
* Detect failure
* Support cancellation

Maintain an in-memory process registry:

```text
download_id → process_handle
```

Do not persist process handles.

MVP does not support resuming downloads after application restart.

---

# 24. Cancellation

Active downloads should have:

```text
[ Cancel ]
```

Cancellation flow:

```text
User clicks Cancel
        ↓
Rust terminates yt-dlp
        ↓
Wait for process exit
        ↓
Clean up where appropriate
        ↓
Mark cancelled
        ↓
Start next queue item
```

Do not automatically delete user files unless they are known to be partial download artifacts.

---

# 25. Download Completion

When yt-dlp exits successfully:

1. Verify exit code.
2. Determine output file.
3. Mark task completed.
4. Emit completion event.
5. Update UI.
6. Optionally show notification.

Example:

```text
┌──────────────────────────────────────┐
│  Thumbnail  Video Title              │
│             1080p MP4                │
│                                      │
│             [ Open File ]             │
│             [ Show in Folder ]        │
└──────────────────────────────────────┘
```

---

# 26. Error Handling

Do not expose raw command-line output as the primary error message.

Bad:

```text
ERROR: [youtube] Unable to extract...
```

Better:

```text
Unable to download this video.

The video may be unavailable, private,
restricted, or unsupported.
```

Actions:

```text
[ Retry ]
[ View Details ]
```

The raw technical error can be displayed in an expandable section.

---

# 27. Error States

Handle:

* Empty URL
* Invalid URL
* Unsupported URL
* Video unavailable
* Private video
* Age restriction
* Network failure
* Timeout
* yt-dlp failure
* FFmpeg missing
* Disk full
* Permission denied
* Invalid output directory
* Cancelled download

Every error should have a clear user-facing message.

---

# 28. Binary Bundling

Bundle:

```text
yt-dlp
FFmpeg
```

The user should not need to install either manually.

Conceptual structure:

```text
resources/
└── binaries/
    ├── windows/
    │   ├── yt-dlp.exe
    │   └── ffmpeg.exe
    │
    ├── macos/
    │   ├── yt-dlp
    │   └── ffmpeg
    │
    └── linux/
        ├── yt-dlp
        └── ffmpeg
```

Follow Tauri's actual resource/binary bundling conventions.

Do not hardcode paths.

Resolve binaries dynamically based on the current platform.

---

# 29. Binary Version Display

Settings should show:

```text
Downloader Engine

yt-dlp
Version: x.x.x

FFmpeg
Version: x.x.x
```

MVP only needs version display.

Automatic updates are a future feature.

---

# 30. Settings

## General

```text
Default download location
[ ~/Downloads ]

Start downloads automatically
[ ON ]

Desktop notifications
[ ON ]
```

## Downloads

```text
Concurrent downloads
[ 1 ]

Overwrite existing files
[ OFF ]

Keep partial files
[ OFF ]
```

## Appearance

```text
Theme
[ System ]
[ Light ]
[ Dark ]
```

## Engine

```text
yt-dlp
Version: x.x.x

FFmpeg
Version: x.x.x
```

Keep Settings minimal in MVP.

---

# 31. History

MVP should include basic download history.

Do not use SQLite.

Use:

* Tauri Store
* JSON
* Local application data

History should contain:

```ts
interface DownloadHistoryItem {
  id: string;
  title: string;
  url: string;
  filePath?: string;
  format: string;
  quality?: string;
  status: "completed" | "failed" | "cancelled";
  createdAt: string;
  completedAt?: string;
}
```

Actions:

* Open file
* Show in folder
* Retry
* Remove from history

Removing history should not delete the actual file.

Deleting the file must be a separate explicit action.

---

# 32. Storage

Do not use SQLite for MVP.

Store:

* Settings
* Download history
* Last download location
* Preferences

Do not store:

* Video files
* Audio files
* Large media
* Permanent thumbnail cache

Downloaded media belongs in the user's chosen download folder.

---

# 33. UI Design Direction

Fluss should feel:

* Minimal
* Premium
* Modern
* Calm
* Fast
* Refined

Visual inspiration:

* Modern German software
* Minimal productivity apps
* Premium media utilities
* Clean desktop applications

Use:

* Generous spacing
* Strong typography
* Subtle borders
* Soft shadows
* Rounded surfaces
* Clear hierarchy
* Consistent iconography

Avoid:

* Dense technical tables
* Too many controls
* Excessive gradients
* Excessive animations
* Clutter
* Terminal-like visuals

---

# 34. Fluss Visual Identity

The name "Fluss" should influence the design subtly.

Potential visual motifs:

* Flowing progress indicators
* Stream-like progress animations
* Subtle wave patterns
* Smooth transitions
* Rounded flowing shapes
* Motion that feels continuous

Do not make the UI look like a literal river application.

The concept should be subtle.

---

# 35. Suggested App Shell

```text
┌──────────────┬─────────────────────────────────────┐
│              │                                     │
│    Fluss     │             Main Content            │
│              │                                     │
│  + New       │                                     │
│              │                                     │
│  Home        │                                     │
│  Downloads   │                                     │
│  History     │                                     │
│              │                                     │
│              │                                     │
│  Settings    │                                     │
│              │                                     │
└──────────────┴─────────────────────────────────────┘
```

Default window:

```text
1200 × 800
```

Minimum:

```text
900 × 600
```

---

# 36. Responsive Desktop Behavior

Support:

* 900×600
* 1280×720
* 1440×900
* 1920×1080

At smaller widths:

* Collapse sidebar
* Reduce card spacing
* Maintain readable typography
* Avoid horizontal overflow

The app should remain usable on laptop screens.

---

# 37. Keyboard Shortcuts

MVP:

```text
Ctrl/Cmd + V
```

Paste URL.

```text
Enter
```

Analyze.

Future:

```text
Ctrl/Cmd + N
```

New download.

```text
Escape
```

Close dialogs.

---

# 38. Notifications

Optional MVP.

Completion:

```text
Download complete

Video Title
1080p MP4
```

Failure:

```text
Download failed

Video Title
```

Allow notifications to be disabled.

---

# 39. Security

The application executes external binaries.

Never execute shell commands using interpolated user input.

Never do:

```rust
Command::new("sh")
    .arg("-c")
    .arg(format!("yt-dlp {}", user_url))
```

Instead:

```rust
Command::new(yt_dlp_path)
    .args(arguments)
    .spawn()
```

Treat URLs as data.

Never expose arbitrary shell execution to the frontend.

The frontend should only provide structured options.

The Rust backend should construct the actual yt-dlp arguments.

---

# 40. Download Options

Use a typed Rust model.

Example:

```rust
struct DownloadOptions {
    url: String,
    output_directory: PathBuf,
    format: DownloadFormat,
    quality: Option<VideoQuality>,
}
```

Then:

```rust
fn build_ytdlp_args(
    options: DownloadOptions
) -> Vec<String>
```

Frontend:

```ts
invoke("start_download", {
  url,
  format: "mp4",
  quality: "1080p",
  outputDirectory,
});
```

Rust translates this into yt-dlp arguments.

This keeps the frontend independent of yt-dlp internals.

---

# 41. Rust Project Structure

Suggested:

```text
src-tauri/
└── src/
    ├── main.rs
    ├── lib.rs
    │
    ├── commands/
    │   ├── mod.rs
    │   ├── analyze.rs
    │   ├── download.rs
    │   └── settings.rs
    │
    ├── downloader/
    │   ├── mod.rs
    │   ├── process.rs
    │   ├── progress.rs
    │   ├── arguments.rs
    │   └── models.rs
    │
    ├── binaries/
    │   ├── mod.rs
    │   └── resolver.rs
    │
    ├── filesystem/
    │   ├── mod.rs
    │   └── paths.rs
    │
    └── state/
        ├── mod.rs
        └── downloads.rs
```

Simplify if the project remains small.

Do not create abstractions without a reason.

---

# 42. React Project Structure

Suggested:

```text
src/
├── app/
│   ├── App.tsx
│   └── routes.tsx
│
├── components/
│   ├── app-shell/
│   │   ├── AppShell.tsx
│   │   └── Sidebar.tsx
│   │
│   ├── downloads/
│   │   ├── DownloadCard.tsx
│   │   ├── DownloadProgress.tsx
│   │   ├── DownloadQueue.tsx
│   │   └── DownloadStatus.tsx
│   │
│   ├── media/
│   │   ├── UrlInput.tsx
│   │   ├── MediaPreview.tsx
│   │   ├── FormatSelector.tsx
│   │   └── QualitySelector.tsx
│   │
│   └── common/
│       ├── EmptyState.tsx
│       ├── ErrorState.tsx
│       └── LoadingState.tsx
│
├── pages/
│   ├── HomePage.tsx
│   ├── DownloadsPage.tsx
│   ├── HistoryPage.tsx
│   └── SettingsPage.tsx
│
├── lib/
│   ├── tauri.ts
│   └── formatters.ts
│
├── hooks/
│   ├── useDownloads.ts
│   └── useTauriEvents.ts
│
├── stores/
│   └── downloadStore.ts
│
└── types/
    ├── download.ts
    └── media.ts
```

---

# 43. Frontend State

Use Zustand or another lightweight state manager.

Global state:

```text
downloads
queue
activeDownload
history
settings
```

Local state:

```text
URL input
dialog visibility
temporary form values
dropdown state
```

Download state must survive page navigation.

Example:

```text
Home
  ↓
Start download
  ↓
Navigate to Settings
  ↓
Download continues
  ↓
Navigate to Downloads
  ↓
Progress still visible
```

Do not tie active download state to a page component.

---

# 44. Tauri API Layer

Do not call `invoke()` directly throughout the application.

Create an abstraction.

Example:

```ts
export const downloaderApi = {
  analyzeUrl(url: string) {
    return invoke<VideoMetadata>("analyze_url", { url });
  },

  startDownload(options: DownloadOptions) {
    return invoke<string>("start_download", { options });
  },

  cancelDownload(downloadId: string) {
    return invoke("cancel_download", { downloadId });
  },
};
```

Keep Tauri-specific implementation centralized.

---

# 45. Application Lifecycle

If the user attempts to close Fluss while a download is active:

Show:

```text
Downloads are still active.

Are you sure you want to quit?

[ Cancel ] [ Quit ]
```

If the user quits:

* Terminate active yt-dlp process
* Clean up process state
* Exit application

MVP does not support resuming downloads after restart.

Future versions may support resumable downloads.

---

# 46. Logging

Log:

* Application startup
* Binary resolution
* yt-dlp process start
* Process exit
* Download state changes
* Errors

Avoid logging sensitive information.

Do not unnecessarily log:

* Authentication tokens
* Cookies
* Credentials

Be cautious with URLs that may contain sensitive query parameters.

---

# 47. Testing

## Frontend

Test:

* Empty Home
* URL input
* Invalid URL
* Loading state
* Media preview
* Format selection
* Quality selection
* Download progress
* Error states
* Empty Downloads
* Empty History

## Rust

Test:

* yt-dlp argument construction
* Binary resolution
* Progress parsing
* Metadata parsing
* Error parsing
* Download state transitions

## Integration

Test:

```text
Paste URL
→ Analyze
→ Preview
→ Select options
→ Download
→ Progress
→ Complete
```

Also test:

* Cancellation
* Invalid URL
* Network failure
* Unsupported media
* Missing FFmpeg

---

# 48. Cross-Platform Testing

## Windows

Test:

* Windows 10+
* Windows 11
* Installer
* yt-dlp executable
* FFmpeg executable
* Download directory
* Native folder picker

## macOS

Test:

* Apple Silicon
* Intel where supported
* Binary permissions
* Application signing requirements

## Linux

Test at least one major distribution.

Verify:

* Executable permissions
* Binary resolution
* File paths
* Download locations

---

# 49. Performance Goals

Fluss should:

* Start quickly
* Remain responsive during downloads
* Use low memory
* Avoid blocking the UI thread
* Avoid excessive React re-renders
* Keep progress events controlled
* Handle large downloads without UI degradation

The download process must never freeze the frontend.

---

# 50. Accessibility

Implement:

* Keyboard navigation
* Visible focus states
* Semantic buttons
* Accessible labels
* Good contrast
* Tooltips for icon-only controls

Do not rely only on color.

Example:

```text
✓ Completed
↓ Downloading
⚠ Failed
```

Use text and icons alongside colors.

---

# 51. MVP Milestones

## MVP 0 — Project Setup

Tasks:

* Create Tauri project
* Configure React
* Configure TypeScript
* Configure Vite
* Configure Tailwind
* Configure shadcn/ui
* Configure Rust
* Configure application window
* Create basic AppShell

Deliverable:

```text
Fluss launches successfully as a desktop application.
```

---

## MVP 1 — Complete Static UI

Build the entire interface with mock data.

Implement:

* App shell
* Sidebar
* Home
* Downloads
* History
* Settings
* URL input
* Media preview
* Format selector
* Quality selector
* Download cards
* Progress UI
* Empty states
* Loading states
* Error states

Do not integrate yt-dlp yet.

Goal:

> The entire Fluss UI should be usable with mock data.

---

## MVP 2 — yt-dlp Integration

Add bundled yt-dlp.

Implement:

* Binary resolver
* Metadata analysis
* JSON parsing
* Normalized metadata
* Media preview

Flow:

```text
URL
 ↓
Rust
 ↓
yt-dlp --dump-single-json
 ↓
Rust parses JSON
 ↓
React receives VideoMetadata
```

---

## MVP 3 — First Real Download

Implement:

* MP4
* Best available quality
* Download directory
* Start download
* Completion detection

Goal:

```text
Paste
→ Analyze
→ Download
→ File appears in folder
```

---

## MVP 4 — Progress

Implement:

* Progress percentage
* Speed
* ETA
* Downloaded size
* Total size
* Tauri progress events
* Cancellation

---

## MVP 5 — Format and Quality

Implement:

* MP4
* MP3
* Best
* 1080p
* 720p
* 480p
* 360p

Backend handles translation into yt-dlp format selectors.

---

## MVP 6 — Queue

Implement:

* One active download
* Multiple queued downloads
* Automatic queue processing
* Cancel active task
* Remove queued task

---

## MVP 7 — History

Implement:

* Persistent history
* Retry
* Open file
* Show in folder
* Remove history item

---

## MVP 8 — Settings

Implement:

* Default download directory
* Theme
* Notifications
* Auto-start downloads
* yt-dlp version
* FFmpeg version

---

## MVP 9 — Packaging

Build:

* Windows installer
* macOS application
* Linux package

Verify:

* yt-dlp bundled
* FFmpeg bundled
* Correct binary selected
* Download works after installation

---

# 52. Recommended Development Order

Follow this order:

```text
1. Inspect existing repository
2. Project setup
3. Design system
4. App shell
5. Static UI
6. Mock download state
7. Binary resolver
8. yt-dlp metadata analysis
9. Real media preview
10. First real download
11. Progress events
12. Cancellation
13. Queue
14. History
15. Settings
16. Error handling
17. Packaging
18. Cross-platform testing
```

Do not start by implementing advanced downloader functionality.

The UI should be built and validated first.

---

# 53. Design System

Define reusable design tokens.

Example:

```text
Background
Surface
Surface Elevated
Border
Text Primary
Text Secondary
Text Muted
Accent
Success
Warning
Error
```

Also define:

* Spacing
* Border radius
* Shadows
* Typography
* Icon sizes
* Button heights

Use CSS variables or Tailwind tokens.

Avoid arbitrary styling values scattered throughout the project.

---

# 54. Animation

Animations should feel like "flow."

Use subtle animation for:

* Page transitions
* Progress updates
* Queue insertion
* Queue completion
* Toasts
* Dialogs

Avoid:

* Excessive motion
* Constant bouncing
* Large transitions
* Distracting effects

The app should feel fast and calm.

---

# 55. Loading States

Analyze:

```text
Analyzing...

[ Spinner ]
```

History:

Use skeleton loading.

Download:

Use real progress.

The application should not block the entire UI unnecessarily.

The user should be able to navigate while a download is active.

---

# 56. What NOT to Build in MVP

Do not implement:

* Built-in browser
* User accounts
* Login
* YouTube authentication
* Cookie management
* Proxy configuration
* VPN
* Video editor
* Built-in media player
* Cloud storage
* Cloud sync
* Mobile app
* Subscriptions
* Concurrent downloads
* Playlist management
* Automatic yt-dlp updates
* Automatic FFmpeg updates
* Resuming after restart

These are future possibilities.

Do not add them without explicit approval.

---

# 57. Future Roadmap

## V2

* Playlist downloads
* Batch URLs
* Concurrent downloads
* Subtitle downloads
* Thumbnail downloads
* Audio quality selection
* Custom filename templates
* Custom post-processing

## V3

* Download scheduling
* Resume downloads
* System tray
* Global hotkeys
* Clipboard monitoring
* Automatic URL detection

## V4

* yt-dlp updates
* FFmpeg updates
* Advanced format selection
* Plugin architecture
* Custom post-processing pipelines

---

# 58. Final MVP Definition

Fluss MVP is complete when a user can:

```text
1. Open Fluss
        ↓
2. Paste a supported media URL
        ↓
3. Click Analyze
        ↓
4. See title + thumbnail + duration
        ↓
5. Select MP4 or MP3
        ↓
6. Select quality
        ↓
7. Select download folder
        ↓
8. Click Download
        ↓
9. See real-time progress
        ↓
10. Cancel if necessary
        ↓
11. See completion state
        ↓
12. Open the downloaded file
```

Fluss should:

* Work without Python
* Work without manually installing yt-dlp
* Work without manually installing FFmpeg
* Have a modern desktop UI
* Remain responsive during downloads
* Handle errors gracefully
* Support Windows initially
* Be architected for macOS and Linux
* Keep yt-dlp-specific logic isolated from the frontend

---

# 59. Claude Implementation Instructions

When implementing Fluss:

1. Inspect the existing repository first.
2. Do not blindly overwrite existing files.
3. Identify the current frontend framework.
4. Identify the package manager.
5. Identify the styling system.
6. Identify installed UI libraries.
7. Identify the Tauri version.
8. Identify the Rust toolchain.
9. Determine the current operating system.
10. Preserve existing project conventions where reasonable.

Then:

1. Set up the Fluss application shell.
2. Establish the design system.
3. Implement the static UI.
4. Use mock download data.
5. Make the UI fully interactive.
6. Verify the design before backend integration.
7. Add yt-dlp integration.
8. Add FFmpeg support.
9. Add real downloads.
10. Add progress events.
11. Add queue management.
12. Add history.
13. Add settings.
14. Package the application.

Do not implement advanced functionality before the MVP is stable.

---

# 60. First Task for Claude

Begin by inspecting the repository.

Determine:

```text
1. Is this already a Tauri application?
2. What frontend framework is being used?
3. What package manager is being used?
4. What styling system is installed?
5. What UI libraries are installed?
6. What Tauri version is installed?
7. What Rust version/toolchain is configured?
8. What operating system is being used for development?
9. What existing project structure should be preserved?
```

Then provide a concise implementation assessment.

After the assessment, proceed with:

```text
1. App shell
2. Design system
3. Sidebar
4. Home page
5. Downloads page
6. History page
7. Settings page
8. Mock download state
9. Loading states
10. Empty states
11. Error states
```

The first milestone is:

> **A beautiful, fully interactive, static Fluss desktop UI.**

Do not start by implementing the downloader engine.

The UI must be complete and polished first.

---

# 61. Success Criteria

The project is successful when Fluss feels like a real, polished desktop application rather than a web page wrapped in Tauri.

The user should be able to understand the application within seconds.

The primary experience should be:

```text
Paste.
Choose.
Download.
Flow.
```

**Fluss**

> **Medien im Fluss.**
