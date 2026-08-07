import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";

interface BulkUrlListProps {
  urls: string[];
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

/**
 * A stack of URL fields, numbered so a long list stays countable against
 * whatever it was pasted from.
 *
 * The list scrolls instead of growing: left to expand, twenty links would push
 * the options and the Download button off the bottom of the window, and the
 * whole point of bulk mode is setting options once for all of them.
 */
export function BulkUrlList({ urls, onChange, onAdd, onRemove }: BulkUrlListProps) {
  return (
    <div className="flex min-h-0 flex-col gap-3">
      {/* The negative margins cancel the padding, so nothing moves — the padding
          exists purely to give focus decoration somewhere to land. Focus rings
          are box-shadows and outlines: they paint *outside* the border box and
          get sheared off by this container's own overflow clipping. Without the
          vertical pair the first row's ring is cut along the top edge and the
          last row's along the bottom. */}
      <div className="-my-1.5 -mr-2 flex max-h-[42vh] min-h-0 flex-col gap-2 overflow-y-auto py-1.5 pr-2">
        {urls.map((url, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="w-5 shrink-0 text-right font-mono text-xs tabular-nums text-ink-3">
              {i + 1}
            </span>
            <Input
              mono
              value={url}
              onChange={(e) => onChange(i, e.target.value)}
              placeholder={`Video URL ${i + 1}…`}
              aria-label={`Video URL ${i + 1}`}
              spellCheck={false}
              autoComplete="off"
              wrapperClassName="flex-1"
            />
            <IconButton
              label={`Remove link ${i + 1}`}
              tone="danger"
              disabled={urls.length === 1}
              onClick={() => onRemove(i)}
            >
              <X strokeWidth={1.75} />
            </IconButton>
          </div>
        ))}
      </div>

      <Button variant="ghost" size="sm" onClick={onAdd} className="w-fit">
        <Plus />
        Add link
      </Button>
    </div>
  );
}
