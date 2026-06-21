// Procedural Web Audio Synthesizer for SOLS-Runner

class AudioSynth {
  private ctx: AudioContext | null = null;
  private masterVolume: GainNode | null = null;
  private droneOscId: any = null;
  private droneGain: GainNode | null = null;
  private unlockPromise: Promise<boolean> | null = null;
  public isMuted: boolean = false;

  private initCtx() {
    if (this.ctx) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
        this.masterVolume = this.ctx.createGain();
        this.masterVolume.gain.setValueAtTime(0.35, this.ctx.currentTime);
        this.masterVolume.connect(this.ctx.destination);
      }
    } catch (e) {
      console.warn("Web Audio API is not supported in this environment", e);
    }
  }

  public async resume() {
    this.initCtx();
    if (this.ctx && this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch (e) {
        console.warn("Unable to resume Web Audio context", e);
      }
    }

    return this.ctx?.state === "running";
  }

  public unlock() {
    this.unlockPromise = this.resume();
    return this.unlockPromise;
  }

  private playWhenReady(play: () => void) {
    if (this.isMuted) return;
    this.resume().then((isReady) => {
      if (!isReady || this.isMuted || !this.ctx || !this.masterVolume) return;
      play();
    });
  }

  public playClick() {
    this.playWhenReady(() => {
      if (!this.ctx || !this.masterVolume) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(350, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.1);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

      osc.connect(gain);
      gain.connect(this.masterVolume);

      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  public playCrystalChime(puzzleIndex: number) {
    this.playWhenReady(() => {
      if (!this.ctx || !this.masterVolume) return;

      const t = this.ctx.currentTime;
      // Play an elegant sparkling triad reflecting the restore state
      const freqs = puzzleIndex === 0
        ? [523.25, 659.25, 783.99] // C5 major
        : puzzleIndex === 1
          ? [587.33, 739.99, 880.00] // D5 major
          : [659.25, 830.61, 987.77]; // E5 major (bright scale progression)

      freqs.forEach((freq, idx) => {
        if (!this.ctx || !this.masterVolume) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, t + idx * 0.08);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + idx * 0.08 + 0.4);

        gain.gain.setValueAtTime(0.12, t + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.8);

        osc.connect(gain);
        gain.connect(this.masterVolume);

        osc.start(t + idx * 0.08);
        osc.stop(t + idx * 0.08 + 0.85);
      });
    });
  }

  public playSuccessSound() {
    this.playWhenReady(() => {
      if (!this.ctx || !this.masterVolume) return;

      const t = this.ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Arpeggiated C-chord climb
      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.masterVolume) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t + idx * 0.06);

        gain.gain.setValueAtTime(0.1, t + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 1.2);

        osc.connect(gain);
        gain.connect(this.masterVolume);

        osc.start(t + idx * 0.06);
        osc.stop(t + idx * 0.06 + 1.3);
      });
    });
  }

  public playFailureSound() {
    this.playWhenReady(() => {
      if (!this.ctx || !this.masterVolume) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.linearRampToValueAtTime(140, t + 0.3);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

      osc.connect(gain);
      gain.connect(this.masterVolume);

      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  public startBackgroundDrone(intensity: number) {
    this.playWhenReady(() => {
      if (!this.ctx || !this.masterVolume) return;

      if (this.droneOscId) {
        this.updateDrone(intensity);
        return;
      }

      const t = this.ctx.currentTime;
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.setValueAtTime(0.08, t);

      const osc1 = this.ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(110 + intensity * 50, t); // shifts base hum higher as colors return

      osc1.connect(this.droneGain);
      this.droneGain.connect(this.masterVolume);

      osc1.start(t);
      this.droneOscId = { osc1 };
    });
  }

  public updateDrone(intensity: number) {
    if (!this.ctx || !this.droneOscId) return;
    const t = this.ctx.currentTime;
    const targetFreq = 110 + intensity * 55; // Up to 165Hz as color returns
    this.droneOscId.osc1.frequency.exponentialRampToValueAtTime(targetFreq, t + 1.5);
  }

  public stopDrone() {
    if (!this.droneOscId) return;
    try {
      this.droneOscId.osc1.stop();
    } catch (e) {}
    this.droneOscId = null;
    this.droneGain = null;
  }
}

export const synth = new AudioSynth();
