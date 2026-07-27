import { FolderClosed, ExternalLink, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Toggle } from "@/components/common/Toggle";
import { Segmented } from "@/components/common/Segmented";
import { useSettings } from "@/hooks/useSettings";
import type { Theme } from "@/types/settings";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-outline-variant py-6 first:border-t-0 first:pt-0">
      <h2 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
        {title}
      </h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-on-surface">{label}</p>
        {hint && <p className="text-xs text-on-surface-variant">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function SettingsPage() {
  const {
    settings,
    update,
    engine,
    appVersion,
    developer,
    repoUrl,
    chooseDefaultDirectory,
    openRepository,
    checkForUpdates,
  } = useSettings();

  return (
    <div className="mx-auto max-w-2xl px-8 py-10">
      <PageHeader title="Settings" />

      <Section title="General">
        <Row label="Default download location">
          <button
            onClick={chooseDefaultDirectory}
            className="inline-flex max-w-xs items-center gap-2 truncate rounded border border-outline-variant bg-surface-container-low px-3 py-1.5 font-mono text-xs text-on-surface hover:border-outline"
          >
            <FolderClosed className="size-4 shrink-0" strokeWidth={1.5} />
            <span className="truncate">{settings.defaultDownloadDirectory || "Choose…"}</span>
          </button>
        </Row>
        <Row label="Start downloads automatically">
          <Toggle
            label="Start downloads automatically"
            checked={settings.autoStartDownloads}
            onChange={(v) => update("autoStartDownloads", v)}
          />
        </Row>
        <Row label="Desktop notifications">
          <Toggle
            label="Desktop notifications"
            checked={settings.desktopNotifications}
            onChange={(v) => update("desktopNotifications", v)}
          />
        </Row>
      </Section>

      <Section title="Downloads">
        <Row label="Concurrent downloads" hint="One at a time in this version.">
          <span className="font-mono text-sm text-on-surface-variant">{settings.concurrentDownloads}</span>
        </Row>
        <Row label="Overwrite existing files">
          <Toggle
            label="Overwrite existing files"
            checked={settings.overwriteExisting}
            onChange={(v) => update("overwriteExisting", v)}
          />
        </Row>
        <Row label="Keep partial files">
          <Toggle
            label="Keep partial files"
            checked={settings.keepPartialFiles}
            onChange={(v) => update("keepPartialFiles", v)}
          />
        </Row>
      </Section>

      <Section title="Appearance">
        <Segmented<Theme>
          label="Theme"
          value={settings.theme}
          onChange={(v) => update("theme", v)}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </Section>

      <Section title="Engine">
        <Row label="yt-dlp">
          <span className="font-mono text-xs text-on-surface-variant">{engine.ytDlp}</span>
        </Row>
        <Row label="FFmpeg">
          <span className="font-mono text-xs text-on-surface-variant">{engine.ffmpeg}</span>
        </Row>
      </Section>

      <Section title="About">
        <Row label="Version">
          <span className="font-mono text-xs text-on-surface-variant">{appVersion || "—"}</span>
        </Row>
        <Row label="Developer">
          <span className="text-sm text-on-surface-variant">{developer}</span>
        </Row>
        <Row label="Repository">
          <button
            onClick={openRepository}
            className="inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:underline"
          >
            <ExternalLink className="size-4" strokeWidth={1.5} />
            {repoUrl.replace("https://", "")}
          </button>
        </Row>
        <button
          onClick={checkForUpdates}
          className="inline-flex w-fit items-center gap-2 rounded border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface hover:border-outline"
        >
          <RefreshCw className="size-4" strokeWidth={1.5} />
          Check for updates
        </button>
      </Section>
    </div>
  );
}
