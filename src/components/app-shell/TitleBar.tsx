import { Minus, Square, Copy, X } from "lucide-react";
import { useMaximized } from "@/hooks/useMaximized";
import { minimizeWindow, toggleMaximizeWindow, closeWindow } from "@/lib/window";

export function TitleBar() {
  const maximized = useMaximized();

  return (
    <div
      data-tauri-drag-region
      onDoubleClick={toggleMaximizeWindow}
      className="flex h-9 shrink-0 select-none items-center justify-between border-b border-outline-variant bg-surface-container-low"
    >
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 px-3 text-xs text-on-surface-variant"
      >
        <img src="/FLUSS_LOGO.png" alt="" className="size-5 object-contain" />
        Fluss
      </div>

      <div className="flex h-full" onDoubleClick={(e) => e.stopPropagation()}>
        <button
          onClick={minimizeWindow}
          aria-label="Minimize"
          className="inline-flex h-full w-11 items-center justify-center text-on-surface-variant hover:bg-surface-container"
        >
          <Minus className="size-4" strokeWidth={1.5} />
        </button>
        <button
          onClick={toggleMaximizeWindow}
          aria-label={maximized ? "Restore" : "Maximize"}
          className="inline-flex h-full w-11 items-center justify-center text-on-surface-variant hover:bg-surface-container"
        >
          {maximized ? (
            <Copy className="size-3.5" strokeWidth={1.5} />
          ) : (
            <Square className="size-3.5" strokeWidth={1.5} />
          )}
        </button>
        <button
          onClick={closeWindow}
          aria-label="Close"
          className="inline-flex h-full w-11 items-center justify-center text-on-surface-variant hover:bg-error hover:text-on-error"
        >
          <X className="size-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
