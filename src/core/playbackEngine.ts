import { PlaybackState } from "./types";

export class PlaybackEngine extends EventTarget {
  private audioElement: HTMLAudioElement | null = null;
  private audioContext: AudioContext;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode;
  private state: PlaybackState = "idle";
  private objectUrl: string | Blob | null = null;
  constructor() {
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
      audio.addEventListener("loadedmetadata", () => resolve(), { once: true });
      audio.addEventListener(
        "error",
        () => {
          this.state = "error";
          reject(new Error("Failed to attach"));
        },
        {
          once: true,
        },
      );
      audio.src = url;
    });

    this.sourceNode = this.audioContext.createMediaElementSource(
      this.audioElement,
    );
    this.sourceNode.connect(this.gainNode);

    this.state = "ready";
  }

  detach(): void {}
}
