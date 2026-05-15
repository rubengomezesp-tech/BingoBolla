"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RealityCheck() {
  const [show, setShow] = useState(false);
  const [interval, setInterval] = useState(30); // minutes
  const [stats, setStats] = useState<{ wagered: number; won: number; sessionMin: number } | null>(null);
  const [sessionStart] = useState(() => Date.now());

  // Load configured interval
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: limits } = await supabase
        .from("rg_limits")
        .select("reality_check_interval_minutes")
        .eq("player_id", user.id)
        .maybeSingle();
      if (limits?.reality_check_interval_minutes) {
        setInterval(limits.reality_check_interval_minutes);
      }
    })();
  }, []);

  // Schedule popup
  useEffect(() => {
    const id = setTimeout(() => {
      void loadStats();
      setShow(true);
    }, interval * 60_000);
    return () => clearTimeout(id);
  }, [interval, show]); // restart timer when dismissed

  async function loadStats() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: spend } = await supabase
      .from("player_spend_24h")
      .select("*")
      .eq("player_id", user.id)
      .maybeSingle();
    const sessionMin = Math.floor((Date.now() - sessionStart) / 60_000);
    setStats({
      wagered: Number(spend?.wagered_sweeps_24h ?? 0),
      won: Number(spend?.won_sweeps_24h ?? 0),
      sessionMin,
    });
  }

  if (!show || !stats) return null;

  const net = stats.won - stats.wagered;
  const positive = net >= 0;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-bg)]/80 backdrop-blur-md flex items-center justify-center p-6">
      <div className="card glass max-w-md w-full p-6 md:p-8 anim-scale-in">
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--color-cyan)] mb-2">
          ⏰ Check de realidad
        </div>
        <h2 className="font-display text-3xl mb-6">Llevas {stats.sessionMin} minutos jugando</h2>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-baseline">
            <span className="text-[var(--color-fg-dim)] text-sm">Apostado (24h)</span>
            <span className="font-display text-xl">${stats.wagered.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-[var(--color-fg-dim)] text-sm">Ganado (24h)</span>
            <span className="font-display text-xl">${stats.won.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-baseline pt-3 border-t border-[var(--color-border)]">
            <span className="text-white text-sm font-medium">Balance neto</span>
            <span className={`font-display text-2xl ${positive ? "text-[var(--color-emerald)]" : "text-[var(--color-magenta)]"}`}>
              {positive ? "+" : ""}${net.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="text-xs text-[var(--color-fg-muted)] mb-6 leading-relaxed">
          Recuerda: el bingo es entretenimiento. No juegues con dinero que no puedas permitirte perder.
        </div>

        <div className="flex gap-2">
          <a href="/account/exclude" className="btn btn-ghost flex-1 text-sm">
            Tomar descanso
          </a>
          <button onClick={() => setShow(false)} className="btn btn-primary flex-1">
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
