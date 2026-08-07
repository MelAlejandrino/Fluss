import { Film } from "lucide-react";
import { cn } from "@/lib/cn";

interface ThumbnailProps {
  src?: string;
  /** Width utility — the 16:9 frame and everything else is fixed. */
  className?: string;
}

/**
 * Bulk items have no thumbnail until it's prefetched or their download starts,
 * and some sources never report one — so the frame always has a resting state
 * rather than collapsing. A recessed well plus a hairline keeps the empty and
 * filled versions the same size and weight, so a list doesn't reflow as
 * artwork arrives.
 */
export function Thumbnail({ src, className = "w-32" }: ThumbnailProps) {
  return (
    <div
      className={cn(
        "flex aspect-video shrink-0 items-center justify-center overflow-hidden",
        "rounded-lg bg-inset ring-1 ring-inset ring-line",
        className,
      )}
    >
      {src ? (
        <img src={src} alt="" loading="lazy" className="size-full object-cover" />
      ) : (
        <Film className="size-5 text-ink-3" strokeWidth={1.5} />
      )}
    </div>
  );
}
