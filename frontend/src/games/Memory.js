import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Memory with progressive difficulty per sub-level (1..5):
 *  sub 1 → 6 pairs,  peek 2.5s
 *  sub 2 → 7 pairs,  peek 2.0s
 *  sub 3 → 8 pairs,  peek 1.5s
 *  sub 4 → 9 pairs,  peek 1.0s
 *  sub 5 → 10 pairs, peek 0.8s
 *
 * Streak bonus: consecutive matches multiply the score (x2, x3, ...).
 */
function diff(sub) {
  const cfg = [
    { pairs: 6,  peek: 2500 },
    { pairs: 7,  peek: 2000 },
    { pairs: 8,  peek: 1500 },
    { pairs: 9,  peek: 1000 },
    { pairs: 10, peek: 800  },
  ];
  return cfg[Math.max(0, Math.min(4, sub - 1))];
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Memory({ level, theme, onComplete }) {
  const sub = ((level - 1) % 5) + 1;
  const D = useMemo(() => diff(sub), [sub]);
  const cols = D.pairs <= 6 ? 3 : D.pairs <= 8 ? 4 : 5;

  const initialDeck = useMemo(() => {
    // build an icon palette of D.pairs unique items (cycle if theme has fewer)
    const pool = [];
    while (pool.length < D.pairs) pool.push(...theme.icons);
    const icons = pool.slice(0, D.pairs);
    return shuffle([...icons, ...icons]).map((icon, i) => ({ id: i, icon, matched: false }));
  }, [theme, D.pairs]);

  const [deck, setDeck] = useState(initialDeck);
  const [open, setOpen] = useState([]);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [busy, setBusy] = useState(false);
  const [peeking, setPeeking] = useState(true);
  const [streakToast, setStreakToast] = useState(null);
  const startedAt = useRef(0);
  const finished = useRef(false);

  // Initial peek phase: show all cards face up, then flip them down and start timer.
  useEffect(() => {
    setPeeking(true);
    const t = setTimeout(() => {
      setPeeking(false);
      startedAt.current = Date.now();
    }, D.peek);
    return () => clearTimeout(t);
  }, [D.peek]);

  const flip = (i) => {
    if (busy || finished.current || peeking) return;
    if (deck[i].matched || open.includes(i) || open.length === 2) return;
    const next = [...open, i];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (deck[a].icon === deck[b].icon) {
        const newStreak = streak + 1;
        const bonus = 80 * newStreak;
        setTimeout(() => {
          setDeck((d) => d.map((c, idx) => (idx === a || idx === b ? { ...c, matched: true } : c)));
          setScore((s) => s + bonus);
          setStreak(newStreak);
          setMaxStreak((m) => Math.max(m, newStreak));
          if (newStreak >= 2) setStreakToast({ id: Date.now(), text: `¡RACHA x${newStreak}!`, gained: bonus });
          setOpen([]);
        }, 320);
      } else {
        setBusy(true);
        setStreak(0);
        setTimeout(() => {
          setOpen([]);
          setBusy(false);
        }, 720);
      }
    }
  };

  useEffect(() => {
    if (finished.current || peeking) return;
    if (deck.every((c) => c.matched)) {
      finished.current = true;
      const time = Math.round((Date.now() - startedAt.current) / 1000);
      let stars = 1;
      if (moves <= Math.ceil(D.pairs * 1.3)) stars = 3;
      else if (moves <= D.pairs * 2) stars = 2;
      const final = score + Math.max(0, 240 - time * 2) + maxStreak * 30;
      setTimeout(() => onComplete({ win: true, stars, score: final, moves, time_seconds: time }), 500);
    }
  }, [deck, moves, score, D.pairs, maxStreak, peeking, onComplete]);

  useEffect(() => {
    if (!streakToast) return;
    const t = setTimeout(() => setStreakToast(null), 900);
    return () => clearTimeout(t);
  }, [streakToast]);

  const foundPairs = deck.filter((c) => c.matched).length / 2;

  return (
    <div className="h-full flex flex-col relative" data-testid="game-memory">
      <div className="grid grid-cols-3 gap-2 mb-2 text-center">
        <Stat label="Movs" value={moves} />
        <Stat label="Pares" value={`${foundPairs}/${D.pairs}`} accent={theme.primary} />
        <Stat label="Racha" value={`x${streak || 1}`} accent={streak > 1 ? theme.primary : undefined} />
      </div>
      <div className="text-center text-[10px] text-zinc-400 mb-2">Sub-nivel {sub}/5 · {D.pairs} pares</div>

      <div className="flex-1 flex items-center justify-center relative">
        <div
          className="grid gap-2 p-2 rounded-2xl bg-black/30 border border-white/10"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, width: "min(100%, 360px)" }}
          data-testid="memory-grid"
        >
          {deck.map((card, i) => {
            const shown = peeking || card.matched || open.includes(i);
            return (
              <motion.button
                key={card.id}
                onClick={() => flip(i)}
                data-testid={`memory-card-${i}`}
                whileTap={{ scale: 0.93 }}
                animate={card.matched ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: .35 }}
                className="aspect-square rounded-xl grid place-items-center text-2xl"
                style={{
                  background: shown
                    ? `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`
                    : "rgba(255,255,255,0.06)",
                  border: shown ? "2px solid #fff" : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: shown ? `0 0 14px ${theme.primary}55` : "none",
                  opacity: card.matched ? 0.75 : 1,
                  perspective: "600px",
                  transition: "background .25s, opacity .25s",
                }}
              >
                <motion.span
                  key={shown ? "front" : "back"}
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  transition={{ duration: 0.22 }}
                  style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,.5))", display: "inline-block" }}
                >
                  {shown ? card.icon : "❓"}
                </motion.span>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {peeking && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute top-2 px-3 py-1 rounded-full text-[11px] font-black h-display"
              data-testid="memory-peek-banner"
              style={{ background: `${theme.primary}33`, color: theme.primary, border: `1px solid ${theme.primary}66` }}
            >
              ¡Memoriza!
            </motion.div>
          )}
          {streakToast && (
            <motion.div
              key={streakToast.id}
              initial={{ y: 20, opacity: 0, scale: .6 }}
              animate={{ y: -10, opacity: 1, scale: 1 }}
              exit={{ y: -40, opacity: 0, scale: .9 }}
              transition={{ duration: .4 }}
              className="absolute pointer-events-none px-4 py-1.5 rounded-full font-black h-display"
              data-testid="memory-streak-toast"
              style={{
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                color: "#fff",
                boxShadow: `0 8px 24px ${theme.primary}66`,
              }}
            >
              {streakToast.text} <span className="text-xs opacity-90">+{streakToast.gained}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="text-center text-xs text-zinc-400 mt-2">Encuentra todas las parejas. Encadénalas para sumar racha.</div>
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
