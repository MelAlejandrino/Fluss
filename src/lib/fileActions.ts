import { api } from "@/lib/api";
import { notify } from "@/lib/toast";

// Shared open/reveal used by both the Downloads and History views. The Rust
// command returns "missing" when the file is gone.
export async function openDownload(filePath?: string) {
  if (!filePath) {
    notify("No file location was recorded for this download.", "error");
    return;
  }
  try {
    await api.openFile(filePath);
  } catch (err) {
    notify(
      err === "missing" ? "This file was moved or deleted." : "Couldn't open this file.",
      "error",
    );
  }
}

export async function revealDownload(filePath?: string) {
  if (!filePath) {
    notify("No file location was recorded for this download.", "error");
    return;
  }
  try {
    await api.revealInFolder(filePath);
  } catch (err) {
    notify(
      err === "missing" ? "This file was moved or deleted." : "Couldn't open the folder.",
      "error",
    );
  }
}
