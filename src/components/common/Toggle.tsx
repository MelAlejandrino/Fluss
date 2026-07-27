interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${
        checked ? "border-primary bg-primary" : "border-outline-variant bg-surface-container-high"
      }`}
    >
      <span
        className={`absolute top-0.5 size-3.5 rounded-full transition-all ${
          checked ? "left-4 bg-on-primary" : "left-0.5 bg-outline"
        }`}
      />
    </button>
  );
}
