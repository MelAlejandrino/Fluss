import { notify } from "@/lib/toast";

type Key = "settings" | "history" | "queue";

// A failed write is otherwise invisible: the UI shows the change as applied,
// then it's gone on restart with no explanation. Disk full, antivirus holding
// the file, and the file open in an editor all land here.
//
// History saves fire on every completed download, so a persistent problem must
// not toast on each one — warn once, then stay quiet until a save succeeds.
const warned = new Set<Key>();

// Every save rewrites the whole file, so two in flight at once can finish out
// of order and leave the older list on disk — one download silently missing
// from history after a restart. Chain per key: one write at a time, in the
// order they were requested.
const chains = new Map<Key, Promise<unknown>>();

export function persist(what: Key, save: () => Promise<unknown>) {
  // Start immediately when nothing is queued, rather than always deferring a
  // tick: on quit the window can close before a deferred write ever begins.
  const prev = chains.get(what);
  const next: Promise<void> = (prev ? prev.then(save) : save()).then(
    () => {
      warned.delete(what);
    },
    () => {
      if (warned.has(what)) return;
      warned.add(what);
      notify(
        `Couldn't save your ${what}. The change will be lost when Fluss closes.`,
        "error",
      );
    },
  ).then(() => {
    // Drop the settled chain so the *next* save is a fresh start too — keeping
    // it would make every save after the first wait a tick on a dead promise.
    if (chains.get(what) === next) chains.delete(what);
  });
  chains.set(what, next);
}

/// A stored file that exists but won't parse. Rust returns the empty state for
/// a *missing* file, so reaching here means real damage — and the file is the
/// user's only copy. Saves stay off until they choose, because the next save
/// would write our empty in-memory list straight over it.
export function reportUnreadable(what: Key, onStartFresh: () => void) {
  notify(
    `Your saved ${what} couldn't be read and may be damaged. Fluss won't overwrite the file.`,
    "error",
    [{ label: "Start fresh", primary: true, onClick: onStartFresh }],
  );
}
