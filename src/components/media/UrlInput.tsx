import { useState } from "react";
import { Loader2, Search } from "lucide-react";

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading?: boolean;
}

export function UrlInput({ onSubmit, isLoading }: UrlInputProps) {
  const [url, setUrl] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(url);
      }}
      className="flex w-full gap-2"
    >
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste a video URL…"
        autoFocus
        className="flex-1 rounded border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-2 focus:border-primary focus:outline-none"
      />
      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex items-center justify-center gap-2 rounded bg-primary px-5 py-2 text-sm font-medium text-on-primary transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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
