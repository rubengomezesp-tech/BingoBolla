"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Coins,
  Gamepad2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import type { WorldOpsPayload, WorldOpsWindow } from "@/lib/world/ops-types";

type Props = {
  initialOps: WorldOpsPayload | null;
};

const WINDOW_OPTIONS: Array<{ label: string; value: WorldOpsWindow }> = [
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
];

function compactNumber(value: number) {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: value >= 100 ? 0 : 1 }).format(value);
}

function pct(value: number) {
  return `${compactNumber(value)}%`;
}

function duration(ms: number | null) {
  if (!ms || ms <= 0) return "n/d";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

function shortId(id: string) {
  return id ? id.slice(0, 8) : "n/d";
}

function gameName(game: string) {
  if (game === "ballmatch") return "Ball Match";
  if (game === "neural_cascade") return "Neural Cascade";
  return game || "Unknown";
}

function postureLabel(posture: WorldOpsPayload["health"]["risk_posture"]) {
  if (posture === "hot") return "Alta friccion";
  if (posture === "watch") return "En observacion";
  return "Normal";
}

function postureClass(posture: WorldOpsPayload["health"]["risk_posture"]) {
  if (posture === "hot") return "border-red-400/30 bg-red-500/10 text-red-200";
  if (posture === "watch") return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  return "border-emerald-300/25 bg-emerald-400/10 text-emerald-100";
}

export default function WorldOpsPanel({ initialOps }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const [ops, setOps] = useState(initialOps);
  const [windowKey, setWindowKey] = useState<WorldOpsWindow>(initialOps?.window ?? "24h");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxTrend = useMemo(() => {
    const values = ops?.trend.map((bucket) => Math.max(bucket.started, bucket.completed, bucket.high_risk)) ?? [1];
    return Math.max(1, ...values);
  }, [ops]);

  async function load(nextWindow = windowKey) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/world-ops?window=${nextWindow}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "world_ops_load_failed");
      setOps(payload);
      setWindowKey(nextWindow);
    } catch (err) {
      setError(err instanceof Error ? err.message : "world_ops_load_failed");
    } finally {
      setLoading(false);
    }
  }

  const entrance = prefersReducedMotion
    ? {}
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.22 } };

  return (
    <motion.section
      {...entrance}
      className="relative overflow-hidden rounded-2xl border border-cyan-300/15 bg-[#07111f] p-4 shadow-[0_24px_80px_-52px_rgba(0,229,255,.75)] md:p-5"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-100/60">
            <ShieldCheck size={14} aria-hidden="true" />
            World Ops cockpit
          </div>
          <h2 className="mt-2 font-display text-3xl leading-none md:text-4xl">Riesgo, economia y runs</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/[0.58]">
            Lectura operacional de las partidas emitidas por servidor, cobertura de auditoria y recompensas pagadas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-white/10 bg-black/20 p-1">
            {WINDOW_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => load(option.value)}
                className={`min-h-9 rounded-full px-3 text-xs font-black transition-all ${
                  windowKey === option.value
                    ? "bg-white text-black"
                    : "text-white/[0.56] hover:bg-white/10 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs font-black text-white transition-all hover:border-cyan-200/30 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={15} aria-hidden="true" />}
            Refrescar
          </button>
        </div>
      </div>

      {error && (
        <div className="relative mt-4 flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-100">
          <AlertTriangle size={16} aria-hidden="true" />
          {error}
        </div>
      )}

      {!ops ? (
        <div className="relative mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/50">
          Sin datos de World Ops todavia.
        </div>
      ) : (
        <div className="relative mt-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<Gamepad2 size={18} aria-hidden="true" />}
              label="Runs emitidos"
              value={compactNumber(ops.health.run_volume)}
              detail={`${compactNumber(ops.health.completed_runs)} completados`}
            />
            <MetricCard
              icon={<ShieldCheck size={18} aria-hidden="true" />}
              label="Cobertura auditada"
              value={pct(ops.health.audit_coverage_pct)}
              detail={`${compactNumber(ops.health.high_risk_runs)} high risk`}
            />
            <MetricCard
              icon={<Clock3 size={18} aria-hidden="true" />}
              label="Tiempo medio"
              value={duration(ops.health.avg_elapsed_ms)}
              detail={`${pct(ops.health.completion_rate_pct)} completion`}
            />
            <MetricCard
              icon={<Coins size={18} aria-hidden="true" />}
              label="Economia pagada"
              value={compactNumber(ops.health.gold_awarded)}
              detail={`${compactNumber(ops.health.xp_awarded)} XP`}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/[0.42]">
                    <Zap size={14} aria-hidden="true" />
                    Tendencia
                  </div>
                  <div className="mt-1 text-sm text-white/50">Started, completed y high-risk por bloque.</div>
                </div>
                <div className={`rounded-full border px-3 py-1 text-xs font-black ${postureClass(ops.health.risk_posture)}`}>
                  {postureLabel(ops.health.risk_posture)}
                </div>
              </div>

              <div className="mt-5 flex h-36 items-end gap-2 overflow-hidden">
                {ops.trend.map((bucket) => {
                  const startedHeight = Math.max(5, (bucket.started / maxTrend) * 100);
                  const completedHeight = Math.max(5, (bucket.completed / maxTrend) * 100);
                  const riskHeight = bucket.high_risk ? Math.max(8, (bucket.high_risk / maxTrend) * 100) : 0;
                  return (
                    <div key={bucket.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                      <div className="flex h-28 w-full items-end justify-center gap-1 rounded-lg bg-black/[0.18] px-1 py-1">
                        <span
                          className="w-2 rounded-full bg-cyan-300/70"
                          style={{ height: `${startedHeight}%` }}
                          title={`${bucket.label}: ${bucket.started} started`}
                        />
                        <span
                          className="w-2 rounded-full bg-emerald-300/80"
                          style={{ height: `${completedHeight}%` }}
                          title={`${bucket.label}: ${bucket.completed} completed`}
                        />
                        {riskHeight > 0 && (
                          <span
                            className="w-2 rounded-full bg-red-300/85"
                            style={{ height: `${riskHeight}%` }}
                            title={`${bucket.label}: ${bucket.high_risk} high risk`}
                          />
                        )}
                      </div>
                      <span className="max-w-full truncate text-[10px] font-mono text-white/[0.38]">{bucket.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/[0.42]">
                <Target size={14} aria-hidden="true" />
                Flags principales
              </div>
              <div className="mt-4 space-y-3">
                {ops.flag_breakdown.length === 0 ? (
                  <div className="rounded-xl border border-emerald-300/15 bg-emerald-400/10 p-3 text-sm font-bold text-emerald-100">
                    Sin flags de riesgo en esta ventana.
                  </div>
                ) : (
                  ops.flag_breakdown.map((flag) => (
                    <div key={flag.flag}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                        <span className="truncate font-mono text-white/70">{flag.flag}</span>
                        <span className="font-black text-white">{flag.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-300 to-red-300"
                          style={{ width: `${Math.min(100, flag.count * 18)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/[0.42]">
                <Trophy size={14} aria-hidden="true" />
                Breakdown por juego
              </div>
              <div className="mt-4 space-y-2">
                {ops.game_breakdown.map((game) => (
                  <div key={game.game} className="rounded-xl border border-white/[0.08] bg-black/[0.18] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-black">{gameName(game.game)}</div>
                      <div className="text-xs font-mono text-white/[0.45]">{compactNumber(game.runs)} runs</div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <MiniStat label="Done" value={compactNumber(game.completed)} />
                      <MiniStat label="Risk" value={compactNumber(game.high_risk)} />
                      <MiniStat label="Avg" value={compactNumber(game.avg_risk)} />
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-cyan-300" style={{ width: `${game.completion_rate_pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/[0.42]">
                  <AlertTriangle size={14} aria-hidden="true" />
                  Runs a revisar
                </div>
                {ops.limited && (
                  <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100">
                    Muestra limitada
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-2">
                {ops.recent_risk.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-400/10 p-3 text-sm font-bold text-emerald-100">
                    <CheckCircle2 size={16} aria-hidden="true" />
                    No hay runs con riesgo en esta ventana.
                  </div>
                ) : (
                  ops.recent_risk.map((run) => (
                    <div key={run.id} className="rounded-xl border border-white/[0.08] bg-black/[0.18] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-black">{gameName(run.game)}</div>
                          <div className="truncate font-mono text-[11px] text-white/[0.38]">
                            run {shortId(run.id)} · player {shortId(run.player_id)}
                          </div>
                        </div>
                        <div className={`rounded-full px-3 py-1 text-xs font-black ${run.validation_risk >= 75 ? "bg-red-400 text-black" : "bg-amber-300 text-black"}`}>
                          {run.validation_risk}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge>{compactNumber(run.score)} score</Badge>
                        <Badge>{run.stars} stars</Badge>
                        <Badge>{duration(run.client_elapsed_ms)}</Badge>
                        {run.flags.slice(0, 3).map((flag) => (
                          <Badge key={flag}>{flag}</Badge>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-white/[0.35]">
            <Sparkles size={13} aria-hidden="true" />
            Generado {new Date(ops.generated_at).toLocaleString("es-ES")} · started abiertos {ops.health.started_runs} · stale {ops.health.stale_runs}
          </div>
        </div>
      )}
    </motion.section>
  );
}

function MetricCard({
  detail,
  icon,
  label,
  value,
}: {
  detail: string;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-200/25 hover:bg-white/[0.065]">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-cyan-100">
          {icon}
        </div>
        <div className="text-right text-[10px] font-mono uppercase tracking-[0.14em] text-white/[0.36]">{label}</div>
      </div>
      <div className="mt-3 font-display text-3xl leading-none">{value}</div>
      <div className="mt-1 text-xs font-bold text-white/[0.45]">{detail}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-2">
      <div className="text-[10px] font-mono uppercase text-white/[0.35]">{label}</div>
      <div className="font-black text-white">{value}</div>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[11px] font-bold text-white/60">
      {children}
    </span>
  );
}
