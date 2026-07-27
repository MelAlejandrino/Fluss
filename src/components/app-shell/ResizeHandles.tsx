import { startResize } from "@/lib/window";
import type { ResizeDir } from "@/lib/api";

// Undecorated windows lose native edge-resize, so overlay thin grips that drive
// the OS resize. pointer-events only on the strips, not the whole overlay.
const HANDLES: { dir: ResizeDir; className: string }[] = [
  { dir: "North", className: "top-0 inset-x-0 h-1 cursor-ns-resize" },
  { dir: "South", className: "bottom-0 inset-x-0 h-1 cursor-ns-resize" },
  { dir: "West", className: "left-0 inset-y-0 w-1 cursor-ew-resize" },
  { dir: "East", className: "right-0 inset-y-0 w-1 cursor-ew-resize" },
  { dir: "NorthWest", className: "top-0 left-0 size-2 cursor-nwse-resize" },
  { dir: "NorthEast", className: "top-0 right-0 size-2 cursor-nesw-resize" },
  { dir: "SouthWest", className: "bottom-0 left-0 size-2 cursor-nesw-resize" },
  { dir: "SouthEast", className: "bottom-0 right-0 size-2 cursor-nwse-resize" },
];

export function ResizeHandles() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {HANDLES.map((h) => (
        <div
          key={h.dir}
          onMouseDown={() => startResize(h.dir)}
          className={`pointer-events-auto absolute ${h.className}`}
        />
      ))}
    </div>
  );
}
