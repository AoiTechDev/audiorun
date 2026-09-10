import { PlaybackState } from "./types";

export class PlaybackEngine extends EventTarget {
  private audioElement: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private state: PlaybackState = "idle";

  constructor() {
    super();

    this.audioContext = new AudioContext();
    this.gainNode = new GainNode(this.audioContext, { gain: 0.5 });

    this.gainNode.connect(this.audioContext.destination);
  }
}
