// ============================================================================
// BingoBolla · Ball Match — Motor puro (sin React/DOM, testeable)
// ----------------------------------------------------------------------------
// Responsabilidades:
//  - Crear tablero sin matches iniciales.
//  - Validar e intercambiar fichas (swap), incluyendo activación de especiales.
//  - Resolver cascadas: detectar matches -> crear especiales -> disparar especiales
//    -> aplicar gravedad -> rellenar, en bucle hasta estabilizar, emitiendo pasos.
// ============================================================================

import type {
  Board,
  Cell,
  ColorIndex,
  Coord,
  CascadeStep,
  LevelConfig,
  ResolveResult,
  Special,
} from "./types";
import { COLORS } from "./types";

// ---------------------------------------------------------------------------
// RNG determinista (mulberry32) — mismos niveles/tests reproducibles.
// ---------------------------------------------------------------------------
export type Rng = () => number;
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Generador de ids estables por ficha.
// ---------------------------------------------------------------------------
export function makeIdGen(start = 1): () => number {
  let n = start;
  return () => n++;
}

const SCORE_TILE = 60;
const SCORE_LINE = 500;

const inBounds = (b: Board, r: number, c: number) =>
  r >= 0 && c >= 0 && r < b.length && c < b[0].length;

export function areAdjacent(a: Coord, b: Coord): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

export function cloneBoard(b: Board): Board {
  return b.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function randColor(rng: Rng): ColorIndex {
  return Math.floor(rng() * COLORS) as ColorIndex;
}

// ---------------------------------------------------------------------------
// Creación de tablero sin matches iniciales (evita 3 en línea con vecinos ya puestos).
// ---------------------------------------------------------------------------
export function createBoard(cfg: LevelConfig, rng: Rng, nextId: () => number): Board {
  const n = cfg.size;
  const board: Board = Array.from({ length: n }, () => Array<Cell | null>(n).fill(null));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      let color = randColor(rng);
      let guard = 0;
      while (
        guard++ < 20 &&
        ((c >= 2 && board[r][c - 1]?.color === color && board[r][c - 2]?.color === color) ||
          (r >= 2 && board[r - 1][c]?.color === color && board[r - 2][c]?.color === color))
      ) {
        color = randColor(rng);
      }
      board[r][c] = { id: nextId(), color, special: "none", ice: 0 };
    }
  }
  for (const [r, c] of cfg.ice) {
    if (inBounds(board, r, c) && board[r][c]) board[r][c]!.ice = 1;
  }
  return board;
}

// ---------------------------------------------------------------------------
// Detección de runs (3+ en línea) de fichas con color (los bombs no matchean por color).
// ---------------------------------------------------------------------------
interface Run {
  cells: Coord[];
  dir: "h" | "v";
  color: ColorIndex;
}

function colorable(cell: Cell | null): cell is Cell {
  return !!cell && cell.special !== "bomb" && cell.ice === 0;
}

function findRuns(b: Board): Run[] {
  const n = b.length;
  const runs: Run[] = [];
  // Horizontales
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      const cell = b[r][c];
      if (!colorable(cell)) {
        c++;
        continue;
      }
      let end = c + 1;
      while (end < n && b[r][end] && colorable(b[r][end]) && b[r][end]!.color === cell.color) end++;
      if (end - c >= 3) {
        const cells: Coord[] = [];
        for (let k = c; k < end; k++) cells.push({ r, c: k });
        runs.push({ cells, dir: "h", color: cell.color });
      }
      c = end;
    }
  }
  // Verticales
  for (let c = 0; c < n; c++) {
    let r = 0;
    while (r < n) {
      const cell = b[r][c];
      if (!colorable(cell)) {
        r++;
        continue;
      }
      let end = r + 1;
      while (end < n && b[end][c] && colorable(b[end][c]) && b[end][c]!.color === cell.color) end++;
      if (end - r >= 3) {
        const cells: Coord[] = [];
        for (let k = r; k < end; k++) cells.push({ r: k, c });
        runs.push({ cells, dir: "v", color: cell.color });
      }
      r = end;
    }
  }
  return runs;
}

