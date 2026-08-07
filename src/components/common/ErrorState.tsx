import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ErrorStateProps {
  message: string;
  details?: string;
  onRetry?: () => void;
}

/**
 * What the user reads when something fails.
 *
 * The plain-language reason is the whole message; raw engine output goes
 * behind a closed disclosure and is set in mono so it's obviously machine
 * text. Nobody should have to parse a yt-dlp traceback to learn that a video
 * is private — but the traceback still has to be one click away for the times
 * it's the only thing that explains it.
 */
export function ErrorState({ message, details, onRetry }: ErrorStateProps) {
  return (
    // Neutral surface, tinted plate — the same shape as an error toast and the
    // dialog's icon, so all three read as one vocabulary. Flooding the block
    // with `danger-soft` made a 600px field of pink the loudest thing on a page
    // whose entire palette is otherwise restrained.
    <div
      role="alert"
      className="flex items-start gap-3.5 rounded-xl border border-danger/25 bg-card p-4 shadow-card"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-danger-soft text-danger-ink">
        <TriangleAlert className="size-4" strokeWidth={1.75} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-3 pt-0.5">
        <p className="text-base leading-relaxed text-ink">{message}</p>

        {details && (
          <details className="w-full">
            <summary className="w-fit cursor-pointer select-none text-sm font-medium text-ink-3 transition-colors hover:text-ink">
              View details
            </summary>
            <pre
              data-selectable
              className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-inset p-3 font-mono text-2xs leading-relaxed text-ink-2"
            >
              {details}
            </pre>
          </details>
        )}

        {onRetry && (
          <Button size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
