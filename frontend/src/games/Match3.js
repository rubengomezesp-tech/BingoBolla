import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb } from "lucide-react";

/**
 * Match 3 with progressive difficulty per sub-level (1..5):
 *  sub 1 → 6x6, 4 icons, target 400,  25 moves, 2 hints
 *  sub 2 → 6x6, 5 icons, target 600,  22 moves, 2 hints
 *  sub 3 → 7x7, 5 icons, target 850,  22 moves, 1 hint
 *  sub 4 → 7x7, 6 icons, target 1100, 20 moves, 1 hint
 *  sub 5 → 7x7, 6 icons, target 1400, 18 moves, 0 hints
 */
function diff(sub) {
  const cfg = [
    { size: 6, palette: 4, target: 400,  maxMoves: 25, hints: 2 },
    { size: 6, palette: 5, target: 600,  maxMoves: 22, hints: 2 },
    { size: 7, palette: 5, target: 850,  maxMoves: 22, hints: 1 },
    { size: 7, palette: 6, target: 1100, maxMoves: 20, hints: 1 },
    { size: 7, palette: 6, target: 1400, maxMoves: 18, hints: 0 },
  ];
  return cfg[Math.max(0, Math.min(4, sub - 1))];
}

function buildGrid(icons, size) {
  const g = Array.from({ length: size }, () => Array(size).fill(null));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      let pool = icons.slice();
      if (c >= 2 && g[r][c-1] === g[r][c-2]) pool = pool.filter(i => i !== g[r][c-1]);
      if (r >= 2 && g[r-1][c] === g[r-2][c]) pool = pool.filter(i => i !== g[r-1][c]);
      g[r][c] = pool[Math.floor(Math.random() * pool.length)];
    }
  }
  return g;
}

function findMatches(grid) {
  const size = grid.length;
  const matched = Array.from({ length: size }, () => Array(size).fill(false));
  for (let r = 0; r < size; r++) {
    let run = 1;
    for (let c = 1; c <= size; c++) {
      if (c < size && grid[r][c] === grid[r][c-1] && grid[r][c] != null) run++;
      else { if (run >= 3) for (let k = 1; k <= run; k++) matched[r][c-k] = true; run = 1; }
    }
  }
  for (let c = 0; c < size; c++) {
    let run = 1;
    for (let r = 1; r <= size; r++) {
      if (r < size && grid[r][c] === grid[r-1][c] && grid[r][c] != null) run++;
      else { if (run >= 3) for (let k = 1; k <= run; k++) matched[r-k][c] = true; run = 1; }
    }
  }
  return matched;
}

function applyGravityAndRefill(grid, icons) {
  const size = grid.length;
  const g = grid.map(row => row.slice());
  for (let c = 0; c < size; c++) {
    const col = [];
    for (let r = 0; r < size; r++) if (g[r][c] != null) col.push(g[r][c]);
    while (col.length < size) col.unshift(icons[Math.floor(Math.random() * icons.length)]);
    for (let r = 0; r < size; r++) g[r][c] = col[r];
  }
  return g;
}

function clearMatches(grid, matched) {
  const g = grid.map(row => row.slice());
  let count = 0;
  for (let r = 0; r < g.length; r++)
    for (let c = 0; c < g.length; c++)
      if (matched[r][c]) { g[r][c] = null; count++; }
  return { grid: g, count };
}

function adjacent(a, b) {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

// Find a swap that would create a match (used for hint)
function findHint(grid) {
  const size = grid.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      for (const [dr, dc] of [[0,1],[1,0]]) {
        const r2 = r + dr, c2 = c + dc;
        if (r2 >= size || c2 >= size) continue;
        const g = grid.map((row) => row.slice());
        [g[r][c], g[r2][c2]] = [g[r2][c2], g[r][c]];
        if (findMatches(g).some((row) => row.some(Boolean))) {
          return [{ r, c }, { r: r2, c: c2 }];
        }
      }
    }
  }
  return null;
}

