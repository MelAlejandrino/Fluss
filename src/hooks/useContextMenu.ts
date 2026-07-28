import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useContextMenuStore } from "@/stores/contextMenuStore";
import { buildMenu } from "@/lib/contextMenu";

/**
 * Replaces the webview's native context menu app-wide. Mounted once, at the
 * app root.
 *
 * In dev, Shift + right-click falls through to the native menu so DevTools
 * stays reachable.
 */
export function useContextMenu() {
  const show = useContextMenuStore((s) => s.show);
  const hide = useContextMenuStore((s) => s.hide);

  useEffect(() => {
    function onContextMenu(e: MouseEvent) {
      if (import.meta.env.DEV && e.shiftKey) return;
      e.preventDefault();
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const entries = buildMenu(target);
      if (entries.length) show(e.clientX, e.clientY, entries);
    }

    // Any scroll or resize invalidates the anchor position, so close rather
    // than trying to keep the menu glued to a moving target.
    window.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("blur", hide);
    window.addEventListener("resize", hide);
    window.addEventListener("scroll", hide, true);
    return () => {
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("blur", hide);
      window.removeEventListener("resize", hide);
      window.removeEventListener("scroll", hide, true);
    };
  }, [show, hide]);
}

/** Keeps the menu fully on screen, flipping it when it would overflow. */
export function clampToViewport(
  x: number,
  y: number,
  width: number,
  height: number,
  viewportWidth = window.innerWidth,
  viewportHeight = window.innerHeight,
): { left: number; top: number } {
  const margin = 8;
  const left = x + width + margin > viewportWidth ? Math.max(margin, x - width) : x;
  const top = y + height + margin > viewportHeight ? Math.max(margin, y - height) : y;
  return { left, top };
}

/**
 * Positioning + keyboard navigation for the open menu. Measures after paint,
 * so the first frame is hidden to avoid a visible jump when it flips.
 */
export function useMenuPlacement(x: number, y: number, itemCount: number) {
  const ref = useRef<HTMLDivElement>(null);
  const hide = useContextMenuStore((s) => s.hide);
  const [placement, setPlacement] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPlacement(clampToViewport(x, y, width, height));
  }, [x, y, itemCount]);

  // Focus the first item so the menu is immediately keyboard-drivable.
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
  }, [x, y]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        hide();
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const items = Array.from(
        ref.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? [],
      );
      if (!items.length) return;
      const current = items.indexOf(document.activeElement as HTMLButtonElement);
      const delta = e.key === "ArrowDown" ? 1 : -1;
      // Wraps at both ends.
      items[(current + delta + items.length) % items.length].focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hide]);

  return { ref, placement } as const;
}
