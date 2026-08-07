import { useContextMenuStore, type MenuItem } from "@/stores/contextMenuStore";
import { useMenuPlacement, MENU_ROOT_ATTR } from "@/hooks/useContextMenu";
import { cn } from "@/lib/cn";

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
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-base",
        "transition-colors duration-100 focus:outline-none",
        "disabled:pointer-events-none disabled:opacity-40",
        danger
          ? "text-danger-ink hover:bg-danger-soft focus-visible:bg-danger-soft"
          : "text-ink hover:bg-hover focus-visible:bg-hover",
      )}
    >
      {Icon ? (
        <Icon className="size-4 shrink-0 opacity-70" strokeWidth={1.75} />
      ) : (
        <span className="size-4 shrink-0" />
      )}
      <span className="truncate">{label}</span>
    </button>
  );
}

/**
 * Right-click menu. A floating sheet in the same material as every other
 * elevated surface — same radius family, same hairline, same shadow — so it
 * reads as part of the app rather than as OS chrome bolted on.
 */
export function ContextMenu() {
  const { open, x, y, entries, hide } = useContextMenuStore();
  const { ref, placement } = useMenuPlacement(x, y, entries.length);

  if (!open) return null;

  return (
    // Transparent backdrop; a left-click anywhere closes the menu. It does NOT
    // handle right-click — the window listener sees through it (via
    // MENU_ROOT_ATTR) and reopens with the entries for whatever is underneath,
    // so a second right-click on a card keeps that card's menu.
    <div
      {...{ [MENU_ROOT_ATTR]: "" }}
      className="fixed inset-0 z-[var(--z-menu)]"
      onClick={hide}
    >
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
        className="fixed min-w-56 animate-rise rounded-xl border border-line bg-panel p-1.5 shadow-pop"
      >
        {entries.map((entry, i) =>
          entry === "separator" ? (
            <div key={i} className="mx-1 my-1.5 h-px bg-line" role="separator" />
          ) : (
            <Item key={i} item={entry} onDone={hide} />
          ),
        )}
      </div>
    </div>
  );
}
