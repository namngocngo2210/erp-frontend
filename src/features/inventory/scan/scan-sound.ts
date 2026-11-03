let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

function tone(frequency: number, durationMs: number): void {
  const audio = getCtx();
  if (!audio) return;
  try {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = frequency;
    osc.type = "sine";
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(audio.destination);
    const now = audio.currentTime;
    osc.start(now);
    osc.stop(now + durationMs / 1000);
  } catch {
    // ignore — audio is best-effort feedback
  }
}

export function beepSuccess(): void {
  tone(880, 90);
}

export function beepError(): void {
  tone(220, 220);
}
