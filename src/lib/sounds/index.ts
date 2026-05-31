// Web Audio sound effects — zero external files
// Lazy-loaded, respects user gesture requirement, mutable via localStorage

let ctx: AudioContext | null = null;
let muted = false;
// AudioContext solo se crea tras gesto del usuario para evitar el warning
// "AudioContext was not allowed to start" en navegadores modernos.
let gestureUnlocked = false;

if (typeof window !== "undefined") {
  muted = localStorage.getItem("bb_muted") === "1";
}

/** Llamado desde PWARegister tras el primer gesto del usuario. */
export function unlockAudio() {
  gestureUnlocked = true;
  const c = getCtx();
  if (c && c.state === "suspended") c.resume();
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!gestureUnlocked) return null;
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

export function playJackpot() {
  // Epic jackpot: rising sweep + fanfare + sparkle cascade
  const c = getCtx();
  if (!c || muted) return;
  // Rising sweep
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1760, c.currentTime + 0.6);
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(0.12, c.currentTime + 0.05);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.7);
  osc.connect(g).connect(c.destination);
  osc.start(); osc.stop(c.currentTime + 0.75);
  // Fanfare C-E-G-C-E-G (epic)
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
  notes.forEach((f, i) => setTimeout(() => tone(f, 0.35, "square", 0.16), 500 + i * 120));
  // Sparkle cascade
  for (let i = 0; i < 12; i++) {
    setTimeout(() => tone(1800 + Math.random() * 800, 0.1, "sine", 0.07), 1200 + i * 70);
  }
  // Big final hit
  setTimeout(() => tone(1046.5, 0.7, "triangle", 0.2), 1300);
}

export function playWinnerAnnounce() {
  // Short celebratory chime for line/bingo winner announcement
  tone(659.25, 0.15, "triangle", 0.14);
  setTimeout(() => tone(880, 0.15, "triangle", 0.14), 120);
  setTimeout(() => tone(1046.5, 0.25, "triangle", 0.16), 240);
}
