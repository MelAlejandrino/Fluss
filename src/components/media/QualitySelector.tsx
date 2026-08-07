import { Field } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { qualityOptions } from "@/lib/quality";
import type { VideoQuality } from "@/types/media";

interface QualitySelectorProps {
  value: VideoQuality;
  onChange: (value: VideoQuality) => void;
  availableQualities: number[];
  disabled?: boolean;
  name?: string;
}

/**
 * Only ever offers what the media actually has. Disabled wholesale for audio,
 * with the reason said out loud rather than left to be inferred from a row of
 * greyed-out buttons.
 */
export function QualitySelector({
  value,
  onChange,
  availableQualities,
  disabled,
  name = "quality",
}: QualitySelectorProps) {
  const options = qualityOptions(availableQualities).map((q) => ({
    value: q,
    label: q === "best" ? "Best" : q,
    disabled,
  }));

  return (
    <Field label="Quality" hint={disabled ? "Not used for audio-only downloads." : undefined}>
      <SegmentedControl<VideoQuality>
        name={name}
        label="Quality"
        value={value}
        onChange={onChange}
        columns={3}
        options={options}
      />
    </Field>
  );
}
