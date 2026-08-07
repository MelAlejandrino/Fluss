import { cn } from "@/lib/cn";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** The control has no visible text of its own — this is its accessible name. */
  label: string;
  disabled?: boolean;
}

/**
 * On/off. The track is 44×24 with an invisible 8px halo, so the real pointer
 * target clears the 40px minimum even though the visible control is smaller.
 */
export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5",
        "before:absolute before:-inset-2 before:content-['']",
        "transition-colors duration-200 ease-out-quart",
        "disabled:pointer-events-none disabled:opacity-40",
        checked ? "bg-accent" : "bg-ink/18",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-5 rounded-full bg-panel shadow-card",
          "transition-transform duration-200 ease-out-quart",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}
