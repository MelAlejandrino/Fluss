import {
  Clipboard,
  ClipboardPaste,
  Copy,
  Download,
  ExternalLink,
  FolderOpen,
  History,
  Home,
  Link,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Scissors,
  Settings,
  TextCursorInput,
  Trash2,
  X,
} from "lucide-react";
import type { MenuEntry } from "@/stores/contextMenuStore";
import { useUiStore } from "@/stores/uiStore";
import { useDownloadStore } from "@/stores/downloadStore";
import { useHistoryStore } from "@/stores/historyStore";
import { api } from "@/lib/api";
import { notify } from "@/lib/toast";
import { cancel, retry, enqueue } from "@/lib/downloadManager";
import { requestInterrupt } from "@/lib/interrupt";
import { openDownload, revealDownload } from "@/lib/fileActions";
import type { DownloadItem, DownloadHistoryItem } from "@/types/download";

/**
 * Elements opt into a menu with `data-menu="<kind>"` and `data-menu-id="<id>"`.
 * Keeping the lookup here means components stay markup-only — they never build
 * or handle a menu themselves.
 */
export const MENU_ATTR = "data-menu";

/** Builds the entries for whatever was right-clicked. */
export function buildMenu(target: HTMLElement): MenuEntry[] {
  const input = target.closest<HTMLInputElement>("input[type='text'], input:not([type]), textarea");
  if (input) return inputMenu(input);

  const node = target.closest<HTMLElement>(`[${MENU_ATTR}]`);
  const id = node?.dataset.menuId;
  if (node?.dataset.menu === "download" && id) {
    const item = useDownloadStore.getState().downloads.find((d) => d.id === id);
    if (item) return downloadMenu(item);
  }
  if (node?.dataset.menu === "history" && id) {
    const item = useHistoryStore.getState().history.find((h) => h.id === id);
    if (item) return historyMenu(item);
  }

  return globalMenu();
}

// ---------------------------------------------------------------- clipboard

async function copy(text: string, what: string) {
  try {
    await api.writeClipboard(text);
    notify(`${what} copied.`, "success");
  } catch {
    notify(`Couldn't copy the ${what.toLowerCase()}.`, "error");
  }
}

/** Clipboard text, or null when it's empty or unreadable. */
async function clipboardText(): Promise<string | null> {
  try {
    const text = (await api.readClipboard())?.trim();
    return text ? text : null;
  } catch {
    return null;
  }
}

async function pasteIntoFocused(input: HTMLInputElement) {
  const text = await clipboardText();
  if (!text) {
    notify("The clipboard is empty.", "error");
    return;
  }
  input.focus();
  // ponytail: execCommand is deprecated but still the one-liner that replaces
  // the selection, moves the caret, and keeps React's controlled value in sync
  // (it fires a real input event). Tauri only ever runs Chromium/WebKit.
  document.execCommand("insertText", false, text);
}

/** Reads a URL from the clipboard and sends it to Home for analysis. */
async function pasteAndAnalyze() {
  const text = await clipboardText();
  if (!text) {
    notify("No URL on the clipboard.", "error");
    return;
  }
  useUiStore.getState().requestAnalyze(text);
}

// -------------------------------------------------------------------- menus

function inputMenu(input: HTMLInputElement): MenuEntry[] {
  const selection = input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0);
  const hasSelection = selection.length > 0;

  return [
    {
      label: "Paste & Analyze",
      icon: ClipboardPaste,
      onSelect: pasteAndAnalyze,
    },
    "separator",
    {
      label: "Cut",
      icon: Scissors,
      disabled: !hasSelection,
      onSelect: async () => {
        await copy(selection, "Text");
        input.focus();
        document.execCommand("delete");
      },
    },
    {
      label: "Copy",
      icon: Copy,
      disabled: !hasSelection,
      onSelect: () => copy(selection, "Text"),
    },
    { label: "Paste", icon: Clipboard, onSelect: () => pasteIntoFocused(input) },
    {
      label: "Select All",
      icon: TextCursorInput,
      disabled: !input.value,
      onSelect: () => input.select(),
    },
  ];
}

