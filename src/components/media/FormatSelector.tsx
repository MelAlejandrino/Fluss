import { Segmented } from "@/components/common/Segmented";
import type { DownloadFormat } from "@/types/media";

interface FormatSelectorProps {
  value: DownloadFormat;
  onChange: (value: DownloadFormat) => void;
}

export function FormatSelector({ value, onChange }: FormatSelectorProps) {
  return (
    <Segmented<DownloadFormat>
      label="Format"
      value={value}
      onChange={onChange}
      options={[
        { value: "mp4", label: "MP4 · Video" },
        { value: "mp3", label: "MP3 · Audio" },
      ]}
    />
  );
}
