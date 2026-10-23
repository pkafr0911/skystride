/** Small synthesized cues: no downloads, decoding, or work on the physics tick. */
export class TraversalAudio {
  private context: AudioContext | null = null;
  private enabled = true;
  setEnabled(enabled: boolean) {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) void this.context?.suspend();
  }
  unlock = () => {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      void this.context.resume().catch(() => {});
    } catch {
      /* Audio is optional on unsupported browsers. */
    }
  };
  play(kind: string, strength: number, chain: number) {
    const ctx = this.context;
    if (!this.enabled || !ctx || ctx.state !== "running") return;
    const chime = kind === "chain" || kind === "clean";
    const count = kind === "chain" ? 3 : 1;
    for (let i = 0; i < count; i++) {
      const start = ctx.currentTime + i * 0.065;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = chime ? "sine" : "triangle";
      const frequency = chime
        ? 330 * Math.pow(2, ((chain % 5) + i * 4) / 12)
        : 110;
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(
        chime ? frequency * 1.02 : 38,
        start + 0.16,
      );
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(
        Math.min(0.08, 0.025 * strength),
        start + 0.008,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.22);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    }
  }
  dispose() {
    void this.context?.close().catch(() => {});
    this.context = null;
  }
}