export function downloadMenu(item: DownloadItem): MenuEntry[] {
  const entries: MenuEntry[] = [];
  const isActive = item.status === "downloading" || item.status === "processing";

  if (item.status === "completed") {
    entries.push(
      { label: "Open File", icon: Play, onSelect: () => openDownload(item.filePath) },
      { label: "Show in Folder", icon: FolderOpen, onSelect: () => revealDownload(item.filePath) },
      "separator",
    );
  }

  if (item.status === "failed" || item.status === "cancelled") {
    entries.push({ label: "Retry", icon: RotateCcw, onSelect: () => retry(item.id) });
    if (item.errorDetails) {
      entries.push({
        label: "Copy Error Details",
        icon: Copy,
        onSelect: () => copy(item.errorDetails!, "Error details"),
      });
    }
    entries.push("separator");
  }

  entries.push({ label: "Copy Source URL", icon: Link, onSelect: () => copy(item.url, "URL") });
  if (item.filePath) {
    entries.push({
      label: "Copy File Path",
      icon: Copy,
      onSelect: () => copy(item.filePath!, "File path"),
    });
  }
  entries.push({
    label: "Open Source in Browser",
    icon: ExternalLink,
    onSelect: () => {
      api.openUrl(item.url).catch(() => notify("Couldn't open the link.", "error"));
    },
  });

  if (isActive || item.status === "queued") {
    entries.push("separator", {
      label: isActive ? "Cancel Download" : "Remove from Queue",
      icon: X,
      danger: true,
      onSelect: () => cancel(item.id),
    });
  }

  return entries;
}

export function historyMenu(item: DownloadHistoryItem): MenuEntry[] {
  const entries: MenuEntry[] = [];

  if (item.status === "completed") {
    entries.push(
      { label: "Open File", icon: Play, onSelect: () => openDownload(item.filePath) },
      { label: "Show in Folder", icon: FolderOpen, onSelect: () => revealDownload(item.filePath) },
      "separator",
    );
  }

  entries.push(
    { label: "Download Again", icon: RotateCcw, onSelect: () => retryFromHistory(item) },
    "separator",
    { label: "Copy Source URL", icon: Link, onSelect: () => copy(item.url, "URL") },
  );
  if (item.filePath) {
    entries.push({
      label: "Copy File Path",
      icon: Copy,
      onSelect: () => copy(item.filePath!, "File path"),
    });
  }
  entries.push(
    {
      label: "Open Source in Browser",
      icon: ExternalLink,
      onSelect: () => {
        api.openUrl(item.url).catch(() => notify("Couldn't open the link.", "error"));
      },
    },
    "separator",
    // Never touches the file on disk (PLAN §31).
    {
      label: "Remove from History",
      icon: Trash2,
      danger: true,
      onSelect: () => useHistoryStore.getState().remove(item.id),
    },
  );

  return entries;
}

function globalMenu(): MenuEntry[] {
  const { navigate, newDownload } = useUiStore.getState();
  return [
    { label: "Paste URL & Analyze", icon: ClipboardPaste, onSelect: pasteAndAnalyze },
    "separator",
    // `newDownload`, not `navigate` — on Home the page doesn't remount, so this
    // is what clears the URL field and the stale preview.
    { label: "New Download", icon: Plus, onSelect: newDownload },
    { label: "Home", icon: Home, onSelect: () => navigate("home") },
    { label: "Downloads", icon: Download, onSelect: () => navigate("downloads") },
    { label: "History", icon: History, onSelect: () => navigate("history") },
    { label: "Settings", icon: Settings, onSelect: () => navigate("settings") },
    "separator",
    // Confirms first if downloads are in flight, then stops them cleanly —
    // a bare reload would leave yt-dlp running with no UI attached to it.
    { label: "Reload", icon: RefreshCw, onSelect: () => requestInterrupt("reload") },
  ];
}

// Same enqueue path the History page's retry button uses; enqueue navigates
// to Downloads on its own.
function retryFromHistory(item: DownloadHistoryItem) {
  enqueue({
    url: item.url,
    title: item.title,
    thumbnailUrl: item.thumbnailUrl,
    format: item.format,
    quality: item.quality ?? "best",
    outputDirectory: item.outputDirectory,
  });
}
