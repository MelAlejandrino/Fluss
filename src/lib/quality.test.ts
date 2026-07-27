import { describe, it, expect } from "vitest";
import { qualityOptions } from "./quality";

describe("qualityOptions", () => {
  it("caps rungs at the video's max height", () => {
    expect(qualityOptions([2160, 1440, 1080, 720, 480, 360, 240, 144])).toEqual([
      "best",
      "2160p",
      "1440p",
      "1080p",
      "720p",
      "480p",
      "360p",
      "240p",
      "144p",
    ]);
    expect(qualityOptions([720, 480, 360, 240, 144])).toEqual([
      "best",
      "720p",
      "480p",
      "360p",
      "240p",
      "144p",
    ]);
  });

  it("falls back to the full ladder when heights are unknown", () => {
    expect(qualityOptions([])).toEqual([
      "best",
      "2160p",
      "1440p",
      "1080p",
      "720p",
      "480p",
      "360p",
      "240p",
      "144p",
    ]);
  });

  it("includes the lowest rungs on tiny videos", () => {
    expect(qualityOptions([240, 144])).toEqual(["best", "240p", "144p"]);
  });
});
