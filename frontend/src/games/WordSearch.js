import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * Word search using theme.cityWords.
 * Levels 16-20 -> sub 1..5 -> grid grows 8 -> 10 and word count 4 -> 6.
 * Tap start cell + tap end cell to mark a word (straight line: horizontal, vertical, or diagonal).
 */

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const DIRS = [
  [0, 1], [0, -1],
  [1, 0], [-1, 0],
  [1, 1], [-1, -1],
  [1, -1], [-1, 1],
];

function placeWords(words, size) {
  const grid = Array.from({ length: size }, () => Array(size).fill(""));
  const placed = [];
  for (const w of words) {
    let ok = false;
    for (let attempt = 0; attempt < 200 && !ok; attempt++) {
      const dir = DIRS[Math.floor(Math.random() * DIRS.length)];
      const r = Math.floor(Math.random() * size);
      const c = Math.floor(Math.random() * size);
      const er = r + dir[0] * (w.length - 1);
      const ec = c + dir[1] * (w.length - 1);
      if (er < 0 || ec < 0 || er >= size || ec >= size) continue;
      let fits = true;
      const path = [];
      for (let i = 0; i < w.length; i++) {
        const rr = r + dir[0] * i;
        const cc = c + dir[1] * i;
        const ch = grid[rr][cc];
        if (ch && ch !== w[i]) { fits = false; break; }
        path.push([rr, cc]);
      }
      if (!fits) continue;
      path.forEach(([rr, cc], i) => { grid[rr][cc] = w[i]; });
      placed.push({ word: w, path });
      ok = true;
    }
    if (!ok) placed.push({ word: w, path: null }); // could not place; will be skipped from required
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) grid[r][c] = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    }
  }
  return { grid, placed: placed.filter((p) => p.path) };
}

function lineCells(a, b) {
  const dr = Math.sign(b.r - a.r);
  const dc = Math.sign(b.c - a.c);
  const len = Math.max(Math.abs(b.r - a.r), Math.abs(b.c - a.c)) + 1;
  // only valid if horizontal, vertical or perfect diagonal
  const validLine =
    a.r === b.r ||
    a.c === b.c ||
    Math.abs(b.r - a.r) === Math.abs(b.c - a.c);
  if (!validLine) return null;
  const cells = [];
  for (let i = 0; i < len; i++) cells.push([a.r + dr * i, a.c + dc * i]);
  return cells;
}

function cellsToString(cells, grid) {
  return cells.map(([r, c]) => grid[r][c]).join("");
}

function sameCells(a, b) {
  if (a.length !== b.length) return false;
  // forward
  let fwd = true;
  for (let i = 0; i < a.length; i++) if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) { fwd = false; break; }
  if (fwd) return true;
  // reverse
  const br = b.slice().reverse();
  for (let i = 0; i < a.length; i++) if (a[i][0] !== br[i][0] || a[i][1] !== br[i][1]) return false;
  return true;
}

