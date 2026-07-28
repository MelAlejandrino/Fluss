import { Plus, X } from "lucide-react";

interface BulkUrlListProps {
  urls: string[];
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

export function BulkUrlList({ urls, onChange, onAdd, onRemove }: BulkUrlListProps) {
  return (
    <div className="flex min-h-0 flex-col gap-3">
      {/* Scrolls instead of growing — a long list would otherwise push the
          options and the Download button off-screen. */}
      <div className="-mr-1 flex max-h-[46vh] min-h-0 flex-col gap-2 overflow-y-auto pr-1">
        {urls.map((url, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-4 shrink-0 text-right font-mono text-xs text-on-surface-variant/60">
              {i + 1}
            </span>
            <input
              type="text"
              value={url}
              onChange={(e) => onChange(i, e.target.value)}
              placeholder={`Video URL ${i + 1}…`}
              className="min-w-0 flex-1 rounded border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
            />
            <button
              type="button"
              onClick={() => onRemove(i)}
              disabled={urls.length === 1}
              aria-label={`Remove link ${i + 1}`}
              className="flex shrink-0 items-center justify-center self-stretch rounded border border-outline-variant px-2 text-on-surface-variant transition-colors hover:border-error hover:text-error disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-outline-variant disabled:hover:text-on-surface-variant"
            >
              <X className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="inline-flex w-fit items-center gap-2 rounded border border-outline-variant px-3 py-2 text-xs text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
      >
        <Plus className="size-4" strokeWidth={1.5} />
        Add link
      </button>
    </div>
  );
}
