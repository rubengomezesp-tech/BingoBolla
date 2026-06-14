// ============================================================================
// BingoBolla · Ball Match — Tipos del motor (match-3 "Candy Crush" con cartón BINGO)
// ----------------------------------------------------------------------------
// Las 5 bolas BINGO son los colores de marca: B/I/N/G/O = magenta/oro/cyan/violeta/esmeralda.
// El índice de color (0..4) coincide con la columna del cartón (B=0 ... O=4).
// ============================================================================

/** Letras BINGO en orden de columna. El índice = color. */
export const LETTERS = ["B", "I", "N", "G", "O"] as const;
export type ColorIndex = 0 | 1 | 2 | 3 | 4;
export const COLORS = 5;

/** Fichas especiales tipo Candy Crush. */
export type Special =
  | "none"
  | "striped-h" // limpia toda la fila al activarse
  | "striped-v" // limpia toda la columna al activarse
  | "wrapped" // explota un 3x3 a su alrededor
  | "bomb"; // bomba de color (arcoíris): limpia todas las bolas de un color

/** Una celda del tablero. `null` representa un hueco vacío transitorio. */
export interface Cell {
  /** id estable para que la UI anime la misma ficha cuando cae/se mueve. */
  id: number;
  color: ColorIndex;
  special: Special;
  /** Capas de hielo que bloquean la celda (0 = sin hielo). */
  ice: number;
}

export type Board = (Cell | null)[][];

export interface Coord {
  r: number;
  c: number;
}

/** Objetivo del nivel (qué hay que lograr para ganar). */
export type Objective =
  | { type: "lines"; count: number } // completar N líneas del cartón BINGO
  | { type: "collect"; color: ColorIndex; count: number } // recoger N bolas de un color
  | { type: "ice" }; // romper todo el hielo del tablero

/** Configuración de un nivel. Los colores son siempre 5 (las bolas BINGO). */
export interface LevelConfig {
  level: number;
  /** Tamaño del tablero NxN. */
  size: number;
  /** Movimientos disponibles. */
  moves: number;
  /** Líneas del cartón BINGO a completar (objetivo por defecto). */
  targetLines: number;
  /** Objetivo concreto del nivel. */
  objective: Objective;
  /** Celdas con hielo: [fila, columna]. */
  ice: [number, number][];
}

/**
 * Un "paso" de resolución que la UI reproduce con animación.
 * Cada cascada produce un paso: qué se limpió, qué especiales nacieron/estallaron,
 * qué cayó, qué apareció y el tablero resultante.
 */
export interface CascadeStep {
  /** Celdas que formaron match directo (animación de "pop"). */
  matched: Coord[];
  /** Todas las celdas eliminadas en este paso (matches + efectos de especiales). */
  cleared: Coord[];
  /** Especiales creados en este paso (posición + tipo + color). */
  created: { pos: Coord; special: Special; color: ColorIndex }[];
  /** Especiales que se dispararon (para FX de explosión). */
  triggered: { pos: Coord; special: Special }[];
  /** Celdas a las que se les quitó una capa de hielo. */
  iceHit: Coord[];
  /** Tablero tras aplicar gravedad + relleno de este paso. */
  board: Board;
  /** Puntos ganados en este paso. */
  score: number;
  /** Conteo de bolas eliminadas por color (para marcar el cartón). */
  clearedByColor: number[];
}

export interface ResolveResult {
  steps: CascadeStep[];
  totalScore: number;
  /** Bolas eliminadas por color en toda la resolución (suma de pasos). */
  clearedByColor: number[];
}
