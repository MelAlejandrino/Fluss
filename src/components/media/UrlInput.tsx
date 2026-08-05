import { Loader2, Search } from "lucide-react";
import { useUrlInput } from "@/hooks/useUrlInput";

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading?: boolean;
}

export function UrlInput({ onSubmit, isLoading }: UrlInputProps) {
  const { url, setUrl, submit, inputRef } = useUrlInput(onSubmit);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex w-full gap-2"
    >
      <input
        ref={inputRef}
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste a video URL…"
        autoFocus
        // Focus ring is an outline, not a thicker border — a border-width change
        // resizes the input and reflows the whole centered column.
        className="flex-1 rounded border border-outline-variant bg-surface-container-low px-4 py-3 font-mono text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
      />
      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex items-center justify-center gap-2 rounded bg-primary px-6 py-3 text-sm font-medium tracking-wide text-on-primary transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
        ) : (
          <Search className="size-4" strokeWidth={1.5} />
        )}
        Analyze
      </button>
    </form>
  );
}
