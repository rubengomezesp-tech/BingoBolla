"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  generateCard,
  checkWin,
  ballLetter,
  ballColor,
  COLS,
  type Card,
  type Win,
} from "@/lib/game/cards";

export default function BingoDemoPage() {
  const [card] = useState<Card>(generateCard);
  const [called, setCalled] = useState<number[]>([]);
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [playing, setPlaying] = useState(false);
  const [win, setWin] = useState<Win | null>(null);
  const [lastBall, setLastBall] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playing) return;
    intervalRef.current = setInterval(() => {
      setCalled((prev) => {
        if (prev.length >= 75 || win) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setPlaying(false);
          return prev;
        }
        const remaining: number[] = [];
        for (let i = 1; i <= 75; i++) if (!prev.includes(i)) remaining.push(i);
        const next = remaining[Math.floor(Math.random() * remaining.length)];
        setLastBall(next);
        return [...prev, next];
      });
    }, 2200);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, win]);

  const toggleMark = (val: number | "FREE") => {
    if (val === "FREE" || !called.includes(val)) return;
    setMarked((prev) => {
      const n = new Set(prev);
      if (n.has(val)) n.delete(val);
      else n.add(val);
      return n;
    });
  };

  useEffect(() => {
    const w = checkWin(card, marked);
    if (w && !win) {
      setWin(w);
      setPlaying(false);
    }
  }, [marked, card, win]);

  const headerColors = ["#E74C3C", "#D4A933", "#0F4C3A", "#8B4789", "#2C7A7B"];

  return (
    <div className="min-h-screen p-6 md:p-10 grain relative bg-bb-cream">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-bb-forest">
            ← Back
          </Link>
          <div className="display-font text-3xl font-black text-bb-forest">
            Bingo 75 <span className="text-bb-coral">·</span> Demo
          </div>
          <div className="text-sm font-semibold px-3 py-1.5 rounded-full bg-bb-coral/10 text-bb-coral">
            Practice mode
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Card */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl p-6 md:p-8" style={{ boxShadow: "0 10px 40px rgba(15,76,58,0.1)" }}>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {COLS.map((l, i) => (
                  <div
                    key={l}
                    className="display-font text-center py-3 rounded-xl text-white font-black text-3xl md:text-4xl"
                    style={{ background: headerColors[i] }}
                  >
                    {l}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-5 gap-2">
                {card.flatMap((row, r) =>
                  row.map((val, c) => {
                    const isWin = win && win.cells.some(([wr, wc]) => wr === r && wc === c);
                    const isMarked = val === "FREE" || (typeof val === "number" && marked.has(val));
                    const isCalled = val !== "FREE" && typeof val === "number" && called.includes(val);
                    return (
                      <button
                        key={`${r}-${c}`}
                        onClick={() => toggleMark(val)}
                        disabled={!isCalled && val !== "FREE"}
                        className="aspect-square rounded-xl font-bold text-2xl md:text-3xl transition-all relative display-font"
                        style={{
                          background: isWin ? "#D4A933" : isMarked ? "#0F4C3A" : isCalled ? "#fff3e0" : "#f5efe4",
                          color: isMarked || isWin ? "white" : "#0F4C3A",
                          border: isCalled && !isMarked ? "2px solid #E74C3C" : "2px solid transparent",
                          cursor: isCalled || val === "FREE" ? "pointer" : "default",
                        }}
                      >
                        {val === "FREE" ? <span className="text-xs">FREE</span> : val}
                        {isMarked && val !== "FREE" && (
                          <div className="absolute inset-2 rounded-full border-4" style={{ borderColor: "rgba(255,255,255,0.4)" }}></div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {win && (
                <div
                  className="mt-6 p-5 rounded-2xl text-center pop-in"
                  style={{ background: "linear-gradient(135deg, #D4A933, #f9d77a)" }}
                >
                  <div className="display-font text-4xl font-black text-white mb-1">BINGO! 🎉</div>
                  <div className="text-white font-semibold">
                    {win.type} · {called.length} balls called
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 text-center" style={{ boxShadow: "0 10px 40px rgba(15,76,58,0.1)" }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-3 text-bb-forest/60">Last ball</div>
              {lastBall ? (
                <div
                  key={lastBall}
                  className="w-32 h-32 mx-auto rounded-full flex items-center justify-center text-white pop-in pulse-ring"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${ballColor(lastBall)}cc, ${ballColor(lastBall)})`,
                    boxShadow: `0 20px 40px ${ballColor(lastBall)}66`,
                  }}
                >
                  <div className="text-center">
                    <div className="display-font text-sm font-black opacity-80">{ballLetter(lastBall)}</div>
                    <div className="display-font text-5xl font-black leading-none">{lastBall}</div>
                  </div>
                </div>
              ) : (
                <div className="w-32 h-32 mx-auto rounded-full flex items-center justify-center bg-bb-cream text-bb-forest/40">
                  <span className="text-sm font-bold">Ready</span>
                </div>
              )}
              <button
                onClick={() => setPlaying((p) => !p)}
                disabled={!!win}
                className="mt-5 w-full py-3 rounded-full text-white font-bold transition-transform hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: playing ? "#0F4C3A" : "#E74C3C" }}
              >
                {win ? "Round complete" : playing ? "⏸ Pause" : called.length > 0 ? "▶ Resume" : "▶ Start round"}
              </button>
            </div>

            <div className="bg-white rounded-3xl p-6" style={{ boxShadow: "0 10px 40px rgba(15,76,58,0.1)" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-bold uppercase tracking-wider text-bb-forest/60">Called</div>
                <div className="text-sm font-bold text-bb-forest">{called.length}/75</div>
              </div>
              <div className="grid grid-cols-5 gap-1.5 max-h-64 overflow-y-auto">
                {called
                  .slice()
                  .reverse()
                  .map((n) => (
                    <div
                      key={n}
                      className="aspect-square rounded-lg flex items-center justify-center text-xs font-black text-white"
                      style={{ background: ballColor(n) }}
                    >
                      {n}
                    </div>
                  ))}
              </div>
            </div>

            <div className="rounded-3xl p-5 bg-bb-forest/5">
              <div className="text-xs font-bold uppercase tracking-wider mb-2 text-bb-forest">Tip</div>
              <div className="text-sm leading-relaxed text-bb-forest">
                Tap a called number on your card to mark it. Win with any row, column, diagonal, or four corners.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
