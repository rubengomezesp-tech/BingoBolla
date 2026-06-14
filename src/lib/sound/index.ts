"use client";

// ============================================================================
// BingoBolla — Motor de sonido (Web Audio sintetizado, sin archivos externos)
// ============================================================================

let ctx: AudioContext | null = null;
let enabled = true;
// El AudioContext SOLO puede instanciarse tras un gesto del usuario.
// PWARegister llama initAudio() en el primer pointerdown/keydown/touchstart.
// Hasta entonces, getCtx() devuelve null y los sonidos quedan en silencio.
let gestureUnlocked = false;

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
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// Inicializa el audio en el primer gesto del usuario (requerido por navegadores)
export function initAudio() {
  gestureUnlocked = true;
  const c = getCtx();
  if (c && c.state === "suspended") c.resume();
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  if (typeof window !== "undefined") {
    try { localStorage.setItem("bb_sound", on ? "1" : "0"); } catch {}
  }
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = localStorage.getItem("bb_sound");
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.15, delay = 0) {
  if (!enabled || !isSoundEnabled()) return;
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function sweep(f1: number, f2: number, dur: number, vol = 0.15, delay = 0) {
  if (!enabled || !isSoundEnabled()) return;
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(f1, t);
  osc.frequency.exponentialRampToValueAtTime(f2, t + dur);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// ============ SONIDOS DEL JUEGO ============

export const sounds = {
  // Click suave de botón
  click() {
    tone(600, 0.06, "triangle", 0.08);
  },

  // Bola cantada en bingo (pop ascendente)
  ball() {
    tone(440, 0.08, "sine", 0.12);
    tone(660, 0.1, "sine", 0.1, 0.05);
  },

  // Estás a 1 número (1TG) — alerta sutil
  oneToGo() {
    tone(880, 0.12, "triangle", 0.12);
    tone(1100, 0.12, "triangle", 0.1, 0.1);
  },

  // ¡Línea! — fanfarria corta
  line() {
    tone(523, 0.12, "square", 0.12);
    tone(659, 0.12, "square", 0.12, 0.12);
    tone(784, 0.2, "square", 0.14, 0.24);
  },

  // ¡BINGO! — fanfarria grande
  bingo() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => tone(f, 0.25, "square", 0.16, i * 0.12));
    sweep(400, 1200, 0.5, 0.1, 0.5);
    tone(1047, 0.4, "square", 0.16, 0.6);
  },

  // Compra exitosa
  purchase() {
    tone(700, 0.1, "sine", 0.12);
    tone(900, 0.12, "sine", 0.12, 0.08);
    tone(1100, 0.15, "sine", 0.14, 0.16);
  },

  // Giro de slot (arranque)
  slotSpin() {
    sweep(200, 600, 0.3, 0.08);
  },

  // Rodillo de slot se detiene
  slotStop() {
    tone(300, 0.06, "square", 0.1);
  },

  // Win de slot
  slotWin() {
    [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.18, "triangle", 0.14, i * 0.08));
  },

  // Big win / jackpot
  bigWin() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, "square", 0.16, i * 0.1));
    sweep(300, 1500, 0.8, 0.12, 0.5);
  },

  // Bonus diario reclamado
  bonus() {
    tone(784, 0.12, "sine", 0.14);
    tone(988, 0.12, "sine", 0.14, 0.1);
    tone(1319, 0.25, "sine", 0.16, 0.2);
  },

  // Error / acción no permitida
  error() {
    tone(200, 0.15, "sawtooth", 0.1);
    tone(150, 0.2, "sawtooth", 0.1, 0.12);
  },

  // ===== Match-3 (Ball Match) =====
  // Intercambio de fichas
  swap() {
    tone(520, 0.05, "triangle", 0.08);
  },
  // Pop de bolas: sube de tono con la profundidad de cascada (semitonos)
  pop(depth = 0) {
    const base = 440 * Math.pow(2, Math.min(depth, 10) / 12);
    tone(base, 0.07, "sine", 0.11);
    tone(base * 1.5, 0.06, "sine", 0.07, 0.03);
  },
  // Especial creado / detonado
  special() {
    sweep(300, 1100, 0.18, 0.12);
    tone(1320, 0.1, "square", 0.1, 0.06);
  },
  // Entra modo fever / combo
  fever() {
    sweep(500, 1400, 0.4, 0.12);
    [784, 988, 1319].forEach((f, i) => tone(f, 0.16, "square", 0.12, i * 0.08));
  },
  // Derrota (sin movimientos)
  lose() {
    [440, 349, 262].forEach((f, i) => tone(f, 0.22, "sawtooth", 0.1, i * 0.12));
  },
};

// ============================================================================
// Compatibilidad con la antigua lib/sounds (bingo). Mismo nombre de funciones,
// ahora con un único AudioContext y un único estado de mute (bb_sound).
// ============================================================================
export const isMuted = () => !isSoundEnabled();
export function setMuted(m: boolean) {
  setSoundEnabled(!m);
}

export function playBallCalled(ballNumber: number) {
  const base = 440 + (ballNumber / 75) * 220; // bolas altas = tono más agudo
  tone(base, 0.18, "sine", 0.12);
  tone(base * 1.5, 0.12, "sine", 0.08, 0.08);
}

export function playOneToGo() {
  tone(660, 0.08, "square", 0.1);
  tone(880, 0.12, "square", 0.1, 0.09);
}

export function playWin() {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.3, "triangle", 0.18, i * 0.1));
  tone(1046.5, 0.5, "sine", 0.15, 0.45);
}

export function playClick() {
  tone(800, 0.04, "sine", 0.08);
}

export function playPurchase() {
  tone(440, 0.1, "sine", 0.12);
  tone(660, 0.15, "sine", 0.12, 0.08);
}

export function playGameStart() {
  for (let i = 0; i < 6; i++) tone(200 - i * 10, 0.05, "square", 0.06, i * 0.06);
  tone(800, 0.3, "sine", 0.15, 0.38);
}

export function playJackpot() {
  sweep(220, 1760, 0.6, 0.12);
  [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) =>
    tone(f, 0.35, "square", 0.16, 0.5 + i * 0.12)
  );
  for (let i = 0; i < 12; i++) tone(1800 + Math.random() * 800, 0.1, "sine", 0.07, 1.2 + i * 0.07);
  tone(1046.5, 0.7, "triangle", 0.2, 1.3);
}

export function playWinnerAnnounce() {
  tone(659.25, 0.15, "triangle", 0.14);
  tone(880, 0.15, "triangle", 0.14, 0.12);
  tone(1046.5, 0.25, "triangle", 0.16, 0.24);
}
