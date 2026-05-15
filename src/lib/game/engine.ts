export const COLS_75 = ["B", "I", "N", "G", "O"] as const;
export const RANGES_75: Record<string, [number, number]> = {
  B: [1, 15], I: [16, 30], N: [31, 45], G: [46, 60], O: [61, 75],
};

export type CardCell = number | "FREE" | null;
export type Card = CardCell[][];
export type Variant = "bingo75" | "bingo90" | "lite" | "cinco" | "pulse";
export type Pattern = "line" | "two_lines" | "full_house";

export interface CardStatus {
  line: boolean;
  two_lines: boolean;
  full_house: boolean;
  to_line: number;       // numbers needed to complete a line
  to_full_house: number; // numbers needed to complete card
  marked_count: number;
  total: number;
}

// ============ GENERATORS ============
export function generateCard75(): Card {
  const card: Card = [[], [], [], [], []];
  for (let c = 0; c < 5; c++) {
    const [min, max] = RANGES_75[COLS_75[c]];
    const pool = Array.from({ length: max - min + 1 }, (_, i) => i + min);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const col: CardCell[] = pool.slice(0, 5);
    if (c === 2) col[2] = "FREE";
    for (let r = 0; r < 5; r++) card[r][c] = col[r];
  }
  return card;
}

// ============ STATUS CHECK (client mirror of SQL function) ============
export function checkCardStatus(card: Card, called: Set<number>): CardStatus {
  const rows = card.length;
  const cols = card[0]?.length ?? 0;
  const marked: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  let markedCount = 0;
  let total = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = card[r][c];
      if (v == null) continue;
      total++;
      if (v === "FREE" || called.has(v as number)) {
        marked[r][c] = true;
        markedCount++;
      }
    }
  }

  let line = false;
  let twoLines = 0;
  let minToLine = Infinity;

  if (rows === 5 && cols === 5) {
    // Bingo 75: rows, cols, diagonals
    for (let r = 0; r < 5; r++) {
      let missing = 0;
      for (let c = 0; c < 5; c++) if (!marked[r][c]) missing++;
      if (missing === 0) line = true;
      if (missing < minToLine) minToLine = missing;
    }
    for (let c = 0; c < 5; c++) {
      let missing = 0;
      for (let r = 0; r < 5; r++) if (!marked[r][c]) missing++;
      if (missing === 0) line = true;
      if (missing < minToLine) minToLine = missing;
    }
    {
      let m1 = 0, m2 = 0;
      for (let i = 0; i < 5; i++) {
        if (!marked[i][i]) m1++;
        if (!marked[i][4 - i]) m2++;
      }
      if (m1 === 0) line = true;
      if (m2 === 0) line = true;
      if (m1 < minToLine) minToLine = m1;
      if (m2 < minToLine) minToLine = m2;
    }
  } else {
    // Bingo 90 — line = complete row
    for (let r = 0; r < rows; r++) {
      let rowTotal = 0, missing = 0;
      for (let c = 0; c < cols; c++) {
        if (card[r][c] != null) {
          rowTotal++;
          if (!marked[r][c]) missing++;
        }
      }
      if (rowTotal > 0) {
        if (missing === 0) twoLines++;
        if (missing < minToLine) minToLine = missing;
      }
    }
    if (twoLines >= 1) line = true;
  }

  return {
    line,
    two_lines: twoLines >= 2,
    full_house: markedCount >= total,
    to_line: isFinite(minToLine) ? minToLine : 0,
    to_full_house: total - markedCount,
    marked_count: markedCount,
    total,
  };
}

// ============ BALL DISPLAY HELPERS ============
export const ballLetter = (n: number) =>
  n <= 15 ? "B" : n <= 30 ? "I" : n <= 45 ? "N" : n <= 60 ? "G" : "O";

export const ballClass = (n: number) =>
  n <= 15 ? "bb-ball--b" : n <= 30 ? "bb-ball--i" : n <= 45 ? "bb-ball--n" : n <= 60 ? "bb-ball--g" : "bb-ball--o";

// Compatibility export for existing imports
export const COLS = COLS_75;
export const RANGES = RANGES_75;
export const generateCard = generateCard75;

// For RoomClient backward compat
export const ballColor = (n: number) =>
  n <= 15 ? "#FF3D7F" : n <= 30 ? "#FFD93D" : n <= 45 ? "#00E5FF" : n <= 60 ? "#B388FF" : "#00E676";
