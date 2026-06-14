// ============================================================================
// BingoBolla · Ball Match — Diseño de niveles
// ----------------------------------------------------------------------------
// Dificultad creciente: más líneas objetivo, menos margen de movimientos,
// tableros un poco mayores y hielo a partir de cierto nivel. Determinista.
// ============================================================================

import type { ColorIndex, LevelConfig, Objective } from "./types";
import { COLORS } from "./types";
import { makeRng } from "./engine";

/** Genera un patrón de hielo reproducible para un nivel. */
function iceFor(level: number, size: number): [number, number][] {
  if (level < 4) return [];
  const rng = makeRng(level * 7919 + size);
  const count = Math.min(size, Math.floor((level - 3) * 1.5));
  const seen = new Set<string>();
  const ice: [number, number][] = [];
  let guard = 0;
  while (ice.length < count && guard++ < 200) {
    // hielo preferentemente en la mitad inferior central
    const r = Math.floor(rng() * size);
    const c = Math.floor(rng() * size);
    const k = `${r},${c}`;
    if (seen.has(k)) continue;
    seen.add(k);
    ice.push([r, c]);
  }
  return ice;
}

/** Devuelve la configuración de un nivel (1-indexado). Niveles altos se extrapolan. */
export function getLevel(level: number): LevelConfig {
  const lvl = Math.max(1, Math.floor(level) || 1);
  const size = lvl < 5 ? 7 : 8;
  const targetLines = Math.min(8, 1 + Math.floor((lvl - 1) / 2));
  // más líneas = más movimientos base, pero el margen se va ajustando
  const moves = Math.max(14, 26 - Math.floor(lvl / 2) + targetLines * 3);
  const ice = iceFor(lvl, size);

  // Variedad de objetivos: cada 5 niveles rompe-hielo (si hay), cada 3 recoge color.
  let objective: Objective;
  if (lvl >= 5 && lvl % 5 === 0 && ice.length > 0) {
    objective = { type: "ice" };
  } else if (lvl >= 3 && lvl % 3 === 0) {
    objective = { type: "collect", color: (lvl % COLORS) as ColorIndex, count: 16 + lvl };
  } else {
    objective = { type: "lines", count: targetLines };
  }

  return { level: lvl, size, moves, targetLines, objective, ice };
}

/** Semilla del tablero a partir del nivel (tableros reproducibles por nivel). */
export function seedFor(level: number): number {
  return (Math.max(1, Math.floor(level) || 1) * 2654435761) >>> 0;
}
