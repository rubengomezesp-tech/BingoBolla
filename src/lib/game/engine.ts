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
  to_line: number;
  to_two_lines: number;
  to_full_house: number;
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

// ============ STATUS CHECK (75 + 90 unified) ============
export function checkCardStatus(card: Card, called: Set<number>): CardStatus {
  const rows = card.length;
  const cols = card[0]?.length ?? 0;
  const isBingo90 = rows === 3 && cols === 9;

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
  let twoLines = false;
  let linesComplete = 0;
  let minToLine = Infinity;
  let secondMinToLine = Infinity;

  if (isBingo90) {
    // Bingo 90: count rows with all numbers marked
    const rowMissing: number[] = [];
    for (let r = 0; r < rows; r++) {
      let rowTotal = 0, missing = 0;
      for (let c = 0; c < cols; c++) {
        if (card[r][c] != null) {
          rowTotal++;
          if (!marked[r][c]) missing++;
        }
      }
      if (rowTotal > 0) {
        if (missing === 0) linesComplete++;
        rowMissing.push(missing);
      }
    }
    // min and second-min for to_line / to_two_lines
    rowMissing.sort((a, b) => a - b);
    minToLine = rowMissing[0] ?? Infinity;
    secondMinToLine = (rowMissing[0] ?? 0) + (rowMissing[1] ?? Infinity);
    line = linesComplete >= 1;
    twoLines = linesComplete >= 2;
  } else {
    // BingoBolla 75 follows the server engine: a paid line is one completed row.
    for (let r = 0; r < 5; r++) {
      let missing = 0;
      for (let c = 0; c < 5; c++) if (!marked[r][c]) missing++;
      if (missing === 0) line = true;
      if (missing < minToLine) minToLine = missing;
    }
    secondMinToLine = Infinity;  // 75 doesn't use two_lines
  }

  return {
    line,
    two_lines: twoLines,
    full_house: markedCount >= total,
    to_line: isFinite(minToLine) ? minToLine : 0,
    to_two_lines: isFinite(secondMinToLine) ? secondMinToLine : 999,
    to_full_house: total - markedCount,
    marked_count: markedCount,
    total,
  };
}

// ============ HELPERS ============
export const ballLetter = (n: number) =>
  n <= 15 ? "B" : n <= 30 ? "I" : n <= 45 ? "N" : n <= 60 ? "G" : "O";

export const ballClass = (n: number) =>
  n <= 15 ? "bb-ball--b" : n <= 30 ? "bb-ball--i" : n <= 45 ? "bb-ball--n" : n <= 60 ? "bb-ball--g" : "bb-ball--o";

// Bingo 90 ball: color by column (column = floor((n-1)/10), col 0 = 1-9)
export const ball90Class = (n: number) => {
  if (n <= 9) return "bb-ball--b";
  if (n <= 19) return "bb-ball--i";
  if (n <= 29) return "bb-ball--n";
  if (n <= 39) return "bb-ball--g";
  if (n <= 49) return "bb-ball--o";
  if (n <= 59) return "bb-ball--b";
  if (n <= 69) return "bb-ball--i";
  if (n <= 79) return "bb-ball--n";
  return "bb-ball--g";  // 80-90
};

// Compatibility
export const COLS = COLS_75;
export const RANGES = RANGES_75;
export const generateCard = generateCard75;
export const ballColor = (n: number) =>
  n <= 15 ? "#FF3D7F" : n <= 30 ? "#FFD93D" : n <= 45 ? "#00E5FF" : n <= 60 ? "#B388FF" : "#00E676";
