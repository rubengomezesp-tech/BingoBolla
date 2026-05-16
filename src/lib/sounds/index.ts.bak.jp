// Web Audio sound effects — zero external files
// Lazy-loaded, respects user gesture requirement, mutable via localStorage

let ctx: AudioContext | null = null;
let muted = false;

if (typeof window !== "undefined") {
  muted = localStorage.getItem("bb_muted") === "1";
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return ctx;
}

export function setMuted(m: boolean) {
  muted = m;
  if (typeof window !== "undefined") localStorage.setItem("bb_muted", m ? "1" : "0");
}
export function isMuted() { return muted; }

function tone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.15, attack = 0.005, decay = 0.05) {
  const c = getCtx();
  if (!c || muted) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  gain.gain.setValueAtTime(0, c.currentTime);
  gain.gain.linearRampToValueAtTime(volume, c.currentTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration + 0.05);
}

// ============ EFFECTS ============

export function playBallCalled(ballNumber: number) {
  // Pitch varies with ball — high balls = high pitch
  const baseFreq = 440 + (ballNumber / 75) * 220;
  tone(baseFreq, 0.18, "sine", 0.12);
  setTimeout(() => tone(baseFreq * 1.5, 0.12, "sine", 0.08), 80);
}

export function playOneToGo() {
  // Tense rising blip
  tone(660, 0.08, "square", 0.1);
  setTimeout(() => tone(880, 0.12, "square", 0.1), 90);
}

export function playWin() {
  // Triumphant arpeggio C-E-G-C
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => {
    setTimeout(() => tone(f, 0.3, "triangle", 0.18), i * 100);
  });
  setTimeout(() => tone(1046.5, 0.5, "sine", 0.15), 450);
}

export function playClick() {
  tone(800, 0.04, "sine", 0.08);
}

export function playPurchase() {
  tone(440, 0.1, "sine", 0.12);
  setTimeout(() => tone(660, 0.15, "sine", 0.12), 80);
}

export function playGameStart() {
  // Drum roll into chime
  for (let i = 0; i < 6; i++) {
    setTimeout(() => tone(200 - i * 10, 0.05, "square", 0.06), i * 60);
  }
  setTimeout(() => tone(800, 0.3, "sine", 0.15), 380);
}
