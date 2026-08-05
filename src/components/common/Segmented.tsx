interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
        {label}
      </span>
      {/* Grid layout keeps pills balanced when wrapping — no orphaned item
          alone on the last row. 3 columns fits 6 quality options neatly. */}
      <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-1.5">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              role="radio"
              aria-checked={active}
              disabled={opt.disabled}
              onClick={() => onChange(opt.value)}
              className={`rounded border px-3.5 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                active
                  ? "border-primary bg-primary font-medium text-on-primary"
                  : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-outline hover:bg-surface-container"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
