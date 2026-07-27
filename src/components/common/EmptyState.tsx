import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-outline-variant px-6 py-16 text-center">
      <div className="flex size-10 items-center justify-center rounded-sm bg-surface-container-high text-primary">
        <Icon className="size-5" strokeWidth={1} />
      </div>
      <h3 className="text-base font-semibold text-on-surface">{title}</h3>
      {description && (
        <p className="max-w-xs text-sm leading-relaxed text-on-surface-variant">{description}</p>
      )}
    </div>
  );
}
