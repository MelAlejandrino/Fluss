# Fluss — Architecture

> A clean architecture guide for the Fluss codebase.

---

## Core Rule

> **`.tsx` files contain UI only. No logic, no side effects.**
> **All logic lives in `.ts` files.**

This is the single most important rule in this codebase. Every other convention flows from it.

---

## 1. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop | Tauri | 2.x |
| Frontend | React | 19 |
| Language | TypeScript | 5.8 |
| Build | Vite | 7.x |
| Styling | Tailwind CSS | — |
| Components | shadcn/ui + Radix UI | — |
| Icons | Lucide React | — |
| State | Zustand | — |
| Forms | React Hook Form + Zod | — |
| Backend | Rust | — |
| Engine | yt-dlp + FFmpeg | (bundled) |

---

## 2. Directory Structure

```
src/
├── app/
│   ├── App.tsx              # Root component — composition only
│   └── routes.tsx           # Route definitions
│
├── components/
│   ├── ui/                  # Design-system primitives — see DESIGN.md §9.
│   │   ├── Button.tsx       # Everything else composes these; never
│   │   ├── Input.tsx        # hand-roll a control in a screen.
│   │   ├── Card.tsx
│   │   └── …
│   ├── app-shell/
│   │   ├── AppShell.tsx
│   │   ├── Rail.tsx
│   │   └── TitleBar.tsx
│   ├── downloads/
│   │   ├── DownloadCard.tsx
│   │   ├── DownloadProgress.tsx
│   │   ├── DownloadQueue.tsx
│   │   └── DownloadStatus.tsx
│   ├── media/
│   │   ├── UrlInput.tsx
│   │   ├── MediaPreview.tsx
│   │   ├── FormatSelector.tsx
│   │   └── QualitySelector.tsx
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
├── hooks/
│   ├── useDownloads.ts
│   ├── useAnalyzeUrl.ts
│   ├── useTauriEvents.ts
│   └── useSettings.ts
│
├── lib/
│   ├── api.ts               # Centralized Tauri invoke wrappers
│   ├── formatters.ts         # Pure functions (time, bytes, etc.)
│   └── validators.ts         # Zod schemas / validation logic
│
├── stores/
│   ├── downloadStore.ts
│   ├── historyStore.ts
│   └── settingsStore.ts
│
├── types/
│   ├── download.ts
│   ├── media.ts
│   └── settings.ts
│
└── assets/
    └── ...

src-tauri/
└── src/
    ├── main.rs
    ├── lib.rs
    ├── commands/
    │   ├── mod.rs
    │   ├── analyze.rs
    │   ├── download.rs
    │   └── settings.rs
    ├── downloader/
    │   ├── mod.rs
    │   ├── process.rs
    │   ├── progress.rs
    │   ├── arguments.rs
    │   └── models.rs
    ├── binaries/
    │   ├── mod.rs
    │   └── resolver.rs
    ├── filesystem/
    │   ├── mod.rs
    │   └── paths.rs
    └── state/
        ├── mod.rs
        └── downloads.rs
```

---

## 3. The `.tsx` / `.ts` Split — Rules

### 3.1 What `.tsx` files CAN contain

- JSX markup (the visual tree)
- Component prop type definitions
- Component composition (rendering child components)
- Conditional rendering based on props
- Mapping over arrays for rendering
- Inline style objects (if not using Tailwind)
- `className` bindings

### 3.2 What `.tsx` files CANNOT contain

- Business logic
- Data fetching / `invoke()` calls
- State mutations
- Side effects (`useEffect`, event handlers with logic)
- Data transformations
- Validation logic
- API calls
- Tauri event listeners
- Complex conditionals that determine *what* to do (vs. *what to show*)
- Error handling logic
- Formatting/serialization functions

### 3.3 What `.ts` files contain

- All hooks (state management, effects, subscriptions)
- All API wrappers (Tauri `invoke` calls)
- All stores (Zustand)
- All types and interfaces
- All pure utility functions
- All validation schemas
- All formatters
- All constants

---

## 4. Component Pattern

Every component follows this structure:

```
ComponentName.tsx    # UI only — the "view"
ComponentName.hooks.ts  # (optional) component-specific hooks if not reusable
```

Or, the component imports from the shared `hooks/` directory.

### 4.1 Anatomy of a `.tsx` file

```tsx
// src/components/downloads/DownloadCard.tsx

import { DownloadCardProps } from "@/types/download";
import { formatBytes } from "@/lib/formatters";
import { DownloadProgress } from "./DownloadProgress";
import { DownloadStatus } from "./DownloadStatus";

export function DownloadCard({ item, onCancel, onOpen }: DownloadCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{item.title ?? item.url}</h3>
          <p className="text-sm text-muted-foreground">
            {formatBytes(item.downloaded)} / {formatBytes(item.total)}
          </p>
        </div>
        <DownloadStatus status={item.status} />
      </div>
      <DownloadProgress progress={item.progress} speed={item.speed} />
      <div className="mt-3 flex gap-2">
        {item.status === "completed" && (
          <button onClick={() => onOpen(item.filePath)}>Open</button>
        )}
        {item.status === "downloading" && (
          <button onClick={() => onCancel(item.id)}>Cancel</button>
        )}
      </div>
    </div>
  );
}
```

