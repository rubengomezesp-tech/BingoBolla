"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Progress = {
  level: number;
  xp: number;
  next_level_xp: number;
  this_level_xp: number;
  streak_days: number;
  streak_claimable: boolean;
  sweeps: number;
  gold: number;
};

type Mission = {
  code: string;
  title: string;
  target: number;
  reward_sweeps: number;
  progress: number;
  completed: boolean;
};

export default function ProgressPanel() {
  const supabase = createClient();
  const router = useRouter();
  const [prog, setProg] = useState<Progress | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  async function load() {
    const [{ data: p }, { data: m }] = await Promise.all([
      supabase.rpc("my_progress"),
      supabase.rpc("my_missions"),
    ]);
    if (p) setProg(p as Progress);
    if (m) setMissions((m as Mission[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function claimStreak() {
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_streak");
    setClaiming(false);
    if (error || data?.error) return;
    const reward = Number(data?.reward_sweeps ?? 0);
    setFlash(`+${reward.toFixed(2)} 💎`);
    setTimeout(() => setFlash(null), 3000);
    await load();
    router.refresh();
  }

  if (loading) {
    return <div className="rounded-2xl bg-white/5 animate-pulse h-44 w-full" />;
  }
  if (!prog) return null;

  const span = Math.max(1, prog.next_level_xp - prog.this_level_xp);
  const done = Math.max(0, prog.xp - prog.this_level_xp);
  const pct = Math.min(100, Math.round((done / span) * 100));

  return (
    <div
      className="rounded-2xl p-5 border border-white/10"
      style={{ background: "rgba(255,255,255,0.03)" }}
    >
      {/* Nivel + barra XP */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <span className="font-semibold text-white">Nivel {prog.level}</span>
        </div>
        <span className="text-xs font-mono text-white/50">
          {prog.xp - prog.this_level_xp} / {span} XP
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-white/10 overflow-hidden mb-5">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #FFD93D, #C8941A)",
          }}
        />
      </div>

      {/* Misiones del dia */}
      <div className="text-[11px] uppercase tracking-wider text-white/40 mb-2">
        Misiones de hoy
      </div>
      <div className="space-y-2 mb-5">
        {missions.map((m) => {
          const mpct = Math.min(100, Math.round((m.progress / m.target) * 100));
          return (
            <div key={m.code} className="flex items-center gap-3">
              <span className="text-sm w-4">
                {m.completed ? "✅" : "⚪️"}
              </span>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className={m.completed ? "text-white/40 line-through" : "text-white/80"}>
                    {m.title}
                  </span>
                  <span className="font-mono text-white/40">
                    {Math.min(m.progress, m.target)}/{m.target} · +{Number(m.reward_sweeps).toFixed(2)} 💎
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${mpct}%`,
                      background: m.completed
                        ? "#2D6A4F"
                        : "linear-gradient(90deg, #FFD93D, #C8941A)",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Racha */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <span className="text-sm text-white/80">
          🔥 Racha {prog.streak_days} {prog.streak_days === 1 ? "día" : "días"}
        </span>
        {prog.streak_claimable ? (
          <button
            onClick={claimStreak}
            disabled={claiming}
            className="rounded-xl px-4 py-2 text-xs font-medium text-black transition-all hover:brightness-110 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #FFD93D, #C8941A)" }}
          >
            {flash ? flash : claiming ? "..." : "Reclamar bono de racha"}
          </button>
        ) : (
          <span className="text-xs font-mono text-white/40">
            {flash ? flash : "Reclamado hoy ✓"}
          </span>
        )}
      </div>
    </div>
  );
}
