import { Link2 } from "lucide-react";
import { useUrlInput } from "@/hooks/useUrlInput";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading?: boolean;
}

/**
 * The command bar — the app's front door, and the only control on Home until
 * something has been analysed.
 *
 * It's one tall field with the action living inside its focus ring rather than
 * a field-plus-button pair, so paste-and-go reads as a single gesture. The URL
 * itself is mono: links are data, and a proportional font makes a long one
 * shift under the cursor as it's typed over.
 */
export function UrlInput({ onSubmit, isLoading }: UrlInputProps) {
  const { url, setUrl, submit, inputRef, error } = useUrlInput(onSubmit);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-2"
    >
      <Input
        ref={inputRef}
        inputSize="lg"
        mono
        invalid={!!error}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste a video or audio URL…"
        autoFocus
        spellCheck={false}
        autoComplete="off"
        aria-label="Media URL"
        aria-describedby={error ? "url-error" : undefined}
        icon={<Link2 strokeWidth={1.75} />}
        trailing={
          <Button type="submit" variant="primary" loading={isLoading}>
            Analyze
          </Button>
        }
      />
      {error && (
        <p id="url-error" role="alert" className="pl-1 text-sm text-danger-ink">
          {error}
        </p>
      )}
    </form>
  );
}
