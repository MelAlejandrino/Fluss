import { Rail } from "./Rail";

/**
 * The frame.
 *
 * Two layers, not two columns: the window background (which the caption bar
 * and the rail sit directly on) and one raised sheet holding the page. The gap
 * between them is the only separator — no divider rules, no bordered sidebar —
 * which is what gives the app depth at a 1px budget.
 *
 * The sheet owns the scroll, with a stable gutter so switching pages between a
 * short and a tall one never nudges the layout sideways.
 */
export function AppShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0">
      <Rail />
      <main className="min-h-0 flex-1 pb-3 pr-3">
        <div className="h-full overflow-y-auto overscroll-contain rounded-3xl border border-line bg-panel shadow-panel [scrollbar-gutter:stable]">
          {children}
        </div>
      </main>
    </div>
  );
}
