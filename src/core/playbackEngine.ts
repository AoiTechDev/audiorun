import { PlaybackState } from "./types";

const DEFAULT_VOLUME = 0.5;

export class PlaybackEngine extends EventTarget {
  private audioElement: HTMLAudioElement | null = null; // actual player, loads file and does play/pause
  private audioContext: AudioContext; //mixing room of the web audio api. All cables lives here
  private sourceNode: MediaElementAudioSourceNode | null = null; // cable plug that takes the sound out of the <audio> element and into the mixing room
  private gainNode: GainNode; //volume knob

  private state: PlaybackState = "idle";
  private objectUrl: string | null = null;

  private volume: number = DEFAULT_VOLUME;
  private muted: boolean = false;

  private getReadyAudioElement(): HTMLAudioElement | null {
    if (this.sourceNode === null || this.audioElement === null) return null;
    return this.audioElement;
  }

  private setState(state: PlaybackState): void {
    if (this.state === state) return;
    this.state = state;
  }
  // signal chain <audio> -> sourceNode -> gainNode -> speakers
  // audioContext.destination - speakers

  constructor() {
    // gainNode -> speakers
    // it creates the mixing room, the volume knob and wires the knob to the speakers
    super();
    this.audioContext = new AudioContext();
    this.gainNode = new GainNode(this.audioContext, { gain: DEFAULT_VOLUME });
    this.gainNode.connect(this.audioContext.destination);
  }

  async attach(source: string | Blob): Promise<void> {
    this.detach();
    this.setState("loading");
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
        if (this.audioElement === audio) this.setState("error");
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

    this.setState("ready");
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
    this.setState("idle");
  }

  async play(): Promise<void> {
    const audioElement = this.getReadyAudioElement();
    if (!audioElement) throw new Error("There's nothing to play.");

    try {
      if (this.audioContext.state === "suspended")
        await this.audioContext.resume();

      if (audioElement !== this.audioElement) return;

      await audioElement.play();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      throw err;
    }

    if (audioElement !== this.audioElement) return;

    this.setState("playing");
  }

  pause(): void {
    const audioElement = this.getReadyAudioElement();
    if (!audioElement) throw new Error("There's nothing to pause.");

    audioElement.pause();

    this.setState("paused");
  }

  stop(): void {
    const audioElement = this.getReadyAudioElement();
    if (!audioElement) throw new Error("There's nothing to stop.");

    audioElement.pause();
    audioElement.currentTime = 0;

    this.setState("ready");
  }

  getVolume(): number {
    return this.volume;
  }

  setVolume(value: number): void {
    if (!Number.isFinite(value) || value < 0 || value > 1)
      throw new RangeError(`Value should be between 0 and 1 and got ${value}`);

    this.muted = false;
    this.volume = value;
    this.gainNode.gain.value = value;
  }

  mute(): void {
    this.muted = true;
    this.gainNode.gain.value = 0;
  }

  unmute(): void {
    this.muted = false;
    this.gainNode.gain.value = this.volume;
  }

  isMuted(): boolean {
    return this.muted;
  }

  getCurrentTime(): number {
    const audioElement = this.getReadyAudioElement();
    if (!audioElement) return 0;
    return audioElement.currentTime;
  }

  getDuration(): number {
    const audioElement = this.getReadyAudioElement();
    if (!audioElement) return 0;
    return audioElement.duration;
  }

  seek(value: number): void {
    const audioElement = this.getReadyAudioElement();
    if (!audioElement) throw new Error("There's no track attached");
    if (!Number.isFinite(audioElement.duration))
      throw new Error("Duration can't be infinite, livestream not supported");
    if (!Number.isFinite(value) || value < 0 || value > audioElement.duration)
      throw new RangeError(
        `Seek value need to be between 0 and duration of the track ${audioElement.duration} but got ${value}`,
      );

    audioElement.currentTime = value;
  }
}
