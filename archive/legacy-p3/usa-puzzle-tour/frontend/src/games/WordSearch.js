import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb } from "lucide-react";

/**
 * Word Search using theme.cityWords (8 words available).
 * Progressive difficulty per sub (1..5):
 *  sub 1 →  8×8, 4 words, 2 hints
 *  sub 2 →  9×9, 5 words, 2 hints
 *  sub 3 →  9×9, 6 words, 1 hint
 *  sub 4 → 10×10, 7 words, 1 hint
 *  sub 5 → 11×11, 8 words, 0 hints
 *
 * Interaction: tap a start cell + drag (mouse or touch) to the end cell.
 * Cells are highlighted in real-time. Valid lines: horizontal / vertical / 45° diagonal.
 */
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function diff(sub) {
  const cfg = [
    { size: 8,  words: 4, hints: 2 },
    { size: 9,  words: 5, hints: 2 },
    { size: 9,  words: 6, hints: 1 },
    { size: 10, words: 7, hints: 1 },
    { size: 11, words: 8, hints: 0 },
  ];
  return cfg[Math.max(0, Math.min(4, sub - 1))];
}

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
    for (let attempt = 0; attempt < 300 && !ok; attempt++) {
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
    if (!ok) placed.push({ word: w, path: null });
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
  let fwd = true;
  for (let i = 0; i < a.length; i++) if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) { fwd = false; break; }
  if (fwd) return true;
  const br = b.slice().reverse();
  for (let i = 0; i < a.length; i++) if (a[i][0] !== br[i][0] || a[i][1] !== br[i][1]) return false;
  return true;
}

export default function WordSearch({ level, theme, onComplete }) {
  const sub = ((level - 1) % 5) + 1;
  const D = useMemo(() => diff(sub), [sub]);
  const wordCount = Math.min(theme.cityWords.length, D.words);
  const size = D.size;

  const seed = useMemo(() => {
    const words = theme.cityWords.slice(0, wordCount).map((w) => w.toUpperCase());
    return placeWords(words, size);
  }, [theme, size, wordCount]);

  const [grid] = useState(seed.grid);
  const [targets] = useState(seed.placed);
  const [found, setFound] = useState([]);
  const [start, setStart] = useState(null);
  const [hover, setHover] = useState(null);
  const [hintsLeft, setHintsLeft] = useState(D.hints);
  const [hintCells, setHintCells] = useState(null);
  const [foundToast, setFoundToast] = useState(null);
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
    let match = targets.find(
      (t) => !found.some((f) => f.word === t.word) && sameCells(cells, t.path)
    );
    if (!match) {
      match = targets.find(
        (t) => !found.some((f) => f.word === t.word) && (t.word === word || t.word === word.split("").reverse().join(""))
      );
    }
    if (match) {
      setFound((f) => [...f, { word: match.word, cells }]);
      setFoundToast({ id: Date.now(), text: `¡${match.word}!` });
    }
  };

  const useHint = () => {
    if (hintsLeft <= 0 || finished.current) return;
    const remaining = targets.filter((t) => !found.some((f) => f.word === t.word));
    if (!remaining.length) return;
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    // Reveal just the first cell of the chosen word for a brief moment
    setHintCells([pick.path[0]]);
    setHintsLeft((n) => n - 1);
    setTimeout(() => setHintCells(null), 2200);
  };

  useEffect(() => {
    if (finished.current) return;
    if (totalWords > 0 && found.length >= totalWords) {
      finished.current = true;
      const time = Math.round((Date.now() - startedAt.current) / 1000);
      const par = 20 + totalWords * 12;
      let stars = 1;
      if (time <= par * 0.6) stars = 3;
      else if (time <= par) stars = 2;
      const score = Math.max(200, totalWords * 140 - time * 3 + hintsLeft * 40);
      setTimeout(() => onComplete({ win: true, stars, score, moves: found.length, time_seconds: time }), 500);
    }
  }, [found, totalWords, hintsLeft, onComplete]);

  useEffect(() => {
    if (!foundToast) return;
    const t = setTimeout(() => setFoundToast(null), 900);
    return () => clearTimeout(t);
  }, [foundToast]);

  const currentLine = start && hover ? lineCells(start, hover) : null;
  const foundCellSet = new Set();
  found.forEach((f) => f.cells.forEach(([r, c]) => foundCellSet.add(`${r}-${c}`)));
  const currentSet = new Set();
  if (currentLine) currentLine.forEach(([r, c]) => currentSet.add(`${r}-${c}`));
  const hintSet = new Set();
  if (hintCells) hintCells.forEach(([r, c]) => hintSet.add(`${r}-${c}`));

  return (
    <div className="h-full flex flex-col relative" data-testid="game-wordsearch">
      <div className="grid grid-cols-3 gap-2 mb-2 text-center">
        <Stat label="Palabras" value={`${found.length}/${totalWords}`} accent={theme.primary} />
        <Stat label="Tablero" value={`${size}×${size}`} />
        <button
          onClick={useHint}
          disabled={hintsLeft <= 0}
          data-testid="ws-hint-btn"
          className="rounded-xl bg-white/5 border border-white/10 px-2 py-1.5 disabled:opacity-50"
        >
          <div className="text-[10px] uppercase tracking-wider text-zinc-400 flex items-center justify-center gap-1">
            <Lightbulb size={10}/> Pista
          </div>
          <div className="h-display text-base font-black" style={{ color: hintsLeft > 0 ? theme.primary : undefined }}>{hintsLeft}</div>
        </button>
      </div>
      <div className="text-center text-[10px] text-zinc-400 mb-2">Sub-nivel {sub}/5 · {totalWords} palabras</div>

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
            const isHint = hintSet.has(key);
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
                    : isHint
                    ? `${theme.primary}77`
                    : "rgba(255,255,255,0.05)",
                  border: isActive || isHint
                    ? `2px solid ${theme.primary}`
                    : "1px solid rgba(255,255,255,0.08)",
                  color: isFound ? "#fff" : "rgba(255,255,255,0.85)",
                  animation: isHint ? "pop .35s ease-out both" : undefined,
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

        <AnimatePresence>
          {foundToast && (
            <motion.div
              key={foundToast.id}
              initial={{ y: 20, opacity: 0, scale: .6 }}
              animate={{ y: -10, opacity: 1, scale: 1 }}
              exit={{ y: -40, opacity: 0, scale: .9 }}
              transition={{ duration: .35 }}
              className="absolute top-32 pointer-events-none px-4 py-1.5 rounded-full font-black h-display"
              data-testid="ws-found-toast"
              style={{
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                color: "#fff",
                boxShadow: `0 8px 24px ${theme.primary}66`,
              }}
            >
              {foundToast.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="text-center text-xs text-zinc-400 mt-2">Arrastra para unir las letras. Usa pistas si te atascas.</div>
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
