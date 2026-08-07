import { FolderClosed, FolderOpen } from "lucide-react";
import { Field } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

interface DirectoryPickerProps {
  directory: string;
  onChoose: () => void;
  label?: string;
}

/**
 * Where the file lands. Reads as a field rather than a button because that's
 * what it is — a value you set — and the full path sits under it in mono so a
 * long one can be checked without being what you look at first.
 *
 * Unset is styled as a warning, not an error: nothing has gone wrong yet, it's
 * simply the one thing still needed before the download can start.
 */
export function DirectoryPicker({ directory, onChoose, label = "Save to" }: DirectoryPickerProps) {
  const hasDirectory = !!directory;
  // Last path segment reads as the folder's name; the full path lives below.
  const folderName = hasDirectory ? (directory.split(/[/\\]/).pop() ?? directory) : null;

  return (
    <Field label={label}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <button
          type="button"
          onClick={onChoose}
          className={cn(
            "flex h-10 w-full items-center gap-2.5 rounded-lg border px-3.5 text-left",
            "transition-[background-color,border-color] duration-150 ease-out-quart",
            hasDirectory
              ? "border-line bg-inset text-ink hover:border-line-strong hover:bg-hover"
              : "border-warn/45 bg-warn-soft text-warn-ink hover:border-warn/70",
          )}
        >
          {hasDirectory ? (
            <FolderClosed className="size-4 shrink-0 text-ink-3" strokeWidth={1.75} />
          ) : (
            <FolderOpen className="size-4 shrink-0" strokeWidth={1.75} />
          )}
          <span className="truncate text-base">{folderName ?? "No folder selected"}</span>
        </button>
        {hasDirectory && (
          <span
            data-selectable
            title={directory}
            className="truncate pl-0.5 font-mono text-2xs text-ink-3"
          >
            {directory}
          </span>
        )}
      </div>
    </Field>
  );
}
