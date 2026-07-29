import { describe, it, expect, vi, beforeEach } from "vitest";
import { useHistoryStore } from "./historyStore";
import { useToastStore } from "@/stores/toastStore";
import { api } from "@/lib/api";
import type { DownloadHistoryItem } from "@/types/download";

vi.mock("@/lib/api", () => ({
  api: { getHistory: vi.fn(), saveHistory: vi.fn(() => Promise.resolve()) },
}));

const item = (id: string): DownloadHistoryItem => ({
  id,
  title: `Video ${id}`,
  url: `https://example.com/${id}`,
  format: "mp4",
  outputDirectory: "/out",
  status: "completed",
  createdAt: "2026-07-29T00:00:00.000Z",
});

/// An entry already persisted on disk.
const itemOn = (id: string) => item(id);

/// `add`/`remove` fire the save without awaiting; let the chain drain.
const settle = () => new Promise((r) => setTimeout(r, 0));

describe("historyStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useHistoryStore.setState({ history: [], unreadable: false });
    useToastStore.setState({ toasts: [] });
  });

  it("loads and saves normally", async () => {
    vi.mocked(api.getHistory).mockResolvedValue([item("a")]);
    await useHistoryStore.getState().load();
    expect(useHistoryStore.getState().history).toHaveLength(1);

    useHistoryStore.getState().add(item("b"));
    await settle();
    expect(api.saveHistory).toHaveBeenCalledWith([item("b"), item("a")]);
  });

  it("a download recorded before the first read must not wipe the file", async () => {
    // Nothing loads history at startup, and `recordHistory` fires from the
    // download manager — so a user who downloads without opening the History
    // page has an empty in-memory list and a full file on disk.
    vi.mocked(api.getHistory).mockResolvedValue([itemOn("old1"), itemOn("old2")]);
    useHistoryStore.setState({ history: [], unreadable: false, loaded: false });

    useHistoryStore.getState().add(item("new"));
    await settle();
    // Never the one-item list that would replace the file.
    expect(api.saveHistory).not.toHaveBeenCalledWith([item("new")]);
  });

  it("recovers on its own if nothing loaded history at startup", async () => {
    // The `loaded` gate must not turn a missing init hook into history that
    // silently stops persisting. The first save reads the file, merges, saves.
    vi.mocked(api.getHistory).mockResolvedValue([itemOn("old1")]);
    useHistoryStore.setState({ history: [], unreadable: false, loaded: false });

    useHistoryStore.getState().add(item("new"));
    await settle();

    const ids = useHistoryStore.getState().history.map((h) => h.id);
    expect(ids).toEqual(expect.arrayContaining(["new", "old1"]));
    expect(api.saveHistory).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "new" }),
        expect.objectContaining({ id: "old1" }),
      ]),
    );
  });

  it("keeps an item recorded while the first read was still in flight", async () => {
    vi.mocked(api.getHistory).mockResolvedValue([itemOn("old1")]);
    useHistoryStore.setState({ history: [], unreadable: false, loaded: false });

    const loading = useHistoryStore.getState().load();
    useHistoryStore.getState().add(item("raced")); // finishes mid-read
    await loading;
    await settle();

    const ids = useHistoryStore.getState().history.map((h) => h.id);
    expect(ids).toContain("raced");
    expect(ids).toContain("old1");
    // ...and the merged list reaches disk, not just memory.
    expect(api.saveHistory).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "raced" })]),
    );
  });

  it("a missing file is not an error", async () => {
    // Rust returns [] for "nothing saved yet" — the common first run.
    vi.mocked(api.getHistory).mockResolvedValue([]);
    await useHistoryStore.getState().load();
    expect(useHistoryStore.getState().unreadable).toBe(false);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("never overwrites a damaged file", async () => {
    vi.mocked(api.getHistory).mockRejectedValue("expected value at line 1");
    await useHistoryStore.getState().load();
    expect(useHistoryStore.getState().unreadable).toBe(true);

    // This is the data-loss path: without the guard, `add` would write a
    // one-item list over the only record of everything downloaded.
    useHistoryStore.getState().add(item("new"));
    await settle();
    expect(api.saveHistory).not.toHaveBeenCalled();
    // ...but the download still shows in the UI for this session.
    expect(useHistoryStore.getState().history).toHaveLength(1);
  });

  it("warns once with a way out, and saves again after Start fresh", async () => {
    vi.mocked(api.getHistory).mockRejectedValue("bad json");
    await useHistoryStore.getState().load();

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].tone).toBe("error");
    const startFresh = toasts[0].actions?.find((a) => a.label === "Start fresh");
    expect(startFresh).toBeDefined();

    // HistoryPage calls load() on every visit — don't re-toast each time.
    await useHistoryStore.getState().load();
    expect(useToastStore.getState().toasts).toHaveLength(1);

    startFresh!.onClick!();
    expect(useHistoryStore.getState().unreadable).toBe(false);
    useHistoryStore.getState().add(item("c"));
    await settle();
    expect(api.saveHistory).toHaveBeenCalledOnce();
  });
});
