import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useNewDownloadShortcut } from "./useNewDownloadShortcut";
import { useUiStore } from "@/stores/uiStore";

function press(init: KeyboardEventInit) {
  const event = new KeyboardEvent("keydown", { key: "n", cancelable: true, ...init });
  window.dispatchEvent(event);
  return event;
}

describe("useNewDownloadShortcut", () => {
  beforeEach(() => {
    useUiStore.setState({ page: "settings" });
    renderHook(() => useNewDownloadShortcut());
  });

  it("goes Home on Ctrl+N and Cmd+N", () => {
    const event = press({ ctrlKey: true });
    expect(useUiStore.getState().page).toBe("home");
    expect(event.defaultPrevented).toBe(true); // else the webview opens a window

    useUiStore.setState({ page: "history" });
    press({ metaKey: true });
    expect(useUiStore.getState().page).toBe("home");
  });

  it("bumps the tick even when Home is already open", () => {
    // Home doesn't remount, so navigating alone would be a no-op — the tick is
    // what tells the URL field to clear and refocus.
    useUiStore.setState({ page: "home", newDownloadTick: 0 });
    press({ ctrlKey: true });
    expect(useUiStore.getState().newDownloadTick).toBe(1);
    press({ ctrlKey: true });
    expect(useUiStore.getState().newDownloadTick).toBe(2);
  });

  it("leaves OS and browser combos alone", () => {
    for (const init of [
      {}, // plain "n" — the user is typing
      { ctrlKey: true, shiftKey: true }, // incognito window
      { ctrlKey: true, altKey: true },
    ]) {
      useUiStore.setState({ page: "settings", newDownloadTick: 0 });
      const event = press(init);
      expect(useUiStore.getState().page).toBe("settings");
      expect(useUiStore.getState().newDownloadTick).toBe(0);
      expect(event.defaultPrevented).toBe(false);
    }
  });
});
