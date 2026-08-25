import { Minus, Square, Copy, X } from "lucide-react";
import { useMaximized } from "@/hooks/useMaximized";
import { minimizeWindow, toggleMaximizeWindow, closeWindow } from "@/lib/window";
import { isMacOS } from "@/lib/platform";
import { cn } from "@/lib/cn";

interface TitleBarProps {
  onClose?: () => void;
}

/**
 * Caption bar. Transparent — it sits on the window background alongside the
 * rail, so the top of the app is one continuous frame around the content sheet
 * rather than a stack of bordered strips.
 *
 * The caption buttons keep the platform's full-bleed rectangle on purpose:
 * rounded floating controls look nicer in isolation but throw away the screen
 * corner, and "close" is the one target that has to be hittable by slamming
 * the pointer into the edge when the window is maximised.
 *
 * The window is undecorated on every platform, so these buttons are the only
 * ones there are — which makes their *side* a correctness question, not a
 * styling one. On macOS the close button belongs in the top-left corner, and
 * the order runs close, minimise, zoom. Putting a Windows caption cluster in
 * the top-right of a Mac window means the corner someone throws the pointer at
 * to close the app does nothing at all.
 */
export function TitleBar({ onClose }: TitleBarProps) {
  const maximized = useMaximized();
  const handleClose = onClose ?? closeWindow;

  // Structure and resting colour only — deliberately no `hover:` utilities.
  //
  // When two class sources both set the same property, the winner is decided by
  // the order Tailwind emits the rules, not by the order they appear in the
  // attribute — and the two can split. Composing a red hover on top of a shared
  // `hover:bg-hover hover:text-ink` did exactly that: the neutral background won
  // and the `on-danger` icon colour won, painting a near-black glyph on a
  // near-black bar in dark mode and a near-white one on a pale bar in light.
  // Each button now supplies its whole hover state from a single source.
  const control =
    "inline-flex h-11 w-[46px] items-center justify-center text-ink-2 " +
    "transition-colors duration-150 ease-out-quart";

  const hoverNeutral = "hover:bg-hover hover:text-ink";
  const hoverClose = "hover:bg-danger-solid hover:text-on-danger";

  const close = (
    <button key="close" onClick={handleClose} aria-label="Close" className={cn(control, hoverClose)}>
      <X className="size-4" strokeWidth={1.75} />
    </button>
  );

  const minimize = (
    <button
      key="minimize"
      onClick={minimizeWindow}
      aria-label="Minimize"
      className={cn(control, hoverNeutral)}
    >
      <Minus className="size-4" strokeWidth={1.75} />
    </button>
  );

  const zoom = (
    <button
      key="zoom"
      onClick={toggleMaximizeWindow}
      aria-label={maximized ? "Restore" : "Maximize"}
      className={cn(control, hoverNeutral)}
    >
      {maximized ? (
        <Copy className="size-3.5" strokeWidth={1.75} />
      ) : (
        <Square className="size-3.5" strokeWidth={1.75} />
      )}
    </button>
  );

  const controls = (
    <div className="flex h-full" onDoubleClick={(e) => e.stopPropagation()}>
      {isMacOS ? [close, minimize, zoom] : [minimize, zoom, close]}
    </div>
  );

  return (
    <div
      data-tauri-drag-region
      onDoubleClick={toggleMaximizeWindow}
      className="flex h-11 shrink-0 select-none items-center"
    >
      {isMacOS && controls}

      {/* Mark and wordmark sit on the rail's own text column, so the app name
          and the nav labels below it share one left edge. Grows to fill, so it
          stays the drag region whichever side the buttons are on — and on macOS
          it starts after them rather than under them. */}
      <div
        data-tauri-drag-region
        className={cn("flex flex-1 items-center gap-2.5", isMacOS ? "pl-3" : "pl-6")}
      >
        <img
          src="/FLUSS_LOGO.png"
          alt=""
          className="size-5 shrink-0 object-contain"
          draggable={false}
        />
        <span className="text-base font-semibold tracking-[-0.01em] text-ink">Fluss</span>
      </div>

      {!isMacOS && controls}
    </div>
  );
}
