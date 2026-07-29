import { describe, it, expect, beforeEach } from "vitest";
import { persist } from "./persist";
import { useToastStore } from "@/stores/toastStore";

const errors = () => useToastStore.getState().toasts.filter((t) => t.tone === "error");

describe("persist", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it("stays silent when the save succeeds", async () => {
    await persistAndSettle("settings", () => Promise.resolve());
    expect(errors()).toHaveLength(0);
  });

  it("warns once, then stays quiet until a save succeeds again", async () => {
    // A failed save is otherwise invisible — the UI already shows the change.
    await persistAndSettle("history", () => Promise.reject(new Error("disk full")));
    expect(errors()).toHaveLength(1);
    expect(errors()[0].message).toMatch(/couldn't save your history/i);

    // History saves fire on every completed download; a persistent problem
    // must not toast on each one.
    useToastStore.setState({ toasts: [] });
    await persistAndSettle("history", () => Promise.reject(new Error("disk full")));
    expect(errors()).toHaveLength(0);

    // Recovered — the next failure is news again.
    await persistAndSettle("history", () => Promise.resolve());
    await persistAndSettle("history", () => Promise.reject(new Error("disk full")));
    expect(errors()).toHaveLength(1);
  });

  it("tracks settings and history independently", async () => {
    await persistAndSettle("history", () => Promise.reject(new Error("x")));
    useToastStore.setState({ toasts: [] });
    // History is already muted, but settings has not warned yet.
    await persistAndSettle("settings", () => Promise.reject(new Error("x")));
    expect(errors()).toHaveLength(1);
    expect(errors()[0].message).toMatch(/couldn't save your settings/i);
  });

  it("runs same-key saves one at a time, in order", async () => {
    // Each save rewrites the whole file. Overlapping writes can finish out of
    // order and leave the older list on disk — a download missing after a
    // restart. The second save must not begin until the first has finished.
    const order: string[] = [];
    let releaseFirst!: () => void;
    const first = new Promise<void>((r) => (releaseFirst = r));

    persist("history", () => {
      order.push("first:start");
      return first.then(() => void order.push("first:done"));
    });
    persist("history", () => {
      order.push("second:start");
      return Promise.resolve();
    });

    await Promise.resolve();
    expect(order).toEqual(["first:start"]); // second is still waiting

    releaseFirst();
    await new Promise((r) => setTimeout(r, 0));
    expect(order).toEqual(["first:start", "first:done", "second:start"]);
  });

  it("starts an uncontended save synchronously, every time", async () => {
    // Not just the first one: a settled chain must be dropped, or every later
    // save waits a tick on a dead promise — and a save deferred past
    // `windowClose()` on quit may never run at all.
    for (let i = 0; i < 3; i++) {
      let started = false;
      persist("history", () => {
        started = true;
        return Promise.resolve();
      });
      expect(started, `save ${i} should not have been deferred`).toBe(true);
      await new Promise((r) => setTimeout(r, 0));
    }
  });

  it("a failed save does not stall the ones behind it", async () => {
    const order: string[] = [];
    persist("settings", () => {
      order.push("failed");
      return Promise.reject(new Error("locked"));
    });
    persist("settings", () => {
      order.push("after");
      return Promise.resolve();
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(order).toEqual(["failed", "after"]);
  });
});

/// `persist` is fire-and-forget by design, so nothing is returned to await.
async function persistAndSettle(
  what: "settings" | "history",
  save: () => Promise<unknown>,
) {
  persist(what, save);
  await new Promise((r) => setTimeout(r, 0));
}
