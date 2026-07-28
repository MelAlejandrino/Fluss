import { Download, FolderClosed, FolderOpen } from "lucide-react";
import { UrlInput } from "@/components/media/UrlInput";
import { MediaPreview } from "@/components/media/MediaPreview";
import { FormatSelector } from "@/components/media/FormatSelector";
import { QualitySelector } from "@/components/media/QualitySelector";
import { BulkUrlList } from "@/components/media/BulkUrlList";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { useAnalyzeUrl } from "@/hooks/useAnalyzeUrl";
import { useDownloadForm } from "@/hooks/useDownloadForm";
import { useStartDownload } from "@/hooks/useStartDownload";
import { useStartBulkDownload } from "@/hooks/useStartBulkDownload";
import { useBulkUrls } from "@/hooks/useBulkUrls";
import { useDownloadMode, type DownloadMode } from "@/hooks/useDownloadMode";

const MODES: { value: DownloadMode; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "bulk", label: "Bulk" },
];

/** Tabs, not a segmented control — this switches the view, it isn't a field. */
function ModeTabs({
  mode,
  onChange,
}: {
  mode: DownloadMode;
  onChange: (mode: DownloadMode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Download mode"
      className="flex justify-center gap-7 border-b border-outline-variant"
    >
      {MODES.map(({ value, label }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(value)}
            // -mb-px so the active underline sits on the strip's own rule.
            className={`-mb-px border-b-2 px-1 pb-2.5 text-sm transition-colors ${
              active
                ? "border-primary font-medium text-on-surface"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function DirectoryPicker({
  directory,
  hasDirectory,
  onChoose,
}: {
  directory: string;
  hasDirectory: boolean;
  onChoose: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
        Save to
      </span>
      <button
        onClick={onChoose}
        title={hasDirectory ? directory : undefined}
        className={`inline-flex w-fit max-w-full items-center gap-2 rounded border px-3 py-2 font-mono text-xs transition-colors ${
          hasDirectory
            ? "border-outline-variant bg-surface-container-low text-on-surface hover:border-outline"
            : "border-error/40 bg-error/10 text-error hover:border-error"
        }`}
      >
        {hasDirectory ? (
          <>
            <FolderClosed className="size-4 shrink-0" strokeWidth={1.5} />
            {/* Paths are long and the options column is narrow — clip, don't reflow. */}
            <span className="truncate">{directory}</span>
          </>
        ) : (
          <>
            <FolderOpen className="size-4 shrink-0" strokeWidth={1.5} />
            No folder selected
          </>
        )}
      </button>
    </div>
  );
}

export function HomePage() {
  const { mode, setMode } = useDownloadMode();
  const { metadata, isAnalyzing, error, details, analyze, retry } = useAnalyzeUrl();
  const form = useDownloadForm();
  const { start } = useStartDownload();
  const hasDirectory = !!form.directory;

  const bulk = useBulkUrls();
  const bulkForm = useDownloadForm();
  const { start: startBulk } = useStartBulkDownload();

  function handleDownload() {
    if (!hasDirectory || !metadata) return;
    start({
      url: metadata.webpageUrl,
      title: metadata.title,
      thumbnailUrl: metadata.thumbnailUrl,
      format: form.format,
      quality: form.quality,
      outputDirectory: form.directory,
    });
  }

  function handleBulkDownload() {
    startBulk({
      urls: bulk.validUrls,
      format: bulkForm.format,
      quality: bulkForm.quality,
      outputDirectory: bulkForm.directory,
    });
    bulk.reset();
  }

  return (
    <div
      className={`mx-auto flex min-h-full flex-col justify-center gap-6 px-8 py-12 ${
        mode === "bulk" ? "max-w-5xl" : "max-w-3xl"
      }`}
    >
      <div className="text-center">
        <h1 className="font-display text-4xl text-on-surface">Download in flow.</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          {mode === "single"
            ? "Paste a link, choose a format, and let Fluss handle the rest."
            : "Paste your links, set the options once, and queue them all."}
        </p>
      </div>

      <ModeTabs mode={mode} onChange={setMode} />

      {mode === "single" ? (
        <>
          <UrlInput
            onSubmit={(url) => {
              form.setQuality("best");
              analyze(url);
            }}
            isLoading={isAnalyzing}
          />

          {error && <ErrorState message={error} details={details} onRetry={retry} />}
          {isAnalyzing && <LoadingState label="Analyzing…" />}

          {metadata && !isAnalyzing && (
            <div className="flex flex-col gap-6 fade-in">
              <MediaPreview metadata={metadata} />

              <div className="flex flex-col gap-5 rounded-sm border border-outline-variant bg-surface-container-lowest p-4">
                <FormatSelector value={form.format} onChange={form.setFormat} />
                <QualitySelector
                  value={form.quality}
                  onChange={form.setQuality}
                  availableQualities={metadata.availableQualities}
                  disabled={form.format === "mp3"}
                />

                <DirectoryPicker
                  directory={form.directory}
                  hasDirectory={hasDirectory}
                  onChoose={form.chooseDirectory}
                />

                <button
                  onClick={handleDownload}
                  className="inline-flex w-fit items-center gap-2 rounded bg-primary px-5 py-2 text-sm font-medium text-on-primary transition-all hover:bg-primary/90 active:scale-[0.98]"
                >
                  <Download className="size-4" strokeWidth={1.5} />
                  Download
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        // Options sit beside the links, not under them, so they stay reachable
        // no matter how long the list gets.
        <div className="grid items-start gap-4 fade-in lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="flex flex-col gap-3 rounded-sm border border-outline-variant bg-surface-container-lowest p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                Links
              </span>
              <span className="font-mono text-xs text-on-surface-variant/70">
                {bulk.validUrls.length} ready
              </span>
            </div>
            <BulkUrlList
              urls={bulk.urls}
              onChange={bulk.updateUrl}
              onAdd={bulk.addUrl}
              onRemove={bulk.removeUrl}
            />
          </div>

          <div className="flex flex-col gap-5 rounded-sm border border-outline-variant bg-surface-container-lowest p-4 lg:sticky lg:top-4">
            <FormatSelector value={bulkForm.format} onChange={bulkForm.setFormat} />
            <QualitySelector
              value={bulkForm.quality}
              onChange={bulkForm.setQuality}
              availableQualities={[]}
              disabled={bulkForm.format === "mp3"}
            />

            <DirectoryPicker
              directory={bulkForm.directory}
              hasDirectory={!!bulkForm.directory}
              onChoose={bulkForm.chooseDirectory}
            />

            <button
              onClick={handleBulkDownload}
              disabled={!bulk.validUrls.length}
              className="inline-flex w-full items-center justify-center gap-2 rounded bg-primary px-5 py-2 text-sm font-medium text-on-primary transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="size-4" strokeWidth={1.5} />
              Download {bulk.validUrls.length} link{bulk.validUrls.length === 1 ? "" : "s"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
