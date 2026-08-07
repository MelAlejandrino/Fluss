export function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes < 0) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  // Clamp low as well as high: a sub-1 value (a trickling B/s reading) gives a
  // negative index, and `units[-1]` renders as "undefined".
  const exponent = Math.floor(Math.log(bytes) / Math.log(1024));
  const i = Math.min(Math.max(exponent, 0), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatSpeed(bytesPerSecond?: number): string {
  if (bytesPerSecond === undefined) return "—";
  return `${formatBytes(bytesPerSecond)}/s`;
}

export function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds < 0) return "—";
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function formatEta(seconds?: number): string {
  if (seconds === undefined || seconds < 0) return "—";
  if (seconds < 60) return `~${Math.round(seconds)}s remaining`;
  const m = Math.round(seconds / 60);
  return `~${m}m remaining`;
}

/**
 * The site a link came from, as a bare host ("vimeo.com").
 *
 * Shown in the preview so it's obvious *what* Fluss resolved — a shortened or
 * redirected URL often lands somewhere other than where it was copied from.
 * Falls back to an empty string rather than throwing on anything unparseable;
 * the caller simply renders nothing.
 */
export function formatHost(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
