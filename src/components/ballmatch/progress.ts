// ============================================================================
// BingoBolla · Ball Match — Progreso de niveles (localStorage)
// ----------------------------------------------------------------------------
// Guarda la MEJOR puntuación de estrellas por nivel. Desbloqueo contiguo:
// el nivel N se desbloquea al completar el N-1. Migrable a Supabase más adelante.
// ============================================================================

const KEY = "bb_ballmatch_progress";
export const MAX_LEVELS = 30;

export type Progress = Record<number, number>; // nivel -> mejores estrellas (1..3)

export function loadProgress(): Progress {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as Progress;
  } catch {
    return {};
  }
}

/** Guarda estrellas si superan las previas. Devuelve el progreso actualizado. */
export function saveStars(level: number, stars: number): Progress {
  const p = loadProgress();
  if (!p[level] || stars > p[level]) {
    p[level] = stars;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(KEY, JSON.stringify(p));
      } catch {
        /* almacenamiento lleno o bloqueado */
      }
    }
  }
  return p;
}

/** Nivel más alto desbloqueado (1 + último nivel completado de forma contigua). */
export function maxUnlocked(p: Progress): number {
  let max = 1;
  for (let l = 1; l <= MAX_LEVELS; l++) {
    if (p[l]) max = Math.min(MAX_LEVELS, l + 1);
    else break;
  }
  return max;
}

export function totalStars(p: Progress): number {
  return Object.values(p).reduce((a, b) => a + b, 0);
}