Notice:
- `formatBytes` is imported from `lib/` — a pure function, not defined inline
- Event handlers (`onOpen`, `onCancel`) are props passed from a parent that owns the logic
- No `useState`, no `useEffect`, no `invoke()`
- The component is a pure function of its props

### 4.2 Anatomy of a page `.tsx` file

```tsx
// src/pages/HomePage.tsx

import { UrlInput } from "@/components/media/UrlInput";
import { MediaPreview } from "@/components/media/MediaPreview";
import { useAnalyzeUrl } from "@/hooks/useAnalyzeUrl";

export function HomePage() {
  const { metadata, isAnalyzing, analyze, error } = useAnalyzeUrl();

  return (
    <div className="flex flex-col gap-6 p-8">
      <UrlInput
        onSubmit={analyze}
        isLoading={isAnalyzing}
      />
      {error && <ErrorState message={error} />}
      {isAnalyzing && <LoadingState label="Analyzing..." />}
      {metadata && <MediaPreview metadata={metadata} />}
    </div>
  );
}
```

Notice:
- The page imports a hook (`useAnalyzeUrl`) that encapsulates all logic
- The page is still primarily markup — it wires the hook's return values to components
- The hook handles `invoke()`, state, errors, loading
- The page only decides *layout* and *composition*

---

## 5. Hook Pattern

Hooks own all logic. They are the bridge between UI and the outside world.

### 5.1 Anatomy of a hook

```ts
// src/hooks/useAnalyzeUrl.ts

import { useState } from "react";
import { api } from "@/lib/api";
import type { VideoMetadata } from "@/types/media";

export function useAnalyzeUrl() {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze(url: string) {
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await api.analyzeUrl(url);
      setMetadata(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return { metadata, isAnalyzing, error, analyze } as const;
}
```

---

## 6. API Layer

All Tauri `invoke()` calls are centralized in a single API module. No component or hook calls `invoke()` directly.

```ts
// src/lib/api.ts

import { invoke } from "@tauri-apps/api/core";
import type { VideoMetadata, DownloadOptions } from "@/types/media";
import type { DownloadItem } from "@/types/download";

export const api = {
  analyzeUrl(url: string) {
    return invoke<VideoMetadata>("analyze_url", { url });
  },

  startDownload(options: DownloadOptions) {
    return invoke<DownloadItem>("start_download", { options });
  },

  cancelDownload(downloadId: string) {
    return invoke("cancel_download", { downloadId });
  },

  getSettings() {
    return invoke<Settings>("get_settings");
  },

  updateSettings(settings: Partial<Settings>) {
    return invoke("update_settings", { settings });
  },
};
```

**Rule:** If you need to call Rust, you add a function to `api.ts` and import it. Never `import { invoke }` outside of this file.

---

## 7. State Management

### 7.1 Global state (Zustand)

Used for data that must survive page navigation:

- `downloadStore` — active downloads, queue, progress
- `historyStore` — completed/failed downloads
- `settingsStore` — user preferences

```ts
// src/stores/downloadStore.ts

import { create } from "zustand";
import type { DownloadItem } from "@/types/download";

interface DownloadState {
  downloads: DownloadItem[];
  addDownload: (item: DownloadItem) => void;
  updateProgress: (id: string, progress: number) => void;
  removeDownload: (id: string) => void;
}

export const useDownloadStore = create<DownloadState>((set) => ({
  downloads: [],
  addDownload: (item) =>
    set((state) => ({ downloads: [...state.downloads, item] })),
  updateProgress: (id, progress) =>
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id ? { ...d, progress } : d
      ),
    })),
  removeDownload: (id) =>
    set((state) => ({
      downloads: state.downloads.filter((d) => d.id !== id),
    })),
}));
```

### 7.2 Local state

Used for ephemeral UI state tied to a single component:

- URL input value
- Dialog open/closed
- Dropdown selection
- Form field values

This stays as `useState` inside the relevant hook.

---

## 8. Types

All types are defined in `src/types/`. Never define interfaces inline in `.tsx` files.

```ts
// src/types/download.ts

export interface DownloadItem {
  id: string;
  url: string;
  title?: string;
  format: "mp4" | "mp3";
  status:
    | "queued"
    | "analyzing"
    | "downloading"
    | "processing"
    | "completed"
    | "failed"
    | "cancelled";
  progress: number;
  speed?: number;
  downloadedBytes?: number;
  totalBytes?: number;
  eta?: number;
  filePath?: string;
  error?: string;
  createdAt: string;
}

export interface DownloadHistoryItem {
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

export interface DownloadCardProps {
  item: DownloadItem;
  onCancel: (id: string) => void;
  onOpen: (filePath: string) => void;
}
```

---

