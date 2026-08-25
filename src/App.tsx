import { AnimatePresence, motion } from "motion/react";
import { AppShell } from "@/components/app-shell/AppShell";
import { TitleBar } from "@/components/app-shell/TitleBar";
import { ResizeHandles } from "@/components/app-shell/ResizeHandles";
import { Toaster } from "@/components/common/Toaster";
import { ContextMenu } from "@/components/common/ContextMenu";
import { ActiveDownloadsDialog } from "@/components/common/ActiveDownloadsDialog";
import { HomePage } from "@/pages/HomePage";
import { DownloadsPage } from "@/pages/DownloadsPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { useUiStore } from "@/stores/uiStore";
import { useDownloadEvents } from "@/hooks/useDownloadEvents";
import { useSettingsInit } from "@/hooks/useSettings";
import { useHistoryInit } from "@/hooks/useHistory";
import { useQueueRestore } from "@/hooks/useQueueRestore";
import { useTheme } from "@/hooks/useTheme";
import { useUpdateCheck } from "@/hooks/useUpdate";
import { useContextMenu } from "@/hooks/useContextMenu";
import { useNewDownloadShortcut } from "@/hooks/useNewDownloadShortcut";
import { useReloadShortcut } from "@/hooks/useReloadShortcut";
import { useQuitShortcut } from "@/hooks/useQuitShortcut";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTray } from "@/hooks/useTray";
import { useClipboardMonitor } from "@/hooks/useClipboardMonitor";
import { api } from "@/lib/api";
import { requestInterrupt, performInterrupt } from "@/lib/interrupt";
import { pageTransition } from "@/lib/motion";

const PAGES = {
  home: HomePage,
  downloads: DownloadsPage,
  history: HistoryPage,
  settings: SettingsPage,
};

function App() {
  const page = useUiStore((s) => s.page);
  const Page = PAGES[page];
  useSettingsInit();
  useHistoryInit();
  useQueueRestore();
  useTheme();
  useUpdateCheck();
  useDownloadEvents();
  useContextMenu();
  useNewDownloadShortcut();
  useReloadShortcut();
  useQuitShortcut();
  useTray();
  useClipboardMonitor();
  const pendingInterrupt = useUiStore((s) => s.pendingInterrupt);
  const setPendingInterrupt = useUiStore((s) => s.setPendingInterrupt);
  const minimizeToTray = useSettingsStore((s) => s.settings.minimizeToTray);

  // X button: when minimize-to-tray is on, just close — Rust hides it.
  // When off, go through the interrupt flow so the active-download dialog can appear.
  const handleClose = minimizeToTray
    ? () => api.windowClose()
    : () => requestInterrupt("quit");

  return (
    <div className="flex h-screen flex-col bg-app text-ink">
      <TitleBar onClose={handleClose} />
      <div className="min-h-0 flex-1">
        <AppShell>
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              variants={pageTransition}
              initial="hidden"
              animate="show"
              exit="exit"
              // Flex column at full sheet height so a page can stretch its own
              // content box (Home centres its idle state against it).
              className="flex min-h-full flex-col"
            >
              <Page />
            </motion.div>
          </AnimatePresence>
        </AppShell>
      </div>
      <Toaster />
      <ContextMenu />
      <ResizeHandles />
      <AnimatePresence>
        {pendingInterrupt && (
          <ActiveDownloadsDialog
            action={pendingInterrupt}
            onClose={() => setPendingInterrupt(null)}
            onConfirm={() => performInterrupt(pendingInterrupt)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
