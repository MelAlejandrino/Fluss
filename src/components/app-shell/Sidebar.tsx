import { Home, Download, History, Settings, Plus, Waves } from "lucide-react";
import { useUiStore, type Page } from "@/stores/uiStore";

const NAV: { page: Page; label: string; icon: typeof Home }[] = [
  { page: "home", label: "Home", icon: Home },
  { page: "downloads", label: "Downloads", icon: Download },
  { page: "history", label: "History", icon: History },
];

export function Sidebar() {
  const page = useUiStore((s) => s.page);
  const navigate = useUiStore((s) => s.navigate);

  const itemClass = (active: boolean) =>
    `flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm transition-colors ${
      active
        ? "bg-primary-container text-on-primary-container"
        : "text-on-surface-variant hover:bg-surface-container"
    }`;

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-outline-variant bg-surface-container-low">
      <div className="flex items-center gap-2 px-4 py-4 font-display text-xl text-on-surface">
        <Waves className="size-5 text-primary" strokeWidth={1} />
        Fluss
      </div>

      <button
        onClick={() => navigate("home")}
        className="mx-3 mb-4 flex items-center gap-2 rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface transition-colors hover:bg-surface-container"
      >
        <Plus className="size-4" strokeWidth={1} />
        New Download
      </button>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV.map(({ page: p, label, icon: Icon }) => (
          <button key={p} onClick={() => navigate(p)} className={itemClass(page === p)}>
            <Icon className="size-4" strokeWidth={1} />
            {label}
          </button>
        ))}
      </nav>

      <div className="px-3 pb-3">
        <button onClick={() => navigate("settings")} className={itemClass(page === "settings")}>
          <Settings className="size-4" strokeWidth={1} />
          Settings
        </button>
      </div>
    </aside>
  );
}
