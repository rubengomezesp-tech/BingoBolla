import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Memory({ level, theme, onComplete }) {
  const sub = ((level - 1) % 5) + 1; // 1..5 within this game type
  const pairs = 6 + Math.min(4, sub - 1); // 6,7,8,9,10
  const cols = pairs <= 6 ? 3 : pairs <= 8 ? 4 : 5;

  const initialDeck = useMemo(() => {
    const icons = theme.icons.slice(0, pairs);
    return shuffle([...icons, ...icons]).map((icon, i) => ({ id: i, icon, matched: false }));
  }, [theme, pairs]);

  const [deck, setDeck] = useState(initialDeck);
  const [open, setOpen] = useState([]);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [busy, setBusy] = useState(false);
  const startedAt = useRef(Date.now());
  const finished = useRef(false);

  const flip = (i) => {
    if (busy || finished.current) return;
    if (deck[i].matched || open.includes(i) || open.length === 2) return;
    const next = [...open, i];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (deck[a].icon === deck[b].icon) {
        setTimeout(() => {
          setDeck((d) => d.map((c, idx) => (idx === a || idx === b ? { ...c, matched: true } : c)));
          setScore((s) => s + 80);
          setOpen([]);
        }, 320);
      } else {
        setBusy(true);
        setTimeout(() => {
          setOpen([]);
          setBusy(false);
        }, 720);
      }
    }
  };

  useEffect(() => {
    if (finished.current) return;
    if (deck.every((c) => c.matched)) {
      finished.current = true;
      const time = Math.round((Date.now() - startedAt.current) / 1000);
      let stars = 1;
      if (moves <= Math.ceil(pairs * 1.3)) stars = 3;
      else if (moves <= pairs * 2) stars = 2;
      const final = score + Math.max(0, 240 - time * 2);
      setTimeout(() => onComplete({ win: true, stars, score: final, moves, time_seconds: time }), 500);
    }
  }, [deck, moves, score, pairs, onComplete]);

  const foundPairs = deck.filter((c) => c.matched).length / 2;

  return (
    <div className="h-full flex flex-col" data-testid="game-memory">
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <Stat label="Movs" value={moves} />
        <Stat label="Pares" value={`${foundPairs}/${pairs}`} accent={theme.primary} />
        <Stat label="Puntos" value={score} />
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div
          className="grid gap-2 p-2 rounded-2xl bg-black/30 border border-white/10"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, width: "min(100%, 360px)" }}
          data-testid="memory-grid"
        >
          {deck.map((card, i) => {
            const shown = card.matched || open.includes(i);
            return (
              <motion.button
                key={card.id}
                onClick={() => flip(i)}
                data-testid={`memory-card-${i}`}
                whileTap={{ scale: 0.93 }}
                className="aspect-square rounded-xl grid place-items-center text-2xl"
                style={{
                  background: shown
                    ? `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`
                    : "rgba(255,255,255,0.06)",
                  border: shown ? "2px solid #fff" : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: shown ? `0 0 14px ${theme.primary}55` : "none",
                  opacity: card.matched ? 0.72 : 1,
                  transition: "background .2s, opacity .25s",
                }}
              >
                <motion.span
                  key={shown ? "front" : "back"}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.18 }}
                  style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,.5))" }}
                >
                  {shown ? card.icon : "❓"}
                </motion.span>
              </motion.button>
            );
          })}
        </div>
      </div>
      <div className="text-center text-xs text-zinc-400 mt-2">Encuentra todas las parejas.</div>
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