export default function WordSearch({ level, theme, onComplete }) {
  const sub = ((level - 1) % 5) + 1; // 1..5
  const size = sub <= 2 ? 8 : sub <= 4 ? 9 : 10;
  const wordCount = Math.min(theme.cityWords.length, 3 + sub); // 4..6

  const seed = useMemo(() => {
    const words = theme.cityWords.slice(0, wordCount).map((w) => w.toUpperCase());
    return placeWords(words, size);
  }, [theme, size, wordCount]);

  const [grid] = useState(seed.grid);
  const [targets] = useState(seed.placed); // [{word, path:[[r,c],...]}]
  const [found, setFound] = useState([]); // array of {word, cells}
  const [start, setStart] = useState(null);
  const [hover, setHover] = useState(null);
  const startedAt = useRef(Date.now());
  const finished = useRef(false);

  const totalWords = targets.length;

  const onCellDown = (r, c) => {
    if (finished.current) return;
    setStart({ r, c });
    setHover({ r, c });
  };
  const onCellEnter = (r, c) => {
    if (!start) return;
    setHover({ r, c });
  };
  const onCellUp = (r, c) => {
    if (!start) return;
    const cells = lineCells(start, { r, c });
    setStart(null);
    setHover(null);
    if (!cells) return;
    const word = cellsToString(cells, grid);
    const match = targets.find(
      (t) => !found.some((f) => f.word === t.word) && sameCells(cells, t.path)
    );
    if (match) {
      setFound((f) => [...f, { word: match.word, cells }]);
    } else {
      // also accept exact word string match (allow finding when user goes the right direction even if path stored differs)
      const target = targets.find((t) => !found.some((f) => f.word === t.word) && (t.word === word || t.word === word.split("").reverse().join("")));
      if (target) setFound((f) => [...f, { word: target.word, cells }]);
    }
  };

  useEffect(() => {
    if (finished.current) return;
    if (totalWords > 0 && found.length >= totalWords) {
      finished.current = true;
      const time = Math.round((Date.now() - startedAt.current) / 1000);
      const par = 20 + totalWords * 10;
      let stars = 1;
      if (time <= par * 0.6) stars = 3;
      else if (time <= par) stars = 2;
      const score = Math.max(200, totalWords * 120 - time * 3);
      setTimeout(() => onComplete({ win: true, stars, score, moves: found.length, time_seconds: time }), 500);
    }
  }, [found, totalWords, onComplete]);

  const currentLine = start && hover ? lineCells(start, hover) : null;
  const foundCellSet = new Set();
  found.forEach((f) => f.cells.forEach(([r, c]) => foundCellSet.add(`${r}-${c}`)));
  const currentSet = new Set();
  currentLine && currentLine.forEach(([r, c]) => currentSet.add(`${r}-${c}`));

  return (
    <div className="h-full flex flex-col" data-testid="game-wordsearch">
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <Stat label="Palabras" value={`${found.length}/${totalWords}`} accent={theme.primary} />
        <Stat label="Tablero" value={`${size}×${size}`} />
        <Stat label="Restantes" value={totalWords - found.length} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center select-none">
        <div
          className="grid gap-0.5 p-2 rounded-2xl bg-black/30 border border-white/10"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0,1fr))`, width: "min(100%, 360px)" }}
          data-testid="wordsearch-grid"
          onMouseLeave={() => { setStart(null); setHover(null); }}
        >
          {grid.map((row, r) => row.map((ch, c) => {
            const key = `${r}-${c}`;
            const isFound = foundCellSet.has(key);
            const isActive = currentSet.has(key);
            return (
              <button
                key={key}
                onMouseDown={() => onCellDown(r, c)}
                onMouseEnter={() => onCellEnter(r, c)}
                onMouseUp={() => onCellUp(r, c)}
                onTouchStart={(e) => { e.preventDefault(); onCellDown(r, c); }}
                onTouchMove={(e) => {
                  const t = e.touches[0];
                  const el = document.elementFromPoint(t.clientX, t.clientY);
                  if (el && el.dataset && el.dataset.cell) {
                    const [rr, cc] = el.dataset.cell.split("-").map(Number);
                    onCellEnter(rr, cc);
                  }
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  if (hover) onCellUp(hover.r, hover.c);
                }}
                data-cell={key}
                data-testid={`ws-cell-${r}-${c}`}
                className="aspect-square rounded-md text-xs sm:text-sm font-black h-display"
                style={{
                  background: isFound
                    ? `linear-gradient(135deg, ${theme.primary}aa, ${theme.secondary}aa)`
                    : isActive
                    ? `${theme.primary}55`
                    : "rgba(255,255,255,0.05)",
                  border: isActive
                    ? `2px solid ${theme.primary}`
                    : "1px solid rgba(255,255,255,0.08)",
                  color: isFound ? "#fff" : "rgba(255,255,255,0.85)",
                }}
              >
                {ch}
              </button>
            );
          }))}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 justify-center max-w-[360px]" data-testid="wordsearch-words">
          {targets.map((t) => {
            const isFound = found.some((f) => f.word === t.word);
            return (
              <span
                key={t.word}
                data-testid={`ws-word-${t.word}`}
                className="text-[10px] sm:text-xs font-bold px-2 py-1 rounded-full"
                style={{
                  background: isFound ? `${theme.primary}33` : "rgba(255,255,255,0.05)",
                  border: `1px solid ${isFound ? theme.primary : "rgba(255,255,255,0.1)"}`,
                  color: isFound ? theme.primary : "#fff",
                  textDecoration: isFound ? "line-through" : "none",
                  opacity: isFound ? 0.85 : 1,
                }}
              >
                {t.word}
              </span>
            );
          })}
        </div>
      </div>
      <div className="text-center text-xs text-zinc-400 mt-2">Arrastra para unir las letras.</div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-400">{label}</div>
      <div className="h-display text-base font-black" style={{ color: accent || "#fff" }}>{value}</div>
    </div>
  );
}