const key = (r: number, c: number) => r * 1000 + c;

/** ¿Hay al menos un match en el tablero? */
export function hasMatches(b: Board): boolean {
  return findRuns(b).length > 0;
}

/** ¿El tablero tiene huecos (celdas null)? */
function hasNulls(b: Board): boolean {
  for (const row of b) for (const cell of row) if (cell === null) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Componentes conexos de celdas en match (para decidir 1 especial por componente).
// ---------------------------------------------------------------------------
interface MatchComponent {
  cells: Coord[];
  maxRunLen: number;
  hasH: boolean;
  hasV: boolean;
  intersections: Coord[];
  color: ColorIndex;
}

function buildComponents(runs: Run[], b: Board): MatchComponent[] {
  const cellRuns = new Map<number, Run[]>();
  for (const run of runs)
    for (const { r, c } of run.cells) {
      const k = key(r, c);
      (cellRuns.get(k) ?? cellRuns.set(k, []).get(k)!).push(run);
    }
  const all = [...cellRuns.keys()];
  const seen = new Set<number>();
  const comps: MatchComponent[] = [];
  for (const start of all) {
    if (seen.has(start)) continue;
    const stack = [start];
    seen.add(start);
    const cells: Coord[] = [];
    let maxRunLen = 0;
    let hasH = false;
    let hasV = false;
    const intersections: Coord[] = [];
    let color: ColorIndex = 0;
    while (stack.length) {
      const k = stack.pop()!;
      const r = Math.floor(k / 1000);
      const c = k % 1000;
      cells.push({ r, c });
      const rs = cellRuns.get(k)!;
      let inH = false;
      let inV = false;
      for (const run of rs) {
        maxRunLen = Math.max(maxRunLen, run.cells.length);
        color = run.color;
        if (run.dir === "h") inH = true;
        else inV = true;
      }
      if (inH) hasH = true;
      if (inV) hasV = true;
      if (inH && inV) intersections.push({ r, c });
      for (const [dr, dc] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ]) {
        const nk = key(r + dr, c + dc);
        if (cellRuns.has(nk) && !seen.has(nk)) {
          seen.add(nk);
          stack.push(nk);
        }
      }
    }
    comps.push({ cells, maxRunLen, hasH, hasV, intersections, color });
  }
  return comps;
}

