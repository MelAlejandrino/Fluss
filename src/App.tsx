import { AnimatePresence, motion } from "motion/react";
import { AppShell } from "@/components/app-shell/AppShell";
import { TitleBar } from "@/components/app-shell/TitleBar";
import { ResizeHandles } from "@/components/app-shell/ResizeHandles";
import { Toaster } from "@/components/common/Toaster";
import { HomePage } from "@/pages/HomePage";
import { DownloadsPage } from "@/pages/DownloadsPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { useUiStore } from "@/stores/uiStore";
import { useDownloadEvents } from "@/hooks/useDownloadEvents";
import { useSettingsInit } from "@/hooks/useSettings";
import { useTheme } from "@/hooks/useTheme";
import { useUpdateCheck } from "@/hooks/useUpdate";
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
  useTheme();
  useUpdateCheck();
  useDownloadEvents();

  return (
    <div className="flex h-screen flex-col">
      <TitleBar />
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
    </div>
  );
}

export default App;
