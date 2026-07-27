import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  message: string;
  details?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, details, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-sm border border-outline-variant bg-surface-container-low p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-error" strokeWidth={1.5} />
        <div className="flex flex-col gap-2">
          <p className="text-sm text-on-surface">{message}</p>
          {details && (
            <details className="text-xs text-on-surface-variant">
              <summary className="cursor-pointer select-none font-mono">View details</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                {details}
              </pre>
            </details>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-fit rounded border border-outline-variant px-3 py-1 text-xs font-medium text-on-surface hover:border-outline"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
