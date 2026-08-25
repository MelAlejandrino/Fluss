import type { Analysis, PlaylistMetadata } from "@/types/media";

/// Which shape came back from `analyze_url`. Structural rather than a `kind`
/// field: only a playlist has entries, so there's nothing to keep in sync.
export function isPlaylist(analysis: Analysis): analysis is PlaylistMetadata {
  return "entries" in analysis;
}

/// Whether a link carries a playlist alongside whatever it points at, so the
/// UI can offer to load the list instead. Query-string only — a bare
/// "/playlist?list=…" resolves to the playlist on its own and needs no offer.
export function hasPlaylistAlongside(url: string): boolean {
  try {
    const parsed = new URL(url);
    // A pure playlist page is already handled; this is about the *video* link
    // that happens to sit inside one.
    if (!parsed.searchParams.get("v")) return false;
    return !!parsed.searchParams.get("list");
  } catch {
    return false; // unparseable — offer nothing rather than guess
  }
}
