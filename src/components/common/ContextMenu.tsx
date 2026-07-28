import { useContextMenuStore, type MenuItem } from "@/stores/contextMenuStore";
import { useMenuPlacement } from "@/hooks/useContextMenu";

function Item({ item, onDone }: { item: MenuItem; onDone: () => void }) {
  const { label, icon: Icon, disabled, danger } = item;
  return (
    <button
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        onDone();
        item.onSelect();
      }}
      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-40 ${
        danger
          ? "text-error hover:bg-error/10 focus-visible:bg-error/10"
          : "text-on-surface hover:bg-surface-container-high focus-visible:bg-surface-container-high"
      }`}
    >
      {Icon ? (
        <Icon className="size-3.5 shrink-0" strokeWidth={1.5} />
      ) : (
        <span className="size-3.5 shrink-0" />
      )}
      <span className="truncate">{label}</span>
    </button>
  );
}

export function ContextMenu() {
  const { open, x, y, entries, hide } = useContextMenuStore();
  const { ref, placement } = useMenuPlacement(x, y, entries.length);

  if (!open) return null;

  return (
    // Transparent backdrop closes on any click, including a second right-click.
    <div className="fixed inset-0 z-[60]" onClick={hide} onContextMenu={hide}>
      <div
        ref={ref}
        role="menu"
        aria-orientation="vertical"
        onClick={(e) => e.stopPropagation()}
        style={{
          left: placement?.left ?? x,
          top: placement?.top ?? y,
          visibility: placement ? "visible" : "hidden",
        }}
        className="fixed min-w-52 overflow-hidden rounded-md border border-outline-variant bg-surface-container-low py-1 shadow-lg fade-in"
      >
        {entries.map((entry, i) =>
          entry === "separator" ? (
            <div key={i} className="my-1 h-px bg-outline-variant" role="separator" />
          ) : (
            <Item key={i} item={entry} onDone={hide} />
          ),
        )}
      </div>
    </div>
  );
}
