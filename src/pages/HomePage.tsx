import { useState } from "react";
import { ArrowRight, Download, FolderClosed, FolderOpen, Loader2, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MediaPreview } from "@/components/media/MediaPreview";
import { FormatSelector } from "@/components/media/FormatSelector";
import { QualitySelector } from "@/components/media/QualitySelector";
import { BulkUrlList } from "@/components/media/BulkUrlList";
import { ErrorState } from "@/components/common/ErrorState";
import { useAnalyzeUrl } from "@/hooks/useAnalyzeUrl";
import { useDownloadForm } from "@/hooks/useDownloadForm";
import { useStartDownload } from "@/hooks/useStartDownload";
import { useStartBulkDownload } from "@/hooks/useStartBulkDownload";
import { useBulkUrls } from "@/hooks/useBulkUrls";
import { useDownloadMode, type DownloadMode } from "@/hooks/useDownloadMode";
import { useUrlInput } from "@/hooks/useUrlInput";
import { EASE } from "@/lib/motion";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

const stagger = {
  hidden: { opacity: 1 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

/* ── Command Bar ─────────────────────────────────────────────────────── */

function CommandBar({
  onSubmit,
  isLoading,
}: {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}) {
  const { url, setUrl, submit, inputRef } = useUrlInput(onSubmit);
  const [emptyError, setEmptyError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setEmptyError(true);
      return;
    }
    setEmptyError(false);
    submit();
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="flex items-stretch overflow-hidden rounded-sm border border-outline-variant bg-surface-container-lowest transition-colors focus-within:border-primary"
      >
        <div className="flex flex-1 items-center gap-3 px-4">
          <Search className="size-4 shrink-0 text-on-surface-variant/50" strokeWidth={1.5} />
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setEmptyError(false);
            }}
            placeholder="Paste a video or audio URL…"
            autoFocus
            className="w-full bg-transparent py-3.5 font-mono text-sm text-on-surface outline-none placeholder:text-on-surface-variant/40"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 border-l border-outline-variant bg-surface-container-low px-6 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
          ) : (
            <ArrowRight className="size-4" strokeWidth={1.5} />
          )}
          Analyze
        </button>
      </form>
      {emptyError && (
        <p className="mt-2 text-sm text-error">Enter a URL to analyze.</p>
      )}
    </div>
  );
}

/* ── Mode Tabs ───────────────────────────────────────────────────────── */

function ModeTabs({
  mode,
  onChange,
}: {
  mode: DownloadMode;
  onChange: (mode: DownloadMode) => void;
}) {
  const modes: { value: DownloadMode; label: string }[] = [
    { value: "single", label: "Single" },
    { value: "bulk", label: "Bulk" },
  ];

  return (
    <div role="tablist" aria-label="Download mode" className="flex gap-1">
      {modes.map(({ value, label }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(value)}
            className={`rounded-sm px-4 py-1.5 text-sm transition-colors ${
              active
                ? "bg-primary font-medium text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Directory Picker ────────────────────────────────────────────────── */

function DirectoryPicker({
  directory,
  hasDirectory,
  onChoose,
}: {
  directory: string;
  hasDirectory: boolean;
  onChoose: () => void;
}) {
  // Extract the last path segment as the folder name for the button.
  const folderName = hasDirectory ? directory.split(/[/\\]/).pop() ?? directory : null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
        Save to
      </span>
      <div className="flex flex-col gap-1.5">
        <button
          onClick={onChoose}
          className={`inline-flex w-fit max-w-full items-center gap-2.5 rounded-sm border px-3.5 py-2.5 font-mono text-xs transition-colors ${
            hasDirectory
              ? "border-outline-variant bg-surface-container-lowest text-on-surface hover:border-outline"
              : "border-error/40 bg-error/10 text-error hover:border-error"
          }`}
        >
          {hasDirectory ? (
            <>
              <FolderClosed className="size-4 shrink-0" strokeWidth={1.5} />
              <span className="truncate">{folderName}</span>
            </>
          ) : (
            <>
              <FolderOpen className="size-4 shrink-0" strokeWidth={1.5} />
              No folder selected
            </>
          )}
        </button>
        {hasDirectory && (
          <span className="max-w-full truncate font-mono text-[11px] text-on-surface-variant/60" title={directory}>
            {directory}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

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
    <div className="mx-auto flex min-h-full max-w-4xl flex-col px-8 py-16">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="mb-10 flex items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="font-display text-[2.75rem] font-semibold leading-[1.1] tracking-tight text-on-surface"
          >
            What do you want
            <br />
            to download?
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15, ease: EASE }}
            className="text-sm text-on-surface-variant"
          >
            {mode === "single"
              ? "Paste a link and Fluss handles the rest."
              : "Queue multiple links with shared options."}
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <ModeTabs mode={mode} onChange={setMode} />
        </motion.div>
      </div>

      {/* ── Command Bar (single mode only) ─────────────────────────── */}
      {mode === "single" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: EASE }}
          className="mb-8"
        >
          <CommandBar
            onSubmit={(url) => {
              form.setQuality("best");
              analyze(url);
            }}
            isLoading={isAnalyzing}
          />
        </motion.div>
      )}

      {/* ── Single Mode ────────────────────────────────────────────── */}
      {mode === "single" && (
        <>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="mb-6"
            >
              <ErrorState message={error} details={details} onRetry={retry} />
            </motion.div>
          )}

          {isAnalyzing && (
            <div className="flex items-center justify-center gap-3 py-20 text-sm text-on-surface-variant">
              <div className="size-5 rounded-full border-2 border-outline-variant border-t-primary animate-spin" />
              Analyzing…
            </div>
          )}

          <AnimatePresence mode="wait">
            {metadata && !isAnalyzing && (
              <motion.div
                key="results"
                variants={stagger}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-6"
              >
                {/* Preview */}
                <motion.div variants={fadeUp}>
                  <MediaPreview metadata={metadata} />
                </motion.div>

                {/* Options + Download */}
                <motion.div
                  variants={fadeUp}
                  className="grid gap-6 lg:grid-cols-[1fr_220px]"
                >
                  <div className="flex flex-col gap-5">
                    <FormatSelector value={form.format} onChange={form.setFormat} />
                    <QualitySelector
                      value={form.quality}
                      onChange={form.setQuality}
                      availableQualities={metadata.availableQualities}
                      disabled={form.format === "mp3"}
                    />
                  </div>

                  <div className="flex flex-col gap-5 border-t border-outline-variant pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
                    <DirectoryPicker
                      directory={form.directory}
                      hasDirectory={hasDirectory}
                      onChoose={form.chooseDirectory}
                    />

                    <button
                      onClick={handleDownload}
                      disabled={!hasDirectory}
                      className="inline-flex w-full items-center justify-center gap-2.5 rounded-sm bg-primary px-6 py-3 text-sm font-medium tracking-wide text-on-primary transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Download className="size-4" strokeWidth={1.5} />
                      Download
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ── Bulk Mode ──────────────────────────────────────────────── */}
      {mode === "bulk" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]"
        >
          <div className="flex flex-col gap-3 rounded-sm border border-outline-variant bg-surface-container-lowest p-5">
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

          <div className="flex flex-col gap-5 border-t border-outline-variant pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
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
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-sm bg-primary px-6 py-3 text-sm font-medium tracking-wide text-on-primary transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="size-4" strokeWidth={1.5} />
              Download {bulk.validUrls.length} link{bulk.validUrls.length === 1 ? "" : "s"}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
