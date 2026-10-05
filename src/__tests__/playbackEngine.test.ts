import { describe, it, expect, vi } from "vitest";
import { PlaybackEngine } from "../core/playbackEngine";

describe("playbackEngine", () => {
  it("revokes the object URL it created when detaching", async () => {
    const engine = new PlaybackEngine();

    const pending = engine.attach(new Blob(["fake audio"]));

    engine["audioElement"]!.dispatchEvent(new Event("loadmetadata"));
    await pending;

    const createUrl = (URL.createObjectURL as any).mock.results[0].value;

    engine.detach();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(createUrl);
  });
});
