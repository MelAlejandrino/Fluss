import { Download, FolderClosed, FolderOpen } from "lucide-react";
import { UrlInput } from "@/components/media/UrlInput";
import { MediaPreview } from "@/components/media/MediaPreview";
import { FormatSelector } from "@/components/media/FormatSelector";
import { QualitySelector } from "@/components/media/QualitySelector";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { useAnalyzeUrl } from "@/hooks/useAnalyzeUrl";
import { useDownloadForm } from "@/hooks/useDownloadForm";
import { useStartDownload } from "@/hooks/useStartDownload";

export function HomePage() {
  const { metadata, isAnalyzing, error, details, analyze } = useAnalyzeUrl();
  const form = useDownloadForm();
  const { start } = useStartDownload();
  const hasDirectory = !!form.directory;

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

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center gap-8 px-8 py-12">
      <div className="text-center">
        <h1 className="font-display text-4xl text-on-surface">Download in flow.</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Paste a link, choose a format, and let Fluss handle the rest.
        </p>
      </div>

      <UrlInput
        onSubmit={(url) => {
          form.setQuality("best");
          analyze(url);
        }}
        isLoading={isAnalyzing}
      />

      {error && <ErrorState message={error} details={details} />}
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

             <div className="flex flex-col gap-2">
               <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                 Save to
               </span>
               <button
                 onClick={form.chooseDirectory}
                 className={`inline-flex w-fit items-center gap-2 rounded border px-3 py-2 font-mono text-xs transition-colors ${
                   hasDirectory
                     ? "border-outline-variant bg-surface-container-low text-on-surface hover:border-outline"
                     : "border-error/40 bg-error/10 text-error hover:border-error"
                 }`}
               >
                 {hasDirectory ? (
                   <>
                     <FolderClosed className="size-4" strokeWidth={1.5} />
                     {form.directory}
                   </>
                 ) : (
                   <>
                     <FolderOpen className="size-4" strokeWidth={1.5} />
                     No folder selected
                   </>
                 )}
               </button>
             </div>

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
    </div>
  );
}
