import { api } from "@/lib/api";
import { useDownloadStore } from "@/stores/downloadStore";
import { useHistoryStore } from "@/stores/historyStore";

/// Check every finished download against the filesystem and mark the ones whose
/// file has gone.
///
/// Nothing tells an app that a folder was deleted. Without this, a playlist the
/// user threw away still reads "12 of 12 downloaded", Resume has nothing to do,
/// and Open File fails on a path that hasn't existed for a week.
///
/// The flag is cleared as well as set, so a folder restored from the recycle
/// bin — or a drive plugged back in — puts the rows back the way they were
/// rather than leaving them permanently wrong.
export async function verifyDownloadedFiles(): Promise<void> {
  const downloads = useDownloadStore.getState().downloads;
  const history = useHistoryStore.getState().history;

  // One question for the whole app: the same file is usually in both lists.
  const paths = [
    ...new Set(
      [...downloads, ...history]
        .filter((item) => item.status === "completed" && item.filePath)
        .map((item) => item.filePath as string),
    ),
  ];
  if (!paths.length) return;

  let missing: Set<string>;
  try {
    missing = new Set(await api.missingFiles(paths));
  } catch {
    // Can't tell — leave every row exactly as it is. Claiming files are gone on
    // the strength of a failed check is worse than saying nothing.
    return;
  }

  for (const item of downloads) {
    if (item.status !== "completed" || !item.filePath) continue;
    const gone = missing.has(item.filePath);
    if (gone !== (item.fileMissing ?? false)) {
      useDownloadStore.getState().update(item.id, { fileMissing: gone });
    }
  }

  useHistoryStore.getState().markMissing(missing);
}
