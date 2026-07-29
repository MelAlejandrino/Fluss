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
import { useTheme } from "@/hooks/useTheme";
import { useUpdateCheck } from "@/hooks/useUpdate";
import { useContextMenu } from "@/hooks/useContextMenu";
import { useNewDownloadShortcut } from "@/hooks/useNewDownloadShortcut";
import { useReloadShortcut } from "@/hooks/useReloadShortcut";
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
  useTheme();
  useUpdateCheck();
  useDownloadEvents();
  useContextMenu();
  useNewDownloadShortcut();
  useReloadShortcut();
  const pendingInterrupt = useUiStore((s) => s.pendingInterrupt);
  const setPendingInterrupt = useUiStore((s) => s.setPendingInterrupt);

  return (
    <div className="flex h-screen flex-col">
      <TitleBar onClose={() => requestInterrupt("quit")} />
      <div className="min-h-0 flex-1">
        <AppShell>
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              variants={pageTransition}
              initial="hidden"
              animate="show"
              exit="exit"
              className="h-full"
            >
              <Page />
            </motion.div>
          </AnimatePresence>
        </AppShell>
      </div>
      <Toaster />
      <ContextMenu />
      <ResizeHandles />
      {pendingInterrupt && (
        <ActiveDownloadsDialog
          action={pendingInterrupt}
          onClose={() => setPendingInterrupt(null)}
          onConfirm={() => performInterrupt(pendingInterrupt)}
        />
      )}
    </div>
  );
}

export default App;
