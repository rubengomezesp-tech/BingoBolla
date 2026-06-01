"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Coins, Trophy } from "lucide-react";

type Pot = {
  room_id: string;
  name: string;
  jackpot_gold: number;
  jackpot_sweeps: number;
  max_balls: number;
};

// Muestra el bote en vivo de una sala (o todas). Se actualiza via realtime.
export default function JackpotBadge({ roomId, compact = false }: { roomId?: string; compact?: boolean }) {
  const supabase = createClient();
  const [pots, setPots] = useState<Pot[]>([]);

  useEffect(() => {
    let alive = true;
    async function load() {
      const response = await fetch("/api/jackpots", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      const data = payload?.data;
      if (alive && response.ok && Array.isArray(data)) setPots(data as Pot[]);
    }
    load();

    // Refrescar cuando cambie rooms (rollover) o cada 10s
    const channel = supabase
      .channel("jackpot-pots")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms" }, load)
      .subscribe();
    const iv = setInterval(load, 10000);

    return () => {
      alive = false;
      clearInterval(iv);
      supabase.removeChannel(channel);
    };
  }, []);

  const shown = roomId ? pots.filter((p) => p.room_id === roomId) : pots;
  if (shown.length === 0) return null;

  if (compact && roomId) {
    const p = shown[0];
    const val = p.jackpot_sweeps > 0 ? `$${p.jackpot_sweeps.toFixed(2)}` : formatGold(p.jackpot_gold);
    if (p.jackpot_gold === 0 && p.jackpot_sweeps === 0) return null;
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono"
        style={{ background: "linear-gradient(135deg,rgba(255,217,61,0.15),rgba(200,148,26,0.1))", border: "1px solid rgba(255,217,61,0.3)" }}>
        {p.jackpot_sweeps > 0 ? <Trophy size={13} aria-hidden="true" /> : <Coins size={13} aria-hidden="true" />}
        <span className="text-[var(--color-gold)] font-bold">BOTE {val}</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-4 border"
      style={{ background: "linear-gradient(135deg,rgba(255,217,61,0.08),rgba(200,148,26,0.05))", borderColor: "rgba(255,217,61,0.25)" }}>
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--color-gold)] mb-2 flex items-center gap-1.5">
        <Trophy size={13} aria-hidden="true" /> Bote acumulado
      </div>
      <div className="space-y-1.5">
        {shown.map((p) => {
          if (p.jackpot_gold === 0 && p.jackpot_sweeps === 0) return null;
          return (
            <div key={p.room_id} className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-fg-dim)]">{p.name}</span>
              <span className="font-mono font-bold text-[var(--color-gold)] inline-flex items-center gap-1">
                {p.jackpot_sweeps > 0 ? `$${p.jackpot_sweeps.toFixed(2)}` : <><Coins size={13} aria-hidden="true" />{formatGold(p.jackpot_gold)}</>}
                <span className="text-[10px] text-[var(--color-fg-muted)] ml-1.5">≤{p.max_balls} bolas</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatGold(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}
