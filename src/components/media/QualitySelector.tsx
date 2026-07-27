import { Segmented } from "@/components/common/Segmented";
import { qualityOptions } from "@/lib/quality";
import type { VideoQuality } from "@/types/media";

interface QualitySelectorProps {
  value: VideoQuality;
  onChange: (value: VideoQuality) => void;
  availableQualities: number[];
  disabled?: boolean;
}

export function QualitySelector({
  value,
  onChange,
  availableQualities,
  disabled,
}: QualitySelectorProps) {
  const options = qualityOptions(availableQualities).map((q) => ({
    value: q,
    label: q === "best" ? "Best" : q,
    disabled,
  }));

  return <Segmented<VideoQuality> label="Quality" value={value} onChange={onChange} options={options} />;
}
