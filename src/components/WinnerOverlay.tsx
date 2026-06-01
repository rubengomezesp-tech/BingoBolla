"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { playJackpot, playWinnerAnnounce } from "@/lib/sounds";
import { Coins, Crown, Gem, Medal, Sparkles, Trophy, type LucideIcon } from "lucide-react";

type Winner = {
  pattern: string;
  username: string;
  prize_gold: number;
  prize_sweeps: number;
  is_jackpot: boolean;
};

const PATTERN_LABEL: Record<string, string> = {
  line: "LÍNEA",
  two_lines: "DOBLE LÍNEA",
  full_house: "BINGO",
  jackpot: "JACKPOT",
};

const PATTERN_COPY: Record<string, string> = {
  line: "Primera línea confirmada",
  two_lines: "Doble línea confirmada",
  full_house: "Ronda cerrada con bingo",
  jackpot: "Bote acumulado liberado",
};

const PATTERN_ICON: Record<string, LucideIcon> = {
  line: Medal,
  two_lines: Sparkles,
  full_house: Trophy,
  jackpot: Crown,
};

// Escucha claims del game y muestra overlay con el NOMBRE del ganador.
// Visible para todos los jugadores de la sala (via realtime).
export default function WinnerOverlay({ gameId }: { gameId: string | null }) {
  const supabase = useMemo(() => createClient(), []);
  const [winner, setWinner] = useState<Winner | null>(null);
  const shownKeysRef = useRef<Set<string>>(new Set());
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!gameId) return;
    shownKeysRef.current = new Set();
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setWinner(null);

    const channel = supabase
      .channel(`winner-${gameId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "claims", filter: `game_id=eq.${gameId}` },
        async () => {
          // Al detectar un claim nuevo, pedir info con el username
          const { data } = await supabase.rpc("claim_winner_info", { p_game_id: gameId });
          if (!Array.isArray(data) || data.length === 0) return;

          // Mostrar el más reciente que no se haya mostrado aún
          for (const w of data as Winner[]) {
            const key = `${w.pattern}-${w.username}-${w.prize_gold}-${w.prize_sweeps}`;
            if (!shownKeysRef.current.has(key)) {
              shownKeysRef.current.add(key);
              setWinner(w);
              if (w.is_jackpot || w.pattern === "jackpot") { playJackpot(); } else { playWinnerAnnounce(); }
              const dur = w.is_jackpot ? 7000 : 4500;
              if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
              dismissTimerRef.current = setTimeout(() => setWinner(null), dur);
              break;
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [gameId, supabase]);

  if (!winner) return null;

  const isJackpot = winner.is_jackpot || winner.pattern === "jackpot";
  const label = PATTERN_LABEL[winner.pattern] ?? winner.pattern.toUpperCase();
  const Icon = PATTERN_ICON[winner.pattern] ?? Trophy;
  const confettiSeed = `${winner.pattern}-${winner.username}-${winner.prize_gold}-${winner.prize_sweeps}`;
  const hasSweeps = Number(winner.prize_sweeps) > 0;
  const hasGold = Number(winner.prize_gold) > 0;

  return (
    <div className="bb-winner" aria-live="polite">
      <div className={`bb-winnerShell ${isJackpot ? "bb-winnerJackpot" : ""}`}>
        <Confetti gold={isJackpot} seed={confettiSeed} />
        <div className="bb-winnerIcon">
          <Icon size={30} aria-hidden="true" />
        </div>
        <div className="bb-winnerCopy">
          <div className="bb-winnerKicker">{PATTERN_COPY[winner.pattern] ?? "Premio confirmado"}</div>
          <div className="bb-winnerTitle">{label}</div>
          <div className="bb-winnerName">{winner.username}</div>
        </div>
        <div className="bb-winnerPrize" aria-label="Premio">
          {hasSweeps && (
            <span className="bb-prizeSweep">
              <Gem size={15} aria-hidden="true" />
              +${Number(winner.prize_sweeps).toFixed(2)}
            </span>
          )}
          {hasGold && (
            <span className="bb-prizeGold">
              <Coins size={15} aria-hidden="true" />
              +{formatGold(Number(winner.prize_gold))}
            </span>
          )}
          {!hasSweeps && !hasGold && <span className="bb-prizePending">Premio registrado</span>}
        </div>
      </div>

      <style>{`
        .bb-winner{position:fixed;inset:0;z-index:100;pointer-events:none;
          display:flex;align-items:flex-start;justify-content:center;padding:86px 14px 0;
          background:radial-gradient(circle at 50% 0%,rgba(255,61,127,.14),transparent 46%);}
        .bb-winnerShell{position:relative;width:min(520px,100%);overflow:hidden;border-radius:8px;
          padding:14px;display:grid;grid-template-columns:54px minmax(0,1fr);gap:12px;
          background:linear-gradient(180deg,rgba(24,24,36,.98),rgba(12,12,18,.96));
          border:1px solid rgba(255,255,255,.14);
          box-shadow:0 8px 8px rgba(0,0,0,.28);
          animation:bbWinnerIn .26s cubic-bezier(.2,.9,.2,1);}
        .bb-winnerJackpot{border-color:rgba(255,217,61,.46);
          background:linear-gradient(180deg,rgba(42,30,8,.98),rgba(16,14,10,.96));}
        .bb-winnerIcon{width:54px;height:54px;border-radius:8px;display:grid;place-items:center;
          color:#fff;background:linear-gradient(180deg,#ff4d9a,#9a2acf);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.2);}
        .bb-winnerJackpot .bb-winnerIcon{color:#1a1400;background:linear-gradient(180deg,#ffd93d,#c8941a);}
        .bb-winnerCopy{min-width:0;align-self:center;}
        .bb-winnerKicker{font-size:11px;font-weight:700;color:#bdb8ca;margin-bottom:2px;}
        .bb-winnerTitle{font-size:22px;line-height:1;font-weight:900;color:#fff;letter-spacing:0;}
        .bb-winnerJackpot .bb-winnerTitle{color:#ffd93d;}
        .bb-winnerName{margin-top:4px;font-size:13px;color:#f3edf8;font-weight:700;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .bb-winnerPrize{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap;padding-top:4px;}
        .bb-winnerPrize span{display:inline-flex;align-items:center;gap:6px;border-radius:999px;
          padding:8px 10px;font-size:13px;font-weight:900;font-family:var(--font-mono,monospace);
          background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);}
        .bb-prizeSweep{color:#ff83b2;}
        .bb-prizeGold{color:#ffd93d;}
        .bb-prizePending{color:#d7cae8;}
        .bb-confetti{position:absolute;inset:0;overflow:hidden;pointer-events:none;}
        .bb-confetti i{position:absolute;top:-18px;border-radius:2px;opacity:.9;
          animation:bbConfettiFall var(--dur) linear var(--delay) forwards;}
        @keyframes bbWinnerIn{from{opacity:0;transform:translateY(-12px) scale(.98)}
          to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes bbConfettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1}
          100%{transform:translateY(190px) rotate(540deg);opacity:0}}
        @media(max-width:520px){
          .bb-winner{padding-top:76px;}
          .bb-winnerShell{border-radius:8px;}
          .bb-winnerTitle{font-size:19px;}
        }
        @media(prefers-reduced-motion:reduce){
          .bb-winnerShell,.bb-confetti i{animation:none!important;}
          .bb-confetti{display:none;}
        }
      `}</style>
    </div>
  );
}

function Confetti({ gold, seed }: { gold: boolean; seed: string }) {
  const pieces = Array.from({ length: gold ? 34 : 24 });
  const colors = gold
    ? ["#FFD93D", "#C8941A", "#FFE98A", "#fff"]
    : ["#FF3D7F", "#B388FF", "#00E5FF", "#FFD93D"];
  return (
    <div className="bb-confetti" aria-hidden="true">
      {pieces.map((_, i) => {
        const left = seeded(seed, i * 7 + 1) * 100;
        const delay = seeded(seed, i * 7 + 2) * 0.35;
        const dur = 1.2 + seeded(seed, i * 7 + 3) * 0.9;
        const size = 5 + seeded(seed, i * 7 + 4) * 7;
        const color = colors[i % colors.length];
        return (
          <i
            key={i}
            style={{
              left: `${left}%`,
              width: size,
              height: size,
              background: color,
              borderRadius: seeded(seed, i * 7 + 5) > 0.5 ? "50%" : "2px",
              "--dur": `${dur}s`,
              "--delay": `${delay}s`,
            } as any}
          />
        );
      })}
    </div>
  );
}

function seeded(seed: string, salt: number) {
  let h = 2166136261 + salt;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

function formatGold(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}
