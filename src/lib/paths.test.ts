import { describe, it, expect } from "vitest";
import { folderName, joinPath } from "./paths";

describe("folderName", () => {
  it("keeps an ordinary title as it reads", () => {
    expect(folderName("Road Trip 2026")).toBe("Road Trip 2026");
  });

  it("cannot escape the folder it's placed in", () => {
    // The separators are what a traversal needs; without them this is a name.
    expect(folderName("../../Windows/System32")).toBe("Windows System32");
    expect(folderName("..")).toBe("Playlist");
  });

  it("drops characters Windows refuses, and trailing dots it silently eats", () => {
    expect(folderName('Best of: "Live" <2026>?')).toBe("Best of Live 2026");
    expect(folderName("Season 1.")).toBe("Season 1");
  });

  it("falls back rather than returning an empty segment", () => {
    expect(folderName("///")).toBe("Playlist");
    expect(folderName("   ")).toBe("Playlist");
  });

  it("caps the length so the filename under it still fits", () => {
    expect(folderName("x".repeat(200))).toHaveLength(80);
  });
});

describe("joinPath", () => {
  it("uses the separator the directory already uses", () => {
    expect(joinPath("C:\\Users\\me\\Videos", "Road Trip")).toBe("C:\\Users\\me\\Videos\\Road Trip");
    expect(joinPath("/home/me/Videos", "Road Trip")).toBe("/home/me/Videos/Road Trip");
  });

  it("stays POSIX for a folder whose name contains a backslash", () => {
    // A backslash is a legal filename character on Linux and macOS. Choosing
    // the separator by looking for one turned this into a single directory
    // named "My\\Videos\\Road Trip" instead of a folder inside "My\\Videos".
    expect(joinPath("/home/me/My\\Videos", "Road Trip")).toBe("/home/me/My\\Videos/Road Trip");
  });

  it("doesn't double up a trailing separator", () => {
    expect(joinPath("C:\\Videos\\", "Road Trip")).toBe("C:\\Videos\\Road Trip");
    expect(joinPath("/videos/", "Road Trip")).toBe("/videos/Road Trip");
  });
});