/** Decide qué especial (si alguno) crea un componente de match. */
function specialFor(comp: MatchComponent, origin: Coord | null): { pos: Coord; special: Special } | null {
  const inComp = (p: Coord) => comp.cells.some((c) => c.r === p.r && c.c === p.c);
  const pick = (preferred: Coord[]): Coord => {
    if (origin && inComp(origin)) return origin;
    for (const p of preferred) if (inComp(p)) return p;
    return comp.cells[Math.floor(comp.cells.length / 2)];
  };
  if (comp.maxRunLen >= 5) return { pos: pick(comp.intersections), special: "bomb" };
  if (comp.hasH && comp.hasV && comp.intersections.length)
    return { pos: pick(comp.intersections), special: "wrapped" };
  if (comp.maxRunLen === 4) {
    // dirección de limpieza = dirección del run de 4
    const horizontal = comp.cells.some((c) => comp.cells.filter((x) => x.r === c.r).length >= 4);
    return { pos: pick([]), special: horizontal ? "striped-h" : "striped-v" };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Efecto de un especial: devuelve celdas extra a limpiar.
// ---------------------------------------------------------------------------
function effectCells(b: Board, pos: Coord, special: Special): Coord[] {
  const n = b.length;
  const out: Coord[] = [];
  if (special === "striped-h") {
    for (let c = 0; c < n; c++) if (b[pos.r][c]) out.push({ r: pos.r, c });
  } else if (special === "striped-v") {
    for (let r = 0; r < n; r++) if (b[r][pos.c]) out.push({ r, c: pos.c });
  } else if (special === "wrapped") {
    for (let r = pos.r - 1; r <= pos.r + 1; r++)
      for (let c = pos.c - 1; c <= pos.c + 1; c++)
        if (inBounds(b, r, c) && b[r][c]) out.push({ r, c });
  } else if (special === "bomb") {
    // limpia todas las bolas del color más frecuente del tablero
    const freq = new Array(COLORS).fill(0);
    for (const row of b) for (const cell of row) if (cell && cell.special !== "bomb") freq[cell.color]++;
    let best: ColorIndex = 0;
    for (let i = 1 as ColorIndex; i < COLORS; i++) if (freq[i] > freq[best]) best = i as ColorIndex;
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (b[r][c] && b[r][c]!.color === best && b[r][c]!.special !== "bomb") out.push({ r, c });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Gravedad + relleno. Mueve ids hacia abajo y crea ids nuevos arriba.
// ---------------------------------------------------------------------------
function applyGravity(b: Board, rng: Rng, nextId: () => number): void {
  const n = b.length;
  for (let c = 0; c < n; c++) {
    // El hielo es inmóvil y bloquea la caída: se queda en su fila.
    const iceRows = new Set<number>();
    const movers: Cell[] = []; // fichas que caen, en orden de arriba a abajo
    for (let r = 0; r < n; r++) {
      const cell = b[r][c];
      if (cell && cell.ice > 0) iceRows.add(r);
      else if (cell) movers.push(cell);
    }
    // Rellena de abajo a arriba: las fichas que caían ocupan primero los huecos bajos.
    for (let r = n - 1; r >= 0; r--) {
      if (iceRows.has(r)) continue; // el hielo ya está colocado
      const mover = movers.pop(); // bottom-most existente baja primero (preserva orden)
      b[r][c] = mover ?? { id: nextId(), color: randColor(rng), special: "none", ice: 0 };
    }
  }
}

// ---------------------------------------------------------------------------
// Un paso de resolución a partir de los runs actuales del tablero.
// ---------------------------------------------------------------------------
function resolveStep(
  b: Board,
  origin: Coord | null,
  rng: Rng,
  nextId: () => number,
  feverMult: number,
  cascade: number
): CascadeStep | null {
  const runs = findRuns(b);
  if (runs.length === 0) return null;

  const comps = buildComponents(runs, b);
  const matched: Coord[] = [];
  for (const comp of comps) matched.push(...comp.cells);

  // Especiales nacidos: ocupan una celda del componente (no se limpia esa celda).
  const created: CascadeStep["created"] = [];
  const becomesSpecial = new Set<number>();
  for (const comp of comps) {
    const sp = specialFor(comp, origin);
    if (sp) {
      becomesSpecial.add(key(sp.pos.r, sp.pos.c));
      created.push({ pos: sp.pos, special: sp.special, color: comp.color });
    }
  }

  // Conjunto a limpiar: matches (menos los que se vuelven especiales) + cadena de especiales.
  const clearSet = new Set<number>();
  const add = (r: number, c: number) => {
    if (!becomesSpecial.has(key(r, c))) clearSet.add(key(r, c));
  };
  for (const { r, c } of matched) add(r, c);

  // Disparo en cadena de especiales que caen dentro del clearSet.
  const triggered: CascadeStep["triggered"] = [];
  const processedSpecials = new Set<number>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const k of [...clearSet]) {
      if (processedSpecials.has(k)) continue;
      const r = Math.floor(k / 1000);
      const c = k % 1000;
      const cell = b[r][c];
      if (cell && cell.special !== "none") {
        processedSpecials.add(k);
        triggered.push({ pos: { r, c }, special: cell.special });
        for (const e of effectCells(b, { r, c }, cell.special)) {
          if (!clearSet.has(key(e.r, e.c)) && !becomesSpecial.has(key(e.r, e.c))) {
            clearSet.add(key(e.r, e.c));
            changed = true;
          }
        }
      }
    }
  }

  // Hielo: un match adyacente o sobre la celda le quita una capa; la celda no se limpia aún.
  const iceHit: Coord[] = [];
  const clearAdj = new Set<number>(clearSet);
  for (const k of clearSet) {
    const r = Math.floor(k / 1000);
    const c = k % 1000;
    for (const [dr, dc] of [
      [0, 0],
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(b, nr, nc) && b[nr][nc] && b[nr][nc]!.ice > 0) clearAdj.add(key(nr, nc));
    }
  }
  const clearedByColor = new Array(COLORS).fill(0);
  const cleared: Coord[] = [];

  // Procesa hielo
  for (const k of clearAdj) {
    const r = Math.floor(k / 1000);
    const c = k % 1000;
    const cell = b[r][c];
    if (cell && cell.ice > 0) {
      cell.ice -= 1;
      iceHit.push({ r, c });
      clearSet.delete(key(r, c)); // no se limpia mientras tenga (o acabe de perder) hielo este paso
    }
  }

  // Limpia celdas (excepto las que se vuelven especiales)
  let score = 0;
  for (const k of clearSet) {
    const r = Math.floor(k / 1000);
    const c = k % 1000;
    const cell = b[r][c];
    if (!cell) continue;
    if (cell.special !== "bomb") clearedByColor[cell.color]++;
    cleared.push({ r, c });
    b[r][c] = null;
    score += SCORE_TILE;
  }

  // Coloca los especiales nacidos
  for (const { pos, special, color } of created) {
    b[pos.r][pos.c] = { id: nextId(), color, special, ice: 0 };
  }

  score = Math.round(score * (1 + cascade * 0.25) * feverMult);

  applyGravity(b, rng, nextId);

  return {
    matched,
    cleared,
    created,
    triggered,
    iceHit,
    board: cloneBoard(b),
    score,
    clearedByColor,
  };
}

/** Resuelve TODA la cascada a partir del estado actual del tablero (mutándolo). */
export function resolve(
  b: Board,
  origin: Coord | null,
  rng: Rng,
  nextId: () => number,
  feverMult = 1
): ResolveResult {
  const steps: CascadeStep[] = [];
  let totalScore = 0;
  const clearedByColor = new Array(COLORS).fill(0);

  // Si el tablero llega con huecos (activación de especial o martillo, que anulan
  // celdas sin formar match), aplica gravedad como primer paso para rellenarlos.
  if (hasNulls(b)) {
    applyGravity(b, rng, nextId);
    steps.push({
      matched: [],
      cleared: [],
      created: [],
      triggered: [],
      iceHit: [],
      board: cloneBoard(b),
      score: 0,
      clearedByColor: new Array(COLORS).fill(0),
    });
  }

  let cascade = 0;
  // primer paso usa el origin del swap; los siguientes ya no.
  let step = resolveStep(b, origin, rng, nextId, feverMult, cascade);
  while (step) {
    steps.push(step);
    totalScore += step.score;
    for (let i = 0; i < COLORS; i++) clearedByColor[i] += step.clearedByColor[i];
    cascade++;
    step = resolveStep(b, null, rng, nextId, feverMult, cascade);
  }
  return { steps, totalScore, clearedByColor };
}

// ---------------------------------------------------------------------------
// Swap: intercambia y resuelve. Maneja activación de especiales.
// Devuelve null si el movimiento es inválido (no genera match ni activa especial).
// ---------------------------------------------------------------------------
export function trySwap(
  b: Board,
  a: Coord,
  d: Coord,
  rng: Rng,
  nextId: () => number,
  feverMult = 1
): { result: ResolveResult; swapped: true } | null {
  if (!areAdjacent(a, d)) return null;
  const ca = b[a.r][a.c];
  const cd = b[d.r][d.c];
  if (!ca || !cd || ca.ice > 0 || cd.ice > 0) return null;

  // Intercambio físico
  b[a.r][a.c] = cd;
  b[d.r][d.c] = ca;

  // Activación directa de especiales por swap
  const special = combineSwap(b, a, d);
  if (special) {
    return { result: resolve(b, null, rng, nextId, feverMult), swapped: true };
  }

  // Match normal: alguno de los dos debe formar línea
  if (hasMatches(b)) {
    const origin = ca.special !== "none" ? a : d;
    return { result: resolve(b, origin, rng, nextId, feverMult), swapped: true };
  }

  // Revertir: movimiento inválido
  b[a.r][a.c] = ca;
  b[d.r][d.c] = cd;
  return null;
}

/**
 * Activación de especiales al intercambiar. Marca celdas a limpiar dejándolas null
 * y/o convirtiéndolas; devuelve true si hubo activación especial.
 * Casos: bomba+bomba (todo el tablero), bomba+normal (todo ese color),
 * especial+especial coloreado (dispara ambos).
 */
function combineSwap(b: Board, a: Coord, d: Coord): boolean {
  const ca = b[a.r][a.c];
  const cd = b[d.r][d.c];
  if (!ca || !cd) return false;
  const aBomb = ca.special === "bomb";
  const dBomb = cd.special === "bomb";

  if (aBomb && dBomb) {
    for (const row of b) for (let c = 0; c < row.length; c++) row[c] = null;
    return true;
  }
  if (aBomb || dBomb) {
    const bombPos = aBomb ? a : d;
    const other = aBomb ? cd : ca;
    const otherPos = aBomb ? d : a;
    b[bombPos.r][bombPos.c] = null;
    if (other.special === "none") {
      const color = other.color;
      for (let r = 0; r < b.length; r++)
        for (let c = 0; c < b[0].length; c++)
          if (b[r][c] && b[r][c]!.color === color && b[r][c]!.special === "none") b[r][c] = null;
    } else {
      // bomba + especial coloreado: lo dejamos como especial "armado" para que el resolve lo dispare
      b[otherPos.r][otherPos.c] = { ...other };
    }
    return true;
  }

  // dos especiales coloreados (striped/wrapped): convierte ambos en match forzando limpieza por efecto
  if (ca.special !== "none" && cd.special !== "none") {
    // Forzamos disparo marcando ambas posiciones para el chain del resolve:
    // las dejamos como están; resolve no las verá si no hay run. Disparamos manualmente aquí.
    const toClear = new Set<number>();
    for (const [pos, sp] of [
      [a, ca.special],
      [d, cd.special],
    ] as [Coord, Special][]) {
      toClear.add(key(pos.r, pos.c));
      for (const e of effectCells(b, pos, sp)) toClear.add(key(e.r, e.c));
    }
    for (const k of toClear) {
      const r = Math.floor(k / 1000);
      const c = k % 1000;
      if (b[r][c]) b[r][c] = null;
    }
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// ¿Existe algún movimiento posible? (para barajar si no hay).
// ---------------------------------------------------------------------------
export function hasPossibleMove(b: Board): boolean {
  const n = b.length;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const cell = b[r][c];
      if (!cell || cell.ice > 0) continue;
      if (cell.special === "bomb") return true;
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
      ]) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(b, nr, nc) || !b[nr][nc] || b[nr][nc]!.ice > 0) continue;
        // swap de prueba
        const tmp = b[r][c];
        b[r][c] = b[nr][nc];
        b[nr][nc] = tmp;
        const ok = hasMatches(b);
        b[nr][nc] = b[r][c];
        b[r][c] = tmp;
        if (ok) return true;
      }
    }
  return false;
}

/** Reordena los colores del tablero conservando ids (cuando no hay movimientos). */
export function shuffle(b: Board, rng: Rng): void {
  const movable: Cell[] = [];
  for (const row of b) for (const cell of row) if (cell && cell.ice === 0) movable.push(cell);
  const colors = movable.map((c) => c.color);
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [colors[i], colors[j]] = [colors[j], colors[i]];
  }
  movable.forEach((cell, i) => (cell.color = colors[i]));
}

export { SCORE_LINE };
