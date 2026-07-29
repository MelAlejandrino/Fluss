import { Home, Download, History, Settings, Plus } from "lucide-react";
import { useUiStore, type Page } from "@/stores/uiStore";

const NAV: { page: Page; label: string; icon: typeof Home }[] = [
  { page: "home", label: "Home", icon: Home },
  { page: "downloads", label: "Downloads", icon: Download },
  { page: "history", label: "History", icon: History },
];

export function Sidebar() {
  const page = useUiStore((s) => s.page);
  const navigate = useUiStore((s) => s.navigate);
  const newDownload = useUiStore((s) => s.newDownload);

  // Below `lg` the sidebar collapses to an icon rail (PLAN §36) — labels are
  // hidden but stay in the DOM as accessible names via title/aria-label.
  const itemClass = (active: boolean) =>
    `flex w-full items-center gap-2 rounded py-2 text-left text-sm transition-colors max-lg:justify-center max-lg:px-0 lg:px-3 ${
      active
        ? "bg-primary-container text-on-primary-container"
        : "text-on-surface-variant hover:bg-surface-container"
    }`;

  return (
    <aside className="flex w-14 shrink-0 flex-col border-r border-outline-variant bg-surface-container-low lg:w-56">
      <div className="flex items-center gap-2 py-4 font-display text-xl text-on-surface max-lg:justify-center lg:px-4">
        <img src="/FLUSS_LOGO.png" alt="" className="size-6 shrink-0 object-contain" />
        <span className="max-lg:hidden">Fluss</span>
      </div>

      <button
        onClick={newDownload}
        title="New Download (Ctrl+N)"
        aria-label="New Download"
        className="mx-2 mb-4 flex items-center gap-2 rounded border border-outline-variant bg-surface-container-lowest py-2 text-sm text-on-surface transition-colors hover:bg-surface-container max-lg:justify-center max-lg:px-0 lg:mx-3 lg:px-3"
      >
        <Plus className="size-4 shrink-0" strokeWidth={1} />
        <span className="max-lg:hidden">New Download</span>
      </button>

      <nav className="flex flex-1 flex-col gap-1 px-2 lg:px-3">
        {NAV.map(({ page: p, label, icon: Icon }) => (
          <button
            key={p}
            onClick={() => navigate(p)}
            title={label}
            aria-label={label}
            aria-current={page === p ? "page" : undefined}
            className={itemClass(page === p)}
          >
            <Icon className="size-4 shrink-0" strokeWidth={1} />
            <span className="max-lg:hidden">{label}</span>
          </button>
        ))}
      </nav>

      <div className="px-2 pb-3 lg:px-3">
        <button
          onClick={() => navigate("settings")}
          title="Settings"
          aria-label="Settings"
          aria-current={page === "settings" ? "page" : undefined}
          className={itemClass(page === "settings")}
        >
          <Settings className="size-4 shrink-0" strokeWidth={1} />
          <span className="max-lg:hidden">Settings</span>
        </button>
      </div>
    </aside>
  );
}
