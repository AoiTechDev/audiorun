import { vi, type Mock } from "vitest";

export class FakeAudioNode {
  connect: Mock = vi.fn();
  disconnect: Mock = vi.fn();
}

export class FakeGainNode extends FakeAudioNode {
  gain = { value: 1 };
}

export class FakeAudioContext {
  static instances: FakeAudioContext[] = [];

  destination = new FakeAudioNode();
  state: string = "suspended"; // real browsers start here — play() tests will need it
  resume: Mock = vi.fn(async () => { this.state = "running"; });
  close: Mock = vi.fn(async () => { this.state = "closed"; });
  createMediaElementSource: Mock = vi.fn(() => new FakeAudioNode());
  createGain: Mock = vi.fn(() => new FakeGainNode());

  constructor() {
    FakeAudioContext.instances.push(this);
  }
}