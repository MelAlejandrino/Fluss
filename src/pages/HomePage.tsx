import { ArrowDownToLine } from "lucide-react";
import { motion } from "motion/react";
import { UrlInput } from "@/components/media/UrlInput";
import { MediaPreview } from "@/components/media/MediaPreview";
import { FormatSelector } from "@/components/media/FormatSelector";
import { QualitySelector } from "@/components/media/QualitySelector";
import { DirectoryPicker } from "@/components/media/DirectoryPicker";
import { BulkUrlList } from "@/components/media/BulkUrlList";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useAnalyzeUrl } from "@/hooks/useAnalyzeUrl";
import { useDownloadForm } from "@/hooks/useDownloadForm";
import { useStartDownload } from "@/hooks/useStartDownload";
import { useStartBulkDownload } from "@/hooks/useStartBulkDownload";
import { useBulkUrls } from "@/hooks/useBulkUrls";
import { useDownloadMode, type DownloadMode } from "@/hooks/useDownloadMode";
import { DURATION, EASE, rise } from "@/lib/motion";

/**
 * Placeholder shaped like the preview that's coming, so the page doesn't jump
 * when metadata lands. A spinner alone would tell you nothing about how much
 * is about to appear.
 */
function AnalyzingPreview() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <Card padded={false} className="flex gap-5 overflow-hidden">
        <Skeleton className="aspect-video w-64 shrink-0 rounded-none max-lg:w-52" />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 py-5 pr-5">
          <Skeleton className="h-4 w-3/4 rounded-sm" />
          <Skeleton className="h-4 w-1/2 rounded-sm" />
          <Skeleton className="h-3 w-24 rounded-sm" />
        </div>
      </Card>
      <p className="flex items-center gap-2.5 pl-1 text-base text-ink-3">
        <Spinner className="size-4" />
        Analyzing…
      </p>
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

  // Only controls whether the orienting line under the field is worth showing.
  // It must never affect *position* — see the note on the container below.
  const idle = mode === "single" && !metadata && !isAnalyzing && !error;

  return (
    // Everything is anchored to the top, in every mode and every state.
    //
    // An earlier version centred the idle composition so Home wouldn't look
    // empty. It photographed well and was wrong to use: the mode switch lives
    // in the header, so flipping to Bulk re-flowed the page from centred to
    // top-aligned and yanked the header — and the toggle still under the
    // pointer — several hundred pixels north. A control must not move as a
    // result of being clicked, and the eye should not have to re-find the
    // heading it was already reading.
    //
    // The whitespace below an idle Home is the price, and it's the right price:
    // a stable frame is worth more than a balanced screenshot.
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-10 py-12 max-lg:px-7">
      <PageHeader
        title="What do you want to download?"
        description={
          mode === "single"
            ? "Paste a link and Fluss handles the rest."
            : "Queue several links under one set of options."
        }
        actions={
          <SegmentedControl<DownloadMode>
            name="mode"
            label="Download mode"
            itemRole="tab"
            value={mode}
            onChange={setMode}
            options={[
              { value: "single", label: "Single" },
              { value: "bulk", label: "Bulk" },
            ]}
          />
        }
      />

      {/* Keyed on mode so the workspace swaps in one motion rather than
          cross-fading two half-similar layouts.

          Opacity only, no travel: the header above this is fixed, so the new
          workspace should appear exactly where the old one was. Sliding it in
          would reintroduce the vertical movement the fixed header exists to
          avoid. */}
      <motion.div
        key={mode}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: DURATION.base, ease: EASE }}
        className="flex flex-col gap-6"
      >
        {mode === "single" ? (
          <>
            <UrlInput
              onSubmit={(url) => {
                form.setQuality("best");
                analyze(url);
              }}
              isLoading={isAnalyzing}
            />

            {/* One line of orientation while the page is otherwise bare. It
                says what happens next, which is the only thing anyone needs
                to know here — and it disappears the moment there's a result. */}
            {idle && (
              <p className="max-w-[62ch] pl-1 text-base leading-relaxed text-ink-3">
                Works with most video and audio sites. Nothing is written to disk until you've
                seen what Fluss found and picked a folder.
              </p>
            )}

            {error && (
              <motion.div variants={rise} initial="hidden" animate="show">
                <ErrorState message={error} details={details} onRetry={retry} />
              </motion.div>
            )}

            {isAnalyzing && <AnalyzingPreview />}

            {metadata && !isAnalyzing && (
              <motion.div
                variants={rise}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-5"
              >
                <MediaPreview metadata={metadata} />

                <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
                  <Card className="flex flex-col gap-5">
                    <FormatSelector value={form.format} onChange={form.setFormat} />
                    <QualitySelector
                      value={form.quality}
                      onChange={form.setQuality}
                      availableQualities={metadata.availableQualities}
                      disabled={form.format === "mp3"}
                    />
                  </Card>

                  <Card className="flex flex-col gap-5">
                    <DirectoryPicker directory={form.directory} onChoose={form.chooseDirectory} />
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleDownload}
                      disabled={!hasDirectory}
                      className="w-full"
                    >
                      <ArrowDownToLine />
                      Download
                    </Button>
                  </Card>
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
            <Card>
              <CardHeader
                title="Links"
                meta={`${bulk.validUrls.length} ready`}
              />
              <BulkUrlList
                urls={bulk.urls}
                onChange={bulk.updateUrl}
                onAdd={bulk.addUrl}
                onRemove={bulk.removeUrl}
              />
            </Card>

            <Card className="flex flex-col gap-5">
              <FormatSelector
                name="bulk-format"
                value={bulkForm.format}
                onChange={bulkForm.setFormat}
              />
              <QualitySelector
                name="bulk-quality"
                value={bulkForm.quality}
                onChange={bulkForm.setQuality}
                availableQualities={[]}
                disabled={bulkForm.format === "mp3"}
              />
              <DirectoryPicker
                directory={bulkForm.directory}
                onChoose={bulkForm.chooseDirectory}
              />
              <Button
                variant="primary"
                size="lg"
                onClick={handleBulkDownload}
                disabled={!bulk.validUrls.length}
                className="w-full"
              >
                <ArrowDownToLine />
                Download {bulk.validUrls.length} link{bulk.validUrls.length === 1 ? "" : "s"}
              </Button>
            </Card>
          </div>
        )}
      </motion.div>
    </div>
  );
}
