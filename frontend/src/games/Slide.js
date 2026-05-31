import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * Slide puzzle (sliding tiles) using theme.icons.
 * Progressive difficulty per sub (1..5):
 *  sub 1 → 3×3, easy shuffle (40 moves)
 *  sub 2 → 3×3, harder shuffle (80 moves)
 *  sub 3 → 4×4, easy (120 moves)
 *  sub 4 → 4×4, hard (200 moves)
 *  sub 5 → 5×5 (280 moves)
 *
 * UX: Tiles already in their solved position get a soft green glow.
 * Hold "Ver" to peek at the solved layout.
 */
function diff(sub) {
  const cfg = [
    { size: 3, shuffleMoves: 40,  par: 35  },
    { size: 3, shuffleMoves: 80,  par: 55  },
    { size: 4, shuffleMoves: 120, par: 80  },
    { size: 4, shuffleMoves: 200, par: 120 },
    { size: 5, shuffleMoves: 280, par: 180 },
  ];
  return cfg[Math.max(0, Math.min(4, sub - 1))];
}

function shuffleSolvable(tiles, size, totalMoves) {
  const a = tiles.slice();
  let empty = a.indexOf(null);
  let last = -1;
  for (let i = 0; i < totalMoves; i++) {
    const r = Math.floor(empty / size);
    const c = empty % size;
    const cand = [];
    if (r > 0) cand.push(empty - size);
    if (r < size - 1) cand.push(empty + size);
    if (c > 0) cand.push(empty - 1);
    if (c < size - 1) cand.push(empty + 1);
    const noBacktrack = cand.filter((x) => x !== last);
    const pool = noBacktrack.length ? noBacktrack : cand;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    [a[empty], a[pick]] = [a[pick], a[empty]];
    last = empty;
    empty = pick;
  }
  return a;
}

function isSolved(tiles) {
  for (let i = 0; i < tiles.length - 1; i++) if (tiles[i] !== i) return false;
  return tiles[tiles.length - 1] === null;
}

export default function Slide({ level, theme, onComplete }) {
  const sub = ((level - 1) % 5) + 1;
  const D = useMemo(() => diff(sub), [sub]);
  const size = D.size;
  const total = size * size;

  const palette = useMemo(() => {
    const pool = [];
    while (pool.length < total - 1) pool.push(...theme.icons);
    return pool.slice(0, total - 1);
  }, [theme, total]);

  const solved = useMemo(() => {
    const arr = palette.map((_, i) => i);
    arr.push(null);
    return arr;
  }, [palette]);

  const [tiles, setTiles] = useState(() => shuffleSolvable(solved, size, D.shuffleMoves));
  const [moves, setMoves] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);
  const startedAt = useRef(Date.now());
  const finished = useRef(false);

  const onTap = (idx) => {
    if (finished.current) return;
    const empty = tiles.indexOf(null);
    const r1 = Math.floor(idx / size), c1 = idx % size;
    const r2 = Math.floor(empty / size), c2 = empty % size;
    const adj = Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
    if (!adj) return;
    const next = tiles.slice();
    [next[idx], next[empty]] = [next[empty], next[idx]];
    setTiles(next);
    setMoves((m) => m + 1);
  };

  useEffect(() => {
    if (finished.current) return;
    if (isSolved(tiles)) {
      finished.current = true;
      const time = Math.round((Date.now() - startedAt.current) / 1000);
      let stars = 1;
      if (moves <= D.par * 0.7) stars = 3;
      else if (moves <= D.par) stars = 2;
      const score = Math.max(150, 1500 - moves * 6 - time * 2);
      setTimeout(() => onComplete({ win: true, stars, score, moves, time_seconds: time }), 500);
    }
  }, [tiles, moves, D.par, onComplete]);

  const correctCount = tiles.filter((t, i) => t === i).length;

  return (
    <div className="h-full flex flex-col" data-testid="game-slide">
      <div className="grid grid-cols-3 gap-2 mb-2 text-center">
        <Stat label="Movs" value={moves} />
        <Stat label="Tablero" value={`${size}×${size}`} accent={theme.primary} />
        <button
          data-testid="slide-peek-btn"
          onMouseDown={() => setShowOriginal(true)}
          onMouseUp={() => setShowOriginal(false)}
          onMouseLeave={() => setShowOriginal(false)}
          onTouchStart={() => setShowOriginal(true)}
          onTouchEnd={() => setShowOriginal(false)}
          className="rounded-xl bg-white/5 border border-white/10 px-2 py-1.5"
        >
          <div className="text-[10px] uppercase tracking-wider text-zinc-400">Pista</div>
          <div className="h-display text-base font-black">Ver</div>
        </button>
      </div>
      <div className="flex items-center justify-between text-[10px] mb-2 px-1">
        <span className="text-zinc-400">Sub-nivel {sub}/5 · Par {D.par} movs</span>
        <span className="text-zinc-400">Correctas: <b className="text-white">{correctCount}/{total - 1}</b></span>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div
          className="grid gap-1.5 p-2 rounded-2xl bg-black/30 border border-white/10"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0,1fr))`, width: "min(100%, 360px)" }}
          data-testid="slide-grid"
        >
          {(showOriginal ? solved : tiles).map((t, i) => {
            const empty = t === null;
            const inPlace = !showOriginal && !empty && t === i;
            return (
              <motion.button
                key={i}
                onClick={() => !showOriginal && onTap(i)}
                data-testid={`slide-tile-${i}`}
                whileTap={!empty ? { scale: 0.94 } : {}}
                layout
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                className="aspect-square rounded-xl grid place-items-center text-2xl relative overflow-hidden"
                style={{
                  background: empty
                    ? "transparent"
                    : inPlace
                    ? `linear-gradient(135deg, #3EB489, #22c55e)`
                    : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                  border: empty
                    ? "1px dashed rgba(255,255,255,0.18)"
                    : inPlace
                    ? "2px solid #86efac"
                    : "2px solid rgba(255,255,255,0.18)",
                  boxShadow: empty
                    ? "none"
                    : inPlace
                    ? "inset 0 -3px 0 rgba(0,0,0,.25), 0 0 14px rgba(62,180,137,.6)"
                    : `inset 0 -3px 0 rgba(0,0,0,.25), 0 6px 14px rgba(0,0,0,.35)`,
                  cursor: empty ? "default" : "pointer",
                }}
              >
                {!empty && (
                  <>
                    <span style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,.5))" }}>{palette[t]}</span>
                    <span className="absolute top-0.5 left-1 text-[9px] font-black text-white/80">{t + 1}</span>
                  </>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
      <div className="text-center text-xs text-zinc-400 mt-2">
        Ordena las fichas. Las correctas brillan en verde. Mantén "Ver" para previsualizar.
      </div>
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