export default function Match3({ level, theme, onComplete }) {
  const sub = ((level - 1) % 5) + 1;
  const D = useMemo(() => diff(sub), [sub]);
  const icons = useMemo(() => theme.icons.slice(0, D.palette), [theme, D.palette]);

  const [grid, setGrid] = useState(() => buildGrid(icons, D.size));
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [combo, setCombo] = useState(0); // current chain length
  const [maxCombo, setMaxCombo] = useState(0);
  const [hintsLeft, setHintsLeft] = useState(D.hints);
  const [hint, setHint] = useState(null); // [{r,c}, {r,c}]
  const [resolving, setResolving] = useState(false);
  const [flash, setFlash] = useState(0); // animation key
  const [comboToast, setComboToast] = useState(null);
  const startedAt = useRef(Date.now());
  const finishedRef = useRef(false);

  const resolveMatches = useCallback(async (initialGrid) => {
    setResolving(true);
    let g = initialGrid;
    let chain = 0;
    while (true) {
      const matched = findMatches(g);
      const any = matched.some(row => row.some(Boolean));
      if (!any) break;
      chain++;
      setCombo(chain);
      setMaxCombo((m) => Math.max(m, chain));
      const { grid: cleared, count } = clearMatches(g, matched);
      setGrid(cleared);
      const gained = count * 20 * chain;
      setScore((s) => s + gained);
      setFlash((p) => p + 1);
      if (chain >= 2) {
        setComboToast({ id: Date.now(), text: `¡COMBO x${chain}!`, gained });
      }
      await new Promise(r => setTimeout(r, 260));
      g = applyGravityAndRefill(cleared, icons);
      setGrid(g);
      await new Promise(r => setTimeout(r, 160));
    }
    setCombo(0);
    setResolving(false);
  }, [icons]);

  const onTileClick = (r, c) => {
    if (resolving || finishedRef.current) return;
    setHint(null);
    if (!selected) { setSelected({ r, c }); return; }
    if (selected.r === r && selected.c === c) { setSelected(null); return; }
    if (!adjacent(selected, { r, c })) { setSelected({ r, c }); return; }

    const g = grid.map(row => row.slice());
    [g[selected.r][selected.c], g[r][c]] = [g[r][c], g[selected.r][selected.c]];
    const matched = findMatches(g);
    const any = matched.some(row => row.some(Boolean));
    setSelected(null);
    if (!any) {
      // invalid: tiny shake feedback
      setGrid(g);
      setTimeout(() => setGrid(grid), 220);
      return;
    }
    setMoves((m) => m + 1);
    setGrid(g);
    resolveMatches(g);
  };

  const useHint = () => {
    if (hintsLeft <= 0 || resolving || finishedRef.current) return;
    const h = findHint(grid);
    if (!h) return;
    setHint(h);
    setHintsLeft((n) => n - 1);
    setTimeout(() => setHint(null), 2500);
  };

  useEffect(() => {
    if (finishedRef.current || resolving) return;
    if (score >= D.target) {
      finishedRef.current = true;
      const time = Math.round((Date.now() - startedAt.current) / 1000);
      const movesUsed = moves;
      let stars = 1;
      if (movesUsed <= D.maxMoves * 0.6) stars = 3;
      else if (movesUsed <= D.maxMoves * 0.85) stars = 2;
      // combo bonus
      const finalScore = score + maxCombo * 50;
      setTimeout(() => onComplete({ win: true, stars, score: finalScore, moves: movesUsed, time_seconds: time }), 600);
    } else if (moves >= D.maxMoves) {
      finishedRef.current = true;
      const time = Math.round((Date.now() - startedAt.current) / 1000);
      setTimeout(() => onComplete({ win: false, stars: 0, score, moves, time_seconds: time }), 400);
    }
  }, [score, moves, resolving, D, maxCombo, onComplete]);

  // Auto dismiss combo toast
  useEffect(() => {
    if (!comboToast) return;
    const t = setTimeout(() => setComboToast(null), 900);
    return () => clearTimeout(t);
  }, [comboToast]);

  const progress = Math.min(1, score / D.target);
  const isHinted = (r, c) => hint && hint.some((p) => p.r === r && p.c === c);

  return (
    <div className="h-full flex flex-col relative" data-testid="game-match3">
      <div className="grid grid-cols-3 gap-2 mb-2 text-center">
        <Stat label="Movs" value={`${moves}/${D.maxMoves}`} />
        <Stat label="Score" value={score} accent={theme.primary} />
        <Stat label="Meta" value={D.target} />
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2 relative">
        <motion.div className="h-full" initial={{ width: 0 }} animate={{ width: `${progress * 100}%` }}
          style={{ background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})` }}/>
        {progress >= 1 && (
          <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: [0, .8, 0] }} transition={{ duration: .8, repeat: Infinity }} style={{ background: theme.primary }} />
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] mb-2 px-1">
        <span className="text-zinc-400">Sub-nivel {sub}/5 · {D.size}×{D.size} · {D.palette} fichas</span>
        <button
          onClick={useHint}
          disabled={hintsLeft <= 0 || resolving}
          data-testid="match3-hint-btn"
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
          style={{
            background: hintsLeft > 0 ? `${theme.primary}22` : "rgba(255,255,255,.05)",
            color: hintsLeft > 0 ? theme.primary : "#52525b",
            border: `1px solid ${hintsLeft > 0 ? theme.primary + "55" : "rgba(255,255,255,.05)"}`,
          }}
        >
          <Lightbulb size={12}/> Pista ({hintsLeft})
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        <div
          className="grid gap-1.5 p-2 rounded-2xl bg-black/30 border border-white/10"
          style={{ gridTemplateColumns: `repeat(${D.size}, minmax(0, 1fr))`, width: "min(100%, 360px)" }}
          data-testid="match3-grid"
        >
          {grid.map((row, r) => row.map((icon, c) => {
            const isSel = selected && selected.r === r && selected.c === c;
            const isHint = isHinted(r, c);
            return (
              <motion.button
                key={`${r}-${c}-${icon}-${flash}`}
                onClick={() => onTileClick(r, c)}
                data-testid={`match3-tile-${r}-${c}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{
                  scale: isHint ? [1, 1.12, 1] : 1,
                  opacity: 1,
                }}
                transition={{ duration: isHint ? .6 : 0.2, repeat: isHint ? Infinity : 0 }}
                whileTap={{ scale: 0.9 }}
                className="aspect-square rounded-xl grid place-items-center text-xl sm:text-2xl"
                style={{
                  background: isSel
                    ? `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`
                    : isHint
                    ? `${theme.primary}33`
                    : "rgba(255,255,255,0.06)",
                  border: isSel ? `2px solid #fff` : isHint ? `2px solid ${theme.primary}` : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: isSel ? `0 0 18px ${theme.primary}` : isHint ? `0 0 14px ${theme.primary}aa` : "none",
                }}
              >
                <span style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,.5))" }}>{icon}</span>
              </motion.button>
            );
          }))}
        </div>

        <AnimatePresence>
          {comboToast && (
            <motion.div
              key={comboToast.id}
              initial={{ y: 20, opacity: 0, scale: .6 }}
              animate={{ y: -10, opacity: 1, scale: 1 }}
              exit={{ y: -40, opacity: 0, scale: .9 }}
              transition={{ duration: .4 }}
              className="absolute pointer-events-none px-4 py-1.5 rounded-full font-black h-display"
              data-testid="match3-combo-toast"
              style={{
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                color: "#fff",
                boxShadow: `0 8px 24px ${theme.primary}66`,
                textShadow: "0 1px 2px rgba(0,0,0,.4)",
              }}
            >
              {comboToast.text} <span className="text-xs opacity-90">+{comboToast.gained}</span>
            </motion.div>
          )}
        </AnimatePresence>
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
