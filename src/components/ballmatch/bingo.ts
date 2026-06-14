// ============================================================================
// BingoBolla · Ball Match — Cartón BINGO (capa de objetivo)
// ----------------------------------------------------------------------------
// Cada color de bola (0..4) marca su columna del cartón (B..O). El centro es FREE.
// Completar líneas (filas, columnas, diagonales) es el objetivo del nivel.
// ============================================================================

import { COLORS } from "./types";

export type Card = boolean[][]; // 5x5, true = marcada
export const CARD_N = 5;
export const FREE: [number, number] = [2, 2];

export function createCard(): Card {
  const card: Card = Array.from({ length: CARD_N }, () => Array<boolean>(CARD_N).fill(false));
  card[FREE[0]][FREE[1]] = true; // centro libre
  return card;
}

/**
 * Marca en el cartón las bolas eliminadas por color. Cada bola del color `c`
 * marca la siguiente casilla libre de la columna `c` (de arriba a abajo).
 * Devuelve cuántas casillas nuevas se marcaron.
 */
export function markBalls(card: Card, clearedByColor: number[]): number {
  let marks = 0;
  for (let color = 0; color < COLORS; color++) {
    let remaining = clearedByColor[color] ?? 0;
    for (let row = 0; row < CARD_N && remaining > 0; row++) {
      if (!card[row][color]) {
        card[row][color] = true;
        marks++;
        remaining--;
      }
    }
  }
  return marks;
}

/** Devuelve el número total de líneas completas (filas + columnas + 2 diagonales). */
export function countLines(card: Card): number {
  let lines = 0;
  for (let r = 0; r < CARD_N; r++) if (card[r].every(Boolean)) lines++;
  for (let c = 0; c < CARD_N; c++) if (card.every((row) => row[c])) lines++;
  if (card.every((row, i) => row[i])) lines++;
  if (card.every((row, i) => row[CARD_N - 1 - i])) lines++;
  return lines;
}

/** ¿Está el cartón completamente lleno? */
export function isFullCard(card: Card): boolean {
  return card.every((row) => row.every(Boolean));
}

/**
 * Estrellas del nivel: 1 por cumplir el objetivo, +1 si se superan líneas,
 * +1 si se llena el cartón o sobran bastantes movimientos.
 */
export function computeStars(
  linesDone: number,
  targetLines: number,
  full: boolean,
  movesLeft: number
): 1 | 2 | 3 {
  if (full || linesDone >= targetLines + 2) return 3;
  if (linesDone >= targetLines + 1 || movesLeft >= 5) return 2;
  return 1;
}
