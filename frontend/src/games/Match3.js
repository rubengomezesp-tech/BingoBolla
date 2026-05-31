import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SIZE = 7;

function buildGrid(icons) {
  const g = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      let pool = icons.slice();
      // avoid initial 3-in-a-row
      if (c >= 2 && g[r][c-1] === g[r][c-2]) pool = pool.filter(i => i !== g[r][c-1]);
      if (r >= 2 && g[r-1][c] === g[r-2][c]) pool = pool.filter(i => i !== g[r-1][c]);
      g[r][c] = pool[Math.floor(Math.random() * pool.length)];
    }
  }
  return g;
}

function findMatches(grid) {
  const matched = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  for (let r = 0; r < SIZE; r++) {
    let run = 1;
    for (let c = 1; c <= SIZE; c++) {
      if (c < SIZE && grid[r][c] === grid[r][c-1] && grid[r][c] != null) run++;
      else { if (run >= 3) for (let k = 1; k <= run; k++) matched[r][c-k] = true; run = 1; }
    }
  }
  for (let c = 0; c < SIZE; c++) {
    let run = 1;
    for (let r = 1; r <= SIZE; r++) {
      if (r < SIZE && grid[r][c] === grid[r-1][c] && grid[r][c] != null) run++;
      else { if (run >= 3) for (let k = 1; k <= run; k++) matched[r-k][c] = true; run = 1; }
    }
  }
  return matched;
}

function applyGravityAndRefill(grid, icons) {
  const g = grid.map(row => row.slice());
  for (let c = 0; c < SIZE; c++) {
    const col = [];
    for (let r = 0; r < SIZE; r++) if (g[r][c] != null) col.push(g[r][c]);
    while (col.length < SIZE) col.unshift(icons[Math.floor(Math.random() * icons.length)]);
    for (let r = 0; r < SIZE; r++) g[r][c] = col[r];
  }
  return g;
}

function clearMatches(grid, matched) {
  const g = grid.map(row => row.slice());
  let count = 0;
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (matched[r][c]) { g[r][c] = null; count++; }
  return { grid: g, count };
}

function adjacent(a, b) {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

export default function Match3({ level, theme, onComplete }) {
  const icons = useMemo(() => theme.icons.slice(0, 5), [theme]);
  const targetScore = 600 + (level - 1) * 200;
  const maxMoves = 22 - Math.min(7, level - 1);

  const [grid, setGrid] = useState(() => buildGrid(icons));
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [resolving, setResolving] = useState(false);
  const [pulse, setPulse] = useState(0);
  const startedAt = useRef(Date.now());
  const finishedRef = useRef(false);

  const resolveMatches = useCallback(async (initialGrid) => {
    setResolving(true);
    let g = initialGrid;
    let combo = 0;
    while (true) {
      const matched = findMatches(g);
      const any = matched.some(row => row.some(Boolean));
      if (!any) break;
      combo++;
      const { grid: cleared, count } = clearMatches(g, matched);
      setGrid(cleared);
      setScore((s) => s + count * 20 * combo);
      setPulse((p) => p + 1);
      await new Promise(r => setTimeout(r, 280));
      g = applyGravityAndRefill(cleared, icons);
      setGrid(g);
      await new Promise(r => setTimeout(r, 180));
    }
    setResolving(false);
  }, [icons]);

  const onTileClick = (r, c) => {
    if (resolving || finishedRef.current) return;
    if (!selected) { setSelected({ r, c }); return; }
    if (selected.r === r && selected.c === c) { setSelected(null); return; }
    if (!adjacent(selected, { r, c })) { setSelected({ r, c }); return; }

    const g = grid.map(row => row.slice());
    [g[selected.r][selected.c], g[r][c]] = [g[r][c], g[selected.r][selected.c]];
    const matched = findMatches(g);
    const any = matched.some(row => row.some(Boolean));
    setSelected(null);
    if (!any) {
      // invalid: revert with visual hint
      setGrid(g);
      setTimeout(() => setGrid(grid), 220);
      return;
    }
    setMoves((m) => m + 1);
    setGrid(g);
    resolveMatches(g);
  };

  useEffect(() => {
    if (finishedRef.current || resolving) return;
    if (score >= targetScore) {
      finishedRef.current = true;
      const time = Math.round((Date.now() - startedAt.current) / 1000);
      const movesUsed = moves;
      let stars = 1;
      if (movesUsed <= maxMoves * 0.6) stars = 3;
      else if (movesUsed <= maxMoves * 0.85) stars = 2;
      setTimeout(() => onComplete({ win: true, stars, score, moves: movesUsed, time_seconds: time }), 600);
    } else if (moves >= maxMoves) {
      finishedRef.current = true;
      const time = Math.round((Date.now() - startedAt.current) / 1000);
      setTimeout(() => onComplete({ win: false, stars: 0, score, moves, time_seconds: time }), 400);
    }
  }, [score, moves, resolving, targetScore, maxMoves, onComplete]);

  const progress = Math.min(1, score / targetScore);

  return (
    <div className="h-full flex flex-col" data-testid="game-match3">
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <Stat label="Movimientos" value={`${moves}/${maxMoves}`} />
        <Stat label="Score" value={score} accent={theme.primary} />
        <Stat label="Meta" value={targetScore} />
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-3">
        <motion.div className="h-full" initial={{ width: 0 }} animate={{ width: `${progress * 100}%` }}
          style={{ background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})` }}/>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div
          className="grid gap-1.5 p-2 rounded-2xl bg-black/30 border border-white/10"
          style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))`, width: "min(100%, 360px)" }}
          data-testid="match3-grid"
        >
          {grid.map((row, r) => row.map((icon, c) => {
            const isSel = selected && selected.r === r && selected.c === c;
            return (
              <motion.button
                key={`${r}-${c}-${icon}-${pulse}`}
                onClick={() => onTileClick(r, c)}
                data-testid={`match3-tile-${r}-${c}`}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.18 }}
                whileTap={{ scale: 0.9 }}
                className="aspect-square rounded-xl grid place-items-center text-xl sm:text-2xl"
                style={{
                  background: isSel
                    ? `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`
                    : "rgba(255,255,255,0.06)",
                  border: isSel ? `2px solid #fff` : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: isSel ? `0 0 18px ${theme.primary}` : "none",
                }}
              >
                <span style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,.5))" }}>{icon}</span>
              </motion.button>
            );
          }))}
        </div>
      </div>
      <div className="text-center text-xs text-zinc-400 mt-2">Toca dos fichas adyacentes para intercambiar.</div>
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
