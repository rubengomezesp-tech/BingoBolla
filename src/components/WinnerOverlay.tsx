"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { playJackpot, playWinnerAnnounce } from "@/lib/sound";

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
  full_house: "¡BINGO!",
  jackpot: "JACKPOT",
};

// Escucha claims del game y muestra overlay con el NOMBRE del ganador.
// Visible para todos los jugadores de la sala (via realtime).
export default function WinnerOverlay({ gameId }: { gameId: string | null }) {
  const supabase = createClient();
  const [winner, setWinner] = useState<Winner | null>(null);
  const [shownKeys, setShownKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!gameId) return;

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
            if (!shownKeys.has(key)) {
              setShownKeys((prev) => new Set(prev).add(key));
              setWinner(w);
              if (w.is_jackpot || w.pattern === "jackpot") { playJackpot(); } else { playWinnerAnnounce(); }
              const dur = w.is_jackpot ? 7000 : 4500;
              setTimeout(() => setWinner(null), dur);
              break;
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  if (!winner) return null;

  const isJackpot = winner.is_jackpot || winner.pattern === "jackpot";
  const label = PATTERN_LABEL[winner.pattern] ?? winner.pattern.toUpperCase();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-[fadeIn_0.3s_ease]"
        style={{
          background: isJackpot
            ? "radial-gradient(circle at center, rgba(200,148,26,0.35), rgba(8,8,12,0.85))"
            : "radial-gradient(circle at center, rgba(255,61,127,0.25), rgba(8,8,12,0.8))",
        }}
      />

      {/* Confetti dorado para jackpot, normal para premio */}
      <Confetti gold={isJackpot} />

      {/* Tarjeta */}
      <div
        className="relative text-center animate-[winPop_0.5s_cubic-bezier(0.18,0.89,0.32,1.28)]"
        style={{ maxWidth: 480 }}
      >
        {isJackpot ? (
          <>
            <div className="text-6xl md:text-7xl mb-3 animate-[bounce_0.6s_ease-infinite]">🎰</div>
            <div
              className="font-display text-4xl md:text-6xl mb-2"
              style={{
                background: "linear-gradient(135deg,#FFD93D,#C8941A,#FFD93D)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 20px rgba(255,217,61,0.6))",
              }}
            >
              ¡JACKPOT!
            </div>
            <div className="text-xl md:text-2xl font-bold text-white mb-1">
              {winner.username}
            </div>
            <div className="text-sm text-[var(--color-fg-dim)] mb-4">se llevó el bote completo</div>
          </>
        ) : (
          <>
            <div className="text-5xl md:text-6xl mb-3">
              {winner.pattern === "full_house" ? "🏆" : winner.pattern === "two_lines" ? "✨" : "🎯"}
            </div>
            <div
              className="font-display text-3xl md:text-5xl mb-2"
              style={{
                background: "linear-gradient(135deg,#FF3D7F,#B388FF)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {label}
            </div>
            <div className="text-lg md:text-xl font-bold text-white mb-4">
              {winner.username}
            </div>
          </>
        )}

        {/* Premio */}
        <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
          {winner.prize_sweeps > 0 && (
            <span className="font-mono font-bold text-[var(--color-magenta)]">
              +${Number(winner.prize_sweeps).toFixed(2)} 💎
            </span>
          )}
          {winner.prize_gold > 0 && (
            <span className="font-mono font-bold text-[var(--color-gold)]">
              +{Number(winner.prize_gold).toLocaleString()} 🪙
            </span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes winPop {
          0% { transform: scale(0.5); opacity: 0 }
          100% { transform: scale(1); opacity: 1 }
        }
      `}</style>
    </div>
  );
}

function Confetti({ gold }: { gold: boolean }) {
  const pieces = Array.from({ length: gold ? 60 : 40 });
  const colors = gold
    ? ["#FFD93D", "#C8941A", "#FFE98A", "#fff"]
    : ["#FF3D7F", "#B388FF", "#00E5FF", "#FFD93D"];
  return (
    <div className="absolute inset-0 overflow-hidden">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.5;
        const dur = 2 + Math.random() * 2;
        const size = 6 + Math.random() * 8;
        const color = colors[i % colors.length];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: "-20px",
              width: size,
              height: size,
              background: color,
              borderRadius: Math.random() > 0.5 ? "50%" : "2px",
              animation: `confettiFall ${dur}s linear ${delay}s forwards`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1 }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0 }
        }
      `}</style>
    </div>
  );
}
