import { Field } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { DownloadFormat } from "@/types/media";

interface FormatSelectorProps {
  value: DownloadFormat;
  onChange: (value: DownloadFormat) => void;
  /** Namespaces the sliding indicator so single and bulk don't share one. */
  name?: string;
}

export function FormatSelector({ value, onChange, name = "format" }: FormatSelectorProps) {
  return (
    <Field label="Format">
      <SegmentedControl<DownloadFormat>
        name={name}
        label="Format"
        value={value}
        onChange={onChange}
        columns={2}
        options={[
          { value: "mp4", label: "MP4 · Video" },
          { value: "mp3", label: "MP3 · Audio" },
        ]}
      />
    </Field>
  );
}
