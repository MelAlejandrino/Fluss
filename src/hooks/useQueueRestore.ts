import { useEffect } from "react";
import { restoreQueue } from "@/lib/downloadManager";

/// Bring back last session's unfinished downloads, once, at app start.
///
/// A playlist is not a thing you finish in one sitting: the connection drops,
/// the machine sleeps, the app is closed. Without this the queue is gone the
/// next morning and the only way back is pasting the link again — which is
/// exactly the work the queue existed to save.
export function useQueueRestore() {
  useEffect(() => {
    void restoreQueue();
  }, []);
}