## 9. Naming Conventions

### Files

| Type | Convention | Example |
|------|-----------|---------|
| Components | `PascalCase.tsx` | `DownloadCard.tsx` |
| Hooks | `camelCase.ts` | `useDownloads.ts` |
| Stores | `camelCase.ts` | `downloadStore.ts` |
| Types | `camelCase.ts` | `download.ts` |
| Utilities | `camelCase.ts` | `formatters.ts` |
| API | `camelCase.ts` | `api.ts` |
| Pages | `PascalCase.tsx` | `HomePage.tsx` |
| Config | `camelCase.config.ts` | `vite.config.ts` |

### Directories

| Type | Convention | Example |
|------|-----------|---------|
| Source | `lowercase` | `src/` |
| Components | `lowercase` | `components/downloads/` |
| Pages | `lowercase` | `pages/` |

### Code

| Type | Convention | Example |
|------|-----------|---------|
| Components | `PascalCase` function | `export function DownloadCard()` |
| Hooks | `use` prefix | `export function useDownloads()` |
| Stores | `use` prefix + `Store` suffix | `export const useDownloadStore` |
| Types | `PascalCase` | `interface DownloadItem` |
| Props | `ComponentName + Props` | `DownloadCardProps` |
| Functions | `camelCase` | `formatBytes()` |
| Constants | `camelCase` or `UPPER_SNAKE_CASE` | `MAX_RETRIES` |

---

## 10. Import Conventions

- Use path aliases: `@/` maps to `src/`
- Import types with `import type` when the import is type-only
- Never import from `node_modules` inside `.tsx` unless it's a React primitive or UI library

```ts
// Good
import type { DownloadItem } from "@/types/download";
import { formatBytes } from "@/lib/formatters";
import { useDownloads } from "@/hooks/useDownloads";

// Bad
import { invoke } from "@tauri-apps/api/core"; // only allowed in lib/api.ts
```

---

## 11. Error Handling

- Hooks catch errors from the API layer and expose user-friendly messages
- Components never `try/catch` — they receive error strings from hooks
- Raw technical errors are logged but not shown to the user by default
- Error details can be shown in an expandable section

```ts
// src/hooks/useDownloads.ts — catches and normalizes errors
catch (err) {
  setError("Unable to analyze this URL. It may be unavailable or unsupported.");
  console.error(err);
}
```

```tsx
// src/pages/HomePage.tsx — just displays
{error && <ErrorState message={error} />}
```

---

## 12. Tauri Events

Real-time progress comes from Tauri events, not polling.

- Event listeners are set up in hooks, not in components
- Hooks subscribe on mount, unsubscribe on unmount
- Components receive progress data as props

```ts
// src/hooks/useTauriEvents.ts

import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useDownloadStore } from "@/stores/downloadStore";

export function useTauriEvents() {
  const updateProgress = useDownloadStore((s) => s.updateProgress);

  useEffect(() => {
    const unlisten = listen<ProgressEvent>(
      "download-progress",
      (event) => {
        updateProgress(event.payload.downloadId, event.payload.progress);
      },
    );

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [updateProgress]);
}
```

---

## 13. What Belongs Where — Decision Guide

| Question | Where it goes |
|----------|--------------|
| Does it render JSX? | `.tsx` |
| Does it call `invoke()`? | `lib/api.ts` |
| Does it manage state? | `.ts` (hook or store) |
| Does it listen to Tauri events? | `.ts` (hook) |
| Is it a pure function? | `lib/*.ts` |
| Is it a type/interface? | `types/*.ts` |
| Is it a Zustand store? | `stores/*.ts` |
| Is it a reusable UI piece? | `components/*.tsx` |
| Is it a page? | `pages/*.tsx` |
| Does it format data? | `lib/formatters.ts` |
| Does it validate input? | `lib/validators.ts` |
| Is it a constant? | Inline if small, extracted if reused |

---

## 14. Anti-Patterns

Do not:

- Put `invoke()` calls inside `.tsx` files
- Define `useState` inside a `.tsx` component for anything beyond simple local UI state (input values, toggles)
- Write business logic inside event handlers in JSX
- Define types or interfaces inside `.tsx` files
- Import `@tauri-apps/api` in any `.tsx` file
- Create "god components" that do everything
- Mix data fetching with rendering
- Use `any` type

---

## 15. Testing

- Hooks are testable in isolation (no DOM needed for logic)
- Components are testable as pure render functions
- API layer is mockable by design
- Store logic is testable without React

```ts
// Testing a hook — no component needed
const { result } = renderHook(() => useAnalyzeUrl());
await act(async () => {
  await result.current.analyze("https://...");
});
expect(result.current.metadata).toBeDefined();
```

---

## 16. Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Start Vite dev server |
| `build` | `tsc && vite build` | Type-check then bundle |
| `preview` | `vite preview` | Preview production build |
| `tauri` | `tauri` | Tauri CLI |

Run the desktop app: `npm run tauri dev`
Build for distribution: `npm run tauri build`
