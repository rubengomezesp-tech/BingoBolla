"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const variantMeta: Record<string, { emoji: string; label: string; accent: string }> = {
  bingo75: { emoji: "🎯", label: "Bingo 75", accent: "#FF3D7F" },
  bingo90: { emoji: "🇬🇧", label: "Bingo 90", accent: "#00E5FF" },
  lite: { emoji: "⚡", label: "Speedy Lite", accent: "#FFD93D" },
  cinco: { emoji: "✨", label: "Cinco", accent: "#B388FF" },
  pulse: { emoji: "💫", label: "Pulse", accent: "#00E676" },
};

export type RoomCardData = {
  id: string;
  name: string;
  variant: string;
  ticket_gold: number;
  ticket_sweeps: number;
  rtp: number;
  rollover_sweeps: number;
  game_status: string | null;
  effective_pot_sweeps: number;
  players_in_play: number;
  next_starts_at: string | null;  // ← timestamp del próximo waiting game
  balls_called?: number;
};

export default function RoomCard({ room }: { room: RoomCardData }) {
  const meta = variantMeta[room.variant] ?? variantMeta.bingo75;
  const players = room.players_in_play ?? 0;
  const effectivePot = Number(room.effective_pot_sweeps ?? 0);
  const rollover = Number(room.rollover_sweeps ?? 0);
  const isPlaying = room.game_status === "playing";
  const hasJackpot = rollover > 0;

  // Countdown live
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!room.next_starts_at || isPlaying) {
      setSecondsLeft(null);
      return;
    }
    const target = new Date(room.next_starts_at).getTime();
    const tick = () => {
      const remaining = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [room.next_starts_at, isPlaying]);

  const countdownText =
    isPlaying ? "EN JUEGO" :
    secondsLeft == null ? "ESPERANDO" :
    secondsLeft === 0 ? "EMPEZANDO..." :
    `${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60).toString().padStart(2, "0")}`;

  return (
    <Link
      href={`/room/${room.id}`}
      className="room-card card-lift p-5 anim-slide-up group relative block"
      style={{ ['--accent' as any]: meta.accent }}
    >
      {hasJackpot && (
        <div className="absolute -top-2 -right-2 font-mono text-[10px] px-2 py-1 rounded-md bg-[var(--color-gold)] text-bb-ink chunky shadow-lg shadow-[var(--color-gold)]/50">
          🔥 JACKPOT +${rollover.toFixed(2)}
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="text-3xl">{meta.emoji}</div>
        {isPlaying ? (
          <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-[var(--color-emerald)]/15 text-[var(--color-emerald)] border border-[var(--color-emerald)]/30 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-[var(--color-emerald)] anim-blink" />
            LIVE · {room.balls_called ?? 0}
          </span>
        ) : secondsLeft !== null && secondsLeft <= 10 ? (
          <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-[var(--color-magenta)]/20 text-[var(--color-magenta)] border border-[var(--color-magenta)]/40 anim-blink">
            ⏰ {countdownText}
          </span>
        ) : (
          <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-[var(--color-gold)]/15 text-[var(--color-gold)] border border-[var(--color-gold)]/30 font-bold">
            {countdownText}
          </span>
        )}
      </div>

      <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-1">
        {meta.label} · RTP {(Number(room.rtp) * 100).toFixed(0)}%
      </div>
      <div className="font-display text-2xl mb-4">{room.name}</div>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[var(--color-border)]">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-0.5">
            {hasJackpot ? "Pozo total" : "Pozo"}
          </div>
          <div className="font-display text-xl shimmer-gold">${effectivePot.toFixed(2)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-0.5">
            Cartón
          </div>
          <div className="font-mono text-base">${room.ticket_sweeps}</div>
          <div className="font-mono text-[10px] text-[var(--color-fg-muted)]">{room.ticket_gold} 🪙</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-fg-dim)]">
          <span className="w-1 h-1 rounded-full bg-[var(--color-emerald)]" />
          {players} jugando
        </div>
        <div className="text-xs font-medium text-[var(--color-fg-dim)] group-hover:text-white transition-colors">
          Entrar →
        </div>
      </div>
    </Link>
  );
}
