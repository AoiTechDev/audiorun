import { vi, beforeEach } from "vitest";
import { FakeAudioContext, FakeGainNode } from "./fakes";
beforeEach(() => {
  vi.stubGlobal("AudioContext", FakeAudioContext);
  vi.stubGlobal("GainNode", FakeGainNode);

  URL.createObjectURL = vi.fn(() => "blob:fake-url-" + Math.random());
  URL.revokeObjectURL = vi.fn();
});


Object.defineProperty(HTMLMediaElement.prototype, "src", {
  configurable: true,
  get() {
    return this.getAttribute("src") ?? "";
  },
  set(value: string) {
    this.setAttribute("src", value);
    if (!value) return;
    queueMicrotask(() => {
      this.dispatchEvent(
        new Event(value.includes("FAIL") ? "error" : "loadedmetadata"),
      );
    });
  },
});
