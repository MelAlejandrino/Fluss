/// Whether we're running on macOS.
///
/// Read from the webview's user agent rather than through `@tauri-apps/plugin-os`:
/// every webview Tauri uses names its platform there, and a plugin would mean a
/// Rust dependency, a `.plugin()` line and a capability entry to answer a
/// question the page can already answer synchronously — which matters, because
/// this decides the first paint of the title bar.
export const isMacOS = /Mac OS X|Macintosh/i.test(
  typeof navigator === "undefined" ? "" : navigator.userAgent,
);
