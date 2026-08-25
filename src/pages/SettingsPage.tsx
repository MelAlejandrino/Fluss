import { FolderClosed, ExternalLink, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Row } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useSettings } from "@/hooks/useSettings";
import type { Theme } from "@/types/settings";

/**
 * Settings as widgets rather than one long ruled list: each card is a topic,
 * the hairlines inside it separate rows *within* that topic, and the gaps
 * between cards do the work that section rules used to.
 *
 * Every row reads label-first with the control hard right, so the column of
 * switches lines up and the page can be scanned for "what's on" in one pass.
 */
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
    updateEngine,
    updatingEngine,
    checkForUpdates,
  } = useSettings();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-10 py-12 max-lg:px-7">
      <PageHeader title="Settings" description="Preferences are saved as you change them." />

      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader title="General" />
          <div className="flex flex-col">
            <Row label="Default download location">
              <Button
                size="sm"
                onClick={chooseDefaultDirectory}
                className="max-w-[16rem] font-mono"
              >
                <FolderClosed />
                <span className="truncate">
                  {settings.defaultDownloadDirectory || "Choose…"}
                </span>
              </Button>
            </Row>
            <Row label="Start downloads automatically">
              <Switch
                label="Start downloads automatically"
                checked={settings.autoStartDownloads}
                onChange={(v) => update("autoStartDownloads", v)}
              />
            </Row>
            <Row label="Desktop notifications">
              <Switch
                label="Desktop notifications"
                checked={settings.desktopNotifications}
                onChange={(v) => update("desktopNotifications", v)}
              />
            </Row>
            <Row
              label="Minimize to system tray"
              hint="Keep Fluss running in the background when you close the window."
            >
              <Switch
                label="Minimize to system tray"
                checked={settings.minimizeToTray}
                onChange={(v) => update("minimizeToTray", v)}
              />
            </Row>
            <Row
              label="Clipboard monitoring"
              hint="Watch for copied media URLs and offer to download them."
            >
              <Switch
                label="Clipboard monitoring"
                checked={settings.clipboardMonitoring}
                onChange={(v) => update("clipboardMonitoring", v)}
              />
            </Row>
          </div>
        </Card>

        <Card>
          <CardHeader title="Downloads" />
          <div className="flex flex-col">
            <Row label="Concurrent downloads" hint="One at a time in this version.">
              <span className="font-mono text-base tabular-nums text-ink-2">
                {settings.concurrentDownloads}
              </span>
            </Row>
            <Row label="Overwrite existing files">
              <Switch
                label="Overwrite existing files"
                checked={settings.overwriteExisting}
                onChange={(v) => update("overwriteExisting", v)}
              />
            </Row>
            <Row
              label="Keep partial files"
              hint="Lets an interrupted download pick up where it stopped instead of starting over — including a playlist you come back to the next day."
            >
              <Switch
                label="Keep partial files"
                checked={settings.keepPartialFiles}
                onChange={(v) => update("keepPartialFiles", v)}
              />
            </Row>
          </div>
        </Card>

        <Card>
          <CardHeader title="Appearance" />
          <div className="flex flex-col">
            <Row label="Theme" hint="System follows your desktop's light or dark setting.">
              <SegmentedControl<Theme>
                name="theme"
                label="Theme"
                value={settings.theme}
                onChange={(v) => update("theme", v)}
                size="sm"
                options={[
                  { value: "system", label: "System" },
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                ]}
              />
            </Row>
          </div>
        </Card>

        <Card>
          <CardHeader title="Engine" meta="yt-dlp + FFmpeg" />
          <div className="flex flex-col">
            <Row
              label="Use my browser sign-in"
              hint="Turn this on if a site says it can't verify you. Fluss uses the browser you're already signed in with."
            >
              <Switch
                label="Use my browser sign-in"
                checked={settings.useBrowserCookies}
                onChange={(v) => update("useBrowserCookies", v)}
              />
            </Row>
            <Row label="yt-dlp">
              <span data-selectable className="font-mono text-sm text-ink-3">
                {engine.ytDlp}
              </span>
            </Row>
            <Row label="FFmpeg">
              <span data-selectable className="font-mono text-sm text-ink-3">
                {engine.ffmpeg}
              </span>
            </Row>
          </div>
          <div className="mt-5 flex flex-col gap-2.5 rounded-lg bg-inset p-4">
            <p className="text-sm leading-relaxed text-ink-2">
              Try this first if downloads stop working — sites change often, and a newer engine
              is usually the fix.
            </p>
            <Button size="sm" onClick={updateEngine} loading={updatingEngine} className="w-fit">
              {!updatingEngine && <RefreshCw />}
              {updatingEngine ? "Updating engine…" : "Update engine"}
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="About" />
          <div className="flex flex-col">
            <Row label="Version">
              <span className="font-mono text-sm tabular-nums text-ink-3">
                {appVersion || "—"}
              </span>
            </Row>
            <Row label="Developer">
              <span className="text-base text-ink-3">{developer}</span>
            </Row>
            <Row label="Repository">
              <Button variant="ghost" size="sm" onClick={openRepository} className="font-mono">
                <ExternalLink />
                {repoUrl.replace("https://", "")}
              </Button>
            </Row>
          </div>
          <Button size="sm" onClick={checkForUpdates} className="mt-5 w-fit">
            <RefreshCw />
            Check for updates
          </Button>
        </Card>
      </div>
    </div>
  );
}
