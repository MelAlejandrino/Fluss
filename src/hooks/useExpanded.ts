import { useState } from "react";

/// Which of a set of collapsible blocks are open. Ids only — the caller decides
/// what a block is.
///
/// Defaults to closed: a playlist can be thirty rows, and a list that opens
/// everything at once is one you have to scroll past rather than read.
export function useExpanded() {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  return { isExpanded: (id: string) => open.has(id), toggle } as const;
}
