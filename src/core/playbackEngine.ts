import { PlaybackState } from "./types";

export class PlaybackEngine extends EventTarget {
  private audioElement: HTMLAudioElement | null = null; // actual player, loads file and does play/pause
  private audioContext: AudioContext; //mixing room of the web audio api. All cables lives here
  private sourceNode: MediaElementAudioSourceNode | null = null; // cable plug that takes the sound out of the <audio> element and into the mixing room
  private gainNode: GainNode; //volume knob

  private state: PlaybackState = "idle";
  private objectUrl: string | null = null;

  // signal chain <audio> -> sourceNode -> gainNode -> speakers
  // audioContext.destination - speakers

  constructor() {
    // gainNode -> speakers
    // it creates the mixing room, the volume knob and wires the knob to the speakers
    super();
    this.audioContext = new AudioContext();
    this.gainNode = new GainNode(this.audioContext, { gain: 0.5 });
    this.gainNode.connect(this.audioContext.destination);
  }

  async attach(source: string | Blob): Promise<void> {
    this.detach();
    this.state = "loading";
    const audio = document.createElement("audio");
    this.audioElement = audio;
    audio.crossOrigin = "anonymous";
    let url: string;
    if (typeof source === "string") {
      url = source;
      this.objectUrl = null;
    } else {
      url = URL.createObjectURL(source);
      this.objectUrl = url;
    }

    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        if (this.audioElement === audio) this.state = "error";
        reject(new Error("Failed to attach."));
      };
      const cleanup = () => {
        audio.removeEventListener("loadedmetadata", onLoaded);
        audio.removeEventListener("error", onError);
      };

      audio.addEventListener("loadedmetadata", onLoaded);
      audio.addEventListener("error", onError);
      audio.src = url;
    });

    if (this.audioElement !== audio) return;

    this.sourceNode = this.audioContext.createMediaElementSource(
      this.audioElement,
    );
    this.sourceNode.connect(this.gainNode);

    this.state = "ready";
  }

  detach(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = "";
      this.audioElement = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect(this.gainNode);
      this.sourceNode = null;
    }

    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
    this.state = "idle";
  }

  async play(): Promise<void> {
    if (this.audioElement === null || this.sourceNode === null)
      throw new Error("There's nothing to play.");

    const audioElementLocal: HTMLAudioElement = this.audioElement;

    try {
      if (this.audioContext.state === "suspended")
        await this.audioContext.resume();

      if (audioElementLocal !== this.audioElement) return;

      await audioElementLocal.play();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      throw err;
    }

    if (audioElementLocal !== this.audioElement) return;

    this.state = "playing";
  }

  pause(): void {
    if (this.audioElement === null || this.sourceNode === null)
      throw new Error("There's nothing to pause.");

    this.audioElement.pause();

    this.state = "paused";
  }

  stop(): void {
    if (this.audioElement === null || this.sourceNode === null)
      throw new Error("There's nothing to stop.");

    this.audioElement.pause();
    this.audioElement.currentTime = 0;

    this.state = "ready";
  }
}
