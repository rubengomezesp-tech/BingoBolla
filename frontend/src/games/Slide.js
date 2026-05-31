import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * Slide puzzle (sliding tiles) using theme.icons.
 * Levels 11-15 -> sub 1..5 -> size 3x3 (sub 1-2) or 4x4 (sub 3-5).
 * Player taps a tile adjacent to the empty slot to slide it in.
 */
function shuffleSolvable(tiles, size) {
  // Perform N valid random moves from solved state -> always solvable
  const a = tiles.slice();
  let empty = a.indexOf(null);
  const moves = size === 3 ? 80 : 160;
  let last = -1;
  for (let i = 0; i < moves; i++) {
    const r = Math.floor(empty / size);
    const c = empty % size;
    const cand = [];
    if (r > 0) cand.push(empty - size);
    if (r < size - 1) cand.push(empty + size);
    if (c > 0) cand.push(empty - 1);
    if (c < size - 1) cand.push(empty + 1);
    const filt = cand.filter((x) => x !== last);
    const pick = filt[Math.floor(Math.random() * filt.length)];
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
  const sub = ((level - 1) % 5) + 1; // 1..5
  const size = sub <= 2 ? 3 : 4; // 3x3 or 4x4
  const total = size * size;

  const palette = useMemo(() => {
    const pool = theme.icons.slice();
    while (pool.length < total - 1) pool.push(...theme.icons);
    return pool.slice(0, total - 1);
  }, [theme, total]);

  const solved = useMemo(() => {
    const arr = palette.map((_, i) => i);
    arr.push(null);
    return arr;
  }, [palette]);

  const [tiles, setTiles] = useState(() => shuffleSolvable(solved, size));
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
      const par = size === 3 ? 40 : 90;
      let stars = 1;
      if (moves <= par * 0.7) stars = 3;
      else if (moves <= par) stars = 2;
      const score = Math.max(150, 1200 - moves * 8 - time * 2);
      setTimeout(() => onComplete({ win: true, stars, score, moves, time_seconds: time }), 500);
    }
  }, [tiles, moves, size, onComplete]);

  return (
    <div className="h-full flex flex-col" data-testid="game-slide">
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
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

      <div className="flex-1 flex items-center justify-center">
        <div
          className="grid gap-1.5 p-2 rounded-2xl bg-black/30 border border-white/10"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0,1fr))`, width: "min(100%, 360px)" }}
          data-testid="slide-grid"
        >
          {(showOriginal ? solved : tiles).map((t, i) => {
            const empty = t === null;
            return (
              <motion.button
                key={i}
                onClick={() => !showOriginal && onTap(i)}
                data-testid={`slide-tile-${i}`}
                whileTap={!empty ? { scale: 0.94 } : {}}
                className="aspect-square rounded-xl grid place-items-center text-2xl relative overflow-hidden"
                style={{
                  background: empty
                    ? "transparent"
                    : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                  border: empty ? "1px dashed rgba(255,255,255,0.18)" : "2px solid rgba(255,255,255,0.18)",
                  boxShadow: empty ? "none" : `inset 0 -3px 0 rgba(0,0,0,.25), 0 6px 14px rgba(0,0,0,.35)`,
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
        Ordena las fichas. Mantén "Ver" para previsualizar el orden final.
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
