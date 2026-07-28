import { Film } from "lucide-react";

interface ThumbnailProps {
  src?: string;
  /** Width utility — the 16:9 frame and everything else is fixed. */
  className?: string;
}

// Bulk items have no thumbnail until it's prefetched or their download starts,
// and some sources never report one — so the frame always needs a resting state.
export function Thumbnail({ src, className = "w-32" }: ThumbnailProps) {
  return (
    <div
      className={`flex aspect-video shrink-0 items-center justify-center overflow-hidden rounded-sm border border-outline-variant bg-surface-container-high ${className}`}
    >
      {src ? (
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <Film className="size-5 text-on-surface-variant/40" strokeWidth={1.5} />
      )}
    </div>
  );
}
