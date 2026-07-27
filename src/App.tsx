import { AnimatePresence, motion } from "motion/react";
import { AppShell } from "@/components/app-shell/AppShell";
import { TitleBar } from "@/components/app-shell/TitleBar";
import { ResizeHandles } from "@/components/app-shell/ResizeHandles";
import { Toaster } from "@/components/common/Toaster";
import { ConfirmQuitDialog } from "@/components/common/ConfirmQuitDialog";
import { HomePage } from "@/pages/HomePage";
import { DownloadsPage } from "@/pages/DownloadsPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { useUiStore } from "@/stores/uiStore";
import { useDownloadStore } from "@/stores/downloadStore";
import { useDownloadEvents } from "@/hooks/useDownloadEvents";
import { useSettingsInit } from "@/hooks/useSettings";
import { useTheme } from "@/hooks/useTheme";
import { useUpdateCheck } from "@/hooks/useUpdate";
import { api } from "@/lib/api";
import { pageTransition } from "@/lib/motion";
import { useCallback, useEffect, useState } from "react";

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
  useTheme();
  useUpdateCheck();
  useDownloadEvents();
  const [quitDialogOpen, setQuitDialogOpen] = useState(false);

  const handleClose = useCallback(() => {
    const downloads = useDownloadStore.getState().downloads;
    const hasActive = downloads.some(
      (d) => d.status === "downloading" || d.status === "processing",
    );
    if (hasActive) {
      setQuitDialogOpen(true);
      return;
    }
    api.windowClose();
  }, []);

  const handleQuit = useCallback(() => {
    api.forceCancelAll();
    setQuitDialogOpen(false);
    api.windowClose();
  }, []);

  const handleDismissQuit = useCallback(() => {
    setQuitDialogOpen(false);
  }, []);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      const downloads = useDownloadStore.getState().downloads;
      const hasActive = downloads.some(
        (d) => d.status === "downloading" || d.status === "processing",
      );
      if (hasActive) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  return (
    <div className="flex h-screen flex-col">
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
              className="h-full"
            >
              <Page />
            </motion.div>
          </AnimatePresence>
        </AppShell>
      </div>
      <Toaster />
      <ResizeHandles />
      {quitDialogOpen && (
        <ConfirmQuitDialog
          onClose={handleDismissQuit}
          onQuit={handleQuit}
        />
      )}
    </div>
  );
}

export default App;
