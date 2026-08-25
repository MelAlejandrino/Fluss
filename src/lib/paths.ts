/// Characters no Windows path may contain, plus control codes. POSIX only
/// objects to "/", but one rule for both platforms keeps a playlist folder
/// named identically everywhere — and stripping the separators is what makes
/// a title like "../../Windows" a harmless folder name rather than a traversal.
const ILLEGAL = /[<>:"/\\|?*\x00-\x1f]/g;

/// A remote title, made safe to use as a single folder name.
///
/// The fallback matters: a title of nothing but dots or slashes cleans down to
/// an empty string, and an empty path segment would silently write into the
/// parent folder instead.
export function folderName(title: string, fallback = "Playlist"): string {
  const cleaned = title
    .replace(ILLEGAL, " ")
    .replace(/\s+/g, " ")
    .trim()
    // Windows drops a trailing dot or space without telling you, so the folder
    // it creates wouldn't match the name we think we asked for. Leading ones go
    // too: they're what's left of a "../.." once the separators are gone, and
    // a folder called ".. .. Holiday" is nobody's idea of a name.
    .replace(/^[. ]+/, "")
    .replace(/[. ]+$/, "");
  // Capped well short of a full name: the video filename still has to fit
  // underneath it, and Windows caps the whole path at 260 by default.
  return cleaned.slice(0, 80).trim() || fallback;
}

/// Append one segment to a directory, in that directory's own separator style.
/// Mixing separators works but shows up in the UI, and a path the user can't
/// recognise is a path they can't check.
export function joinPath(directory: string, segment: string): string {
  const separator = directory.includes("\\") ? "\\" : "/";
  return directory.replace(/[/\\]+$/, "") + separator + segment;
}
