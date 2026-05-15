export const COLS = ["B", "I", "N", "G", "O"] as const;
export const RANGES: Record<string, [number, number]> = {
  B: [1, 15],
  I: [16, 30],
  N: [31, 45],
  G: [46, 60],
  O: [61, 75],
};

export type CardCell = number | "FREE";
export type Card = CardCell[][];

export function generateCard(): Card {
  const card: Card = [[], [], [], [], []];
  for (let c = 0; c < 5; c++) {
    const [min, max] = RANGES[COLS[c]];
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

export interface Win {
  type: string;
  cells: [number, number][];
}

export function checkWin(card: Card, marked: Set<number>): Win | null {
  const isMarked = (r: number, c: number) =>
    card[r][c] === "FREE" || marked.has(card[r][c] as number);

  for (let r = 0; r < 5; r++) {
    if ([0, 1, 2, 3, 4].every((c) => isMarked(r, c))) {
      return { type: `Row ${r + 1}`, cells: [0, 1, 2, 3, 4].map((c) => [r, c]) };
    }
  }
  for (let c = 0; c < 5; c++) {
    if ([0, 1, 2, 3, 4].every((r) => isMarked(r, c))) {
      return { type: `${COLS[c]} column`, cells: [0, 1, 2, 3, 4].map((r) => [r, c]) };
    }
  }
  if ([0, 1, 2, 3, 4].every((i) => isMarked(i, i))) {
    return { type: "Diagonal", cells: [0, 1, 2, 3, 4].map((i) => [i, i]) };
  }
  if ([0, 1, 2, 3, 4].every((i) => isMarked(i, 4 - i))) {
    return { type: "Diagonal", cells: [0, 1, 2, 3, 4].map((i) => [i, 4 - i]) };
  }
  if (([[0, 0], [0, 4], [4, 0], [4, 4]] as [number, number][]).every(([r, c]) => isMarked(r, c))) {
    return { type: "Four corners", cells: [[0, 0], [0, 4], [4, 0], [4, 4]] };
  }
  return null;
}

export const ballLetter = (n: number) =>
  n <= 15 ? "B" : n <= 30 ? "I" : n <= 45 ? "N" : n <= 60 ? "G" : "O";

export const ballColor = (n: number) =>
  n <= 15 ? "#E74C3C" : n <= 30 ? "#D4A933" : n <= 45 ? "#0F4C3A" : n <= 60 ? "#8B4789" : "#2C7A7B";
