import { api, type ResizeDir } from "@/lib/api";

// Thin wrappers so components stay out of the Tauri API directly.
export const minimizeWindow = () => api.windowMinimize();
export const toggleMaximizeWindow = () => api.windowToggleMaximize();
export const closeWindow = () => api.windowClose();
export const startResize = (dir: ResizeDir) => api.startResizeDragging(dir);
