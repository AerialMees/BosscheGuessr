const ENABLED_KEY = "boschguessr.sound.enabled";
const VOLUME_KEY = "boschguessr.sound.volume";
const DEFAULT_VOLUME = 0.25;

type Wave = OscillatorType;

class SoundManager {
  private context?: AudioContext;
  private masterGain?: GainNode;
  private lastHoverAt = 0;
  enabled = readStorage(ENABLED_KEY) !== "false";
  volume = readVolume();

  constructor() {
    this.installResumeHooks();
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    writeStorage(ENABLED_KEY, String(enabled));
    if (enabled) void this.unlock();
  }

  setVolume(volume: number) {
    this.volume = clampVolume(volume);
    writeStorage(VOLUME_KEY, String(this.volume));
    this.masterGain?.gain.setTargetAtTime(this.volume, this.context?.currentTime ?? 0, 0.01);
  }

  async unlock() {
    try {
      this.ensureContext();
      const context = this.context;
      if (context?.state === "suspended") await context.resume();
    } catch {
      // Audio is optional; gameplay should stay silent rather than fail.
    }
  }

  playClick() { this.tone(280, 0.035, "square", 0.45); }
  playHover() {
    const now = performance.now();
    if (now - this.lastHoverAt < 90) return;
    this.lastHoverAt = now;
    this.tone(520, 0.025, "sine", 0.16);
  }
  playStartGame() { this.sequence([[220, 0], [330, 0.08], [520, 0.16], [740, 0.24]], "square", 0.12); }
  playRoundStart() { this.sequence([[440, 0], [660, 0.07]], "triangle", 0.09); }
  playGuessPlaced() { this.tone(620, 0.045, "sine", 0.24); }
  playSubmitGuess() { this.sequence([[300, 0], [460, 0.05]], "square", 0.08); }
  playGoodScore() { this.sequence([[420, 0], [640, 0.08], [840, 0.16]], "triangle", 0.12); }
  playBadScore() { this.sequence([[220, 0], [160, 0.12]], "sawtooth", 0.12); }
  playPerfectScore() { this.sequence([[520, 0], [780, 0.07], [1040, 0.14], [1320, 0.22]], "square", 0.1); }
  playGameOver() { this.sequence([[520, 0], [390, 0.12], [650, 0.24], [260, 0.38]], "triangle", 0.13); }
  playTimerTick() { this.tone(760, 0.035, "square", 0.18); }
  playTimerWarning() { this.sequence([[880, 0], [440, 0.055]], "square", 0.06); }

  private tone(frequency: number, duration: number, wave: Wave, gainScale: number) {
    if (!this.enabled || this.volume <= 0) return;
    void this.playTone(frequency, duration, wave, gainScale);
  }

  private async playTone(frequency: number, duration: number, wave: Wave, gainScale: number) {
    try {
      await this.unlock();
      if (!this.context || !this.masterGain || this.context.state !== "running") return;
      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainScale), now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain);
      gain.connect(this.masterGain);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.015);
      oscillator.addEventListener("ended", () => {
        oscillator.disconnect();
        gain.disconnect();
      });
    } catch {
      // Keep sound best-effort. A failed beep should never interrupt the game.
    }
  }

  private sequence(notes: Array<[number, number]>, wave: Wave, duration: number) {
    if (!this.enabled || this.volume <= 0) return;
    for (const [frequency, delay] of notes) {
      window.setTimeout(() => this.tone(frequency, duration, wave, 0.34), delay * 1000);
    }
  }

  private ensureContext() {
    if (typeof window === "undefined") return;
    const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextCtor) return;
    if (!this.context || this.context.state === "closed") {
      this.context = new AudioContextCtor();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.context.destination);
    }
  }

  private installResumeHooks() {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const resume = () => {
      if (this.enabled) void this.unlock();
    };
    window.addEventListener("pointerdown", resume, { passive: true });
    window.addEventListener("keydown", resume);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") resume();
    });
  }
}

export const sound = new SoundManager();

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Sound settings are optional.
  }
}

function readVolume(): number {
  const stored = Number(readStorage(VOLUME_KEY));
  return clampVolume(Number.isFinite(stored) ? stored : DEFAULT_VOLUME);
}

export function clampVolume(volume: number): number {
  if (!Number.isFinite(volume)) return DEFAULT_VOLUME;
  return Math.min(1, Math.max(0, volume));
}
