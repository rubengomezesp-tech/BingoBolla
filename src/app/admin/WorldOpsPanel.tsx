"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Coins,
  Gauge,
  Gamepad2,
  History,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trophy,
  WandSparkles,
  Zap,
} from "lucide-react";
import type {
  WorldOpsPayload,
  WorldOpsWindow,
  WorldTuningAuditEntry,
  WorldTuningImpact,
} from "@/lib/world/ops-types";

type Props = {
  initialOps: WorldOpsPayload | null;
};

type TuningDraft = {
  max_stars: string;
  reason: string;
  reward_gold: string;
  reward_xp: string;
};

type BalanceNodeCard = WorldOpsPayload["balance"]["node_cards"][number];

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

function economyLabel(posture: WorldOpsPayload["balance"]["health"]["economy_posture"]) {
  if (posture === "generous") return "Generosa";
  if (posture === "lean") return "Ajustada";
  if (posture === "volatile") return "Volatil";
  if (posture === "insufficient_data") return "Sin muestra";
  return "Balanceada";
}

function difficultyLabel(posture: WorldOpsPayload["balance"]["health"]["difficulty_posture"]) {
  if (posture === "spiky") return "Con picos";
  if (posture === "undertuned") return "Suave";
  if (posture === "insufficient_data") return "Sin muestra";
  return "Fluida";
}

function balanceTone(value: string) {
  if (value === "volatile" || value === "spiky") return "border-red-400/30 bg-red-500/10 text-red-100";
  if (value === "generous" || value === "lean" || value === "undertuned") return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  if (value === "insufficient_data") return "border-white/15 bg-white/[0.06] text-white/60";
  return "border-emerald-300/25 bg-emerald-400/10 text-emerald-100";
}

function severityClass(severity: WorldOpsPayload["balance"]["recommendations"][number]["severity"]) {
  if (severity === "critical") return "border-red-400/25 bg-red-500/10 text-red-100";
  if (severity === "warning") return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  return "border-cyan-300/20 bg-cyan-300/10 text-cyan-100";
}

function typeLabel(type: WorldOpsPayload["balance"]["recommendations"][number]["type"]) {
  if (type === "difficulty") return "Dificultad";
  if (type === "economy") return "Economia";
  if (type === "risk") return "Riesgo";
  return "Retencion";
}

function signed(value: number, suffix = "") {
  if (value === 0) return `0${suffix}`;
  return `${value > 0 ? "+" : ""}${compactNumber(value)}${suffix}`;
}

function guardrailClass(tone: WorldTuningImpact["guardrails"][number]["tone"]) {
  if (tone === "danger") return "border-red-400/30 bg-red-500/10 text-red-100";
  if (tone === "watch") return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  return "border-emerald-300/25 bg-emerald-400/10 text-emerald-100";
}

function draftFromNode(node: BalanceNodeCard | null): TuningDraft {
  return {
    max_stars: node ? String(node.max_stars) : "3",
    reason: "",
    reward_gold: node ? String(node.reward_gold) : "0",
    reward_xp: node ? String(node.reward_xp) : "0",
  };
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

          <BalanceLab ops={ops} onOps={setOps} windowKey={windowKey} />

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

function BalanceLab({
  onOps,
  ops,
  windowKey,
}: {
  onOps: (ops: WorldOpsPayload) => void;
  ops: WorldOpsPayload;
  windowKey: WorldOpsWindow;
}) {
  const balance = ops.balance;
  const maxPressure = Math.max(120, ...balance.reward_curve.map((node) => node.reward_pressure));
  const tuningNodes = useMemo(() => balance.node_cards.slice(0, 8), [balance.node_cards]);
  const [selectedId, setSelectedId] = useState(tuningNodes[0]?.node_id ?? "");
  const selectedNode = tuningNodes.find((node) => node.node_id === selectedId) ?? tuningNodes[0] ?? null;
  const [draft, setDraft] = useState<TuningDraft>(() => draftFromNode(selectedNode));
  const [preview, setPreview] = useState<WorldTuningImpact | null>(null);
  const [history, setHistory] = useState<WorldTuningAuditEntry[]>([]);
  const [tuningBusy, setTuningBusy] = useState<"preview" | "apply" | null>(null);
  const [tuningError, setTuningError] = useState<string | null>(null);
  const [tuningSuccess, setTuningSuccess] = useState<string | null>(null);
  const draftChanged = Boolean(
    selectedNode &&
      (Number(draft.reward_xp) !== selectedNode.reward_xp ||
        Number(draft.reward_gold) !== selectedNode.reward_gold ||
        Number(draft.max_stars) !== selectedNode.max_stars)
  );

  useEffect(() => {
    if (!selectedNode) return;
    if (selectedNode.node_id !== selectedId) {
      setSelectedId(selectedNode.node_id);
      return;
    }
    setDraft((current) => ({
      ...draftFromNode(selectedNode),
      reason: current.reason,
    }));
    setPreview(null);
    setTuningError(null);
    setTuningSuccess(null);
  }, [selectedNode?.node_id, selectedId]);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/world-tuning", { cache: "no-store" })
      .then((response) => response.json().then((payload) => ({ ok: response.ok, payload })))
      .then(({ ok, payload }) => {
        if (!active || !ok || !Array.isArray(payload?.history)) return;
        setHistory(payload.history);
      })
      .catch(() => {
        if (active) setHistory([]);
      });
    return () => {
      active = false;
    };
  }, []);

  function updateDraft(key: keyof TuningDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
    setPreview(null);
    setTuningError(null);
    setTuningSuccess(null);
  }

  async function submitTuning(action: "preview" | "apply") {
    if (!selectedNode) return;
    setTuningBusy(action);
    setTuningError(null);
    setTuningSuccess(null);

    try {
      const response = await fetch(`/api/admin/world-tuning?window=${windowKey}`, {
        body: JSON.stringify({
          action,
          max_stars: draft.max_stars,
          node_id: selectedNode.node_id,
          reason: draft.reason,
          reward_gold: draft.reward_gold,
          reward_xp: draft.reward_xp,
        }),
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "world_tuning_failed");

      if (payload?.impact) setPreview(payload.impact);
      if (Array.isArray(payload?.history)) setHistory(payload.history);
      if (payload?.ops) onOps(payload.ops);
      if (action === "apply") setTuningSuccess("Ajuste aplicado y auditado.");
    } catch (err) {
      setTuningError(err instanceof Error ? err.message : "world_tuning_failed");
    } finally {
      setTuningBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-300/15 bg-[#151107] p-4 shadow-[0_24px_80px_-56px_rgba(245,158,11,.7)] md:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-amber-100/60">
            <SlidersHorizontal size={14} aria-hidden="true" />
            Balance Lab
          </div>
          <h3 className="mt-2 font-display text-3xl leading-none">Economia, dificultad y retencion</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/[0.58]">
            Diagnostico read-only: detecta nodos frios, friccion alta, payout relativo y zonas donde conviene ajustar antes de lanzar eventos.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[520px]">
          <BalancePill
            icon={<Coins size={15} aria-hidden="true" />}
            label="Economia"
            tone={balanceTone(balance.health.economy_posture)}
            value={economyLabel(balance.health.economy_posture)}
          />
          <BalancePill
            icon={<Gauge size={15} aria-hidden="true" />}
            label="Dificultad"
            tone={balanceTone(balance.health.difficulty_posture)}
            value={difficultyLabel(balance.health.difficulty_posture)}
          />
          <BalancePill
            icon={<Activity size={15} aria-hidden="true" />}
            label="Senal"
            tone="border-white/15 bg-white/[0.06] text-white/70"
            value={`${balance.health.nodes_with_signal}/${balance.health.active_nodes}`}
          />
          <BalancePill
            icon={<BarChart3 size={15} aria-hidden="true" />}
            label="Reward"
            tone="border-white/15 bg-white/[0.06] text-white/70"
            value={`${balance.health.reward_pressure}`}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
        <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/[0.42]">
              <Target size={14} aria-hidden="true" />
              Nodos para ajustar
            </div>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100">
              Hot queue
            </span>
          </div>

          <div className="mt-4 grid gap-2">
            {tuningNodes.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm font-bold text-white/50">
                Sin nodos activos para tuning.
              </div>
            ) : (
              tuningNodes.map((node) => {
                const active = selectedNode?.node_id === node.node_id;
                return (
                  <button
                    key={node.node_id}
                    type="button"
                    onClick={() => setSelectedId(node.node_id)}
                    className={`grid min-h-16 grid-cols-[46px_1fr_auto] items-center gap-3 rounded-xl border px-3 text-left transition-all duration-200 ${
                      active
                        ? "border-amber-200/45 bg-amber-300/15 shadow-[0_16px_40px_-28px_rgba(251,191,36,.85)]"
                        : "border-white/[0.08] bg-black/[0.18] hover:border-white/18 hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] font-mono text-xs font-black text-amber-100">
                      N{node.node_index}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-white">{node.title}</span>
                      <span className="mt-0.5 block truncate text-[11px] font-mono text-white/[0.4]">
                        {gameName(node.game)} · F{node.friction_score} · Risk {compactNumber(node.avg_risk)}
                      </span>
                    </span>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-black">Pay {node.reward_pressure}</span>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-4 rounded-xl border border-white/[0.08] bg-black/[0.18] p-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/[0.42]">
              <History size={14} aria-hidden="true" />
              Auditoria reciente
            </div>
            <div className="mt-3 space-y-2">
              {history.length === 0 ? (
                <div className="text-sm font-bold text-white/[0.42]">Todavia no hay ajustes aplicados.</div>
              ) : (
                history.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 truncate text-xs font-black text-white">
                        N{item.after.node_index} · {item.after.title || shortId(item.node_id)}
                      </div>
                      <div className="shrink-0 font-mono text-[10px] text-white/[0.35]">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString("es-ES") : "n/d"}
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-mono text-white/[0.48]">
                      <span>{compactNumber(item.before.reward_gold)}G</span>
                      <ArrowRight size={12} aria-hidden="true" />
                      <span>{compactNumber(item.after.reward_gold)}G</span>
                      <span>{compactNumber(item.before.reward_xp)}XP</span>
                      <ArrowRight size={12} aria-hidden="true" />
                      <span>{compactNumber(item.after.reward_xp)}XP</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-300/15 bg-black/[0.22] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-amber-100/55">
                <LockKeyhole size={14} aria-hidden="true" />
                Tuning controlado
              </div>
              <div className="mt-1 font-display text-2xl leading-none">
                {selectedNode ? `${selectedNode.node_index}. ${selectedNode.title}` : "Selecciona nodo"}
              </div>
            </div>
            {selectedNode && (
              <div className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-black text-white/60">
                {gameName(selectedNode.game)}
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <TuningField
              icon={<Zap size={15} aria-hidden="true" />}
              label="XP"
              max={5000}
              min={0}
              onChange={(value) => updateDraft("reward_xp", value)}
              value={draft.reward_xp}
            />
            <TuningField
              icon={<Coins size={15} aria-hidden="true" />}
              label="Gold"
              max={1000000}
              min={0}
              onChange={(value) => updateDraft("reward_gold", value)}
              value={draft.reward_gold}
            />
            <TuningField
              icon={<Trophy size={15} aria-hidden="true" />}
              label="Stars"
              max={3}
              min={1}
              onChange={(value) => updateDraft("max_stars", value)}
              value={draft.max_stars}
            />
          </div>

          <label className="mt-3 block">
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/[0.42]">Motivo de balance</span>
            <textarea
              value={draft.reason}
              onChange={(event) => updateDraft("reason", event.target.value)}
              maxLength={240}
              rows={3}
              className="mt-2 min-h-20 w-full resize-none rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2 text-sm font-bold text-white outline-none transition-all placeholder:text-white/25 focus:border-amber-200/45 focus:bg-white/[0.08]"
              placeholder="Ej: suavizar onboarding del mundo Miami sin subir payout por encima de la mediana."
            />
          </label>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => submitTuning("preview")}
              disabled={!selectedNode || !draftChanged || tuningBusy !== null}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-4 text-xs font-black text-white transition-all hover:border-amber-200/35 hover:bg-white/[0.11] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {tuningBusy === "preview" ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <WandSparkles size={15} aria-hidden="true" />}
              Preview
            </button>
            <button
              type="button"
              onClick={() => submitTuning("apply")}
              disabled={!selectedNode || !draftChanged || !preview || draft.reason.trim().length < 8 || tuningBusy !== null}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-amber-300 px-4 text-xs font-black text-black transition-all hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {tuningBusy === "apply" ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
              Aplicar auditado
            </button>
            <span className="text-[11px] font-mono text-white/[0.35]">
              Preview obligatorio · motivo minimo 8 chars
            </span>
          </div>

          {tuningError && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm font-black text-red-100">
              <AlertTriangle size={15} aria-hidden="true" />
              {tuningError}
            </div>
          )}
          {tuningSuccess && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-sm font-black text-emerald-100">
              <CheckCircle2 size={15} aria-hidden="true" />
              {tuningSuccess}
            </div>
          )}

          <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.035] p-3">
            {preview ? (
              <>
                <div className="grid gap-2 sm:grid-cols-4">
                  <ImpactMetric label="XP" value={signed(preview.delta.reward_xp)} />
                  <ImpactMetric label="Gold" value={signed(preview.delta.reward_gold)} />
                  <ImpactMetric label="Stars" value={signed(preview.delta.max_stars)} />
                  <ImpactMetric label="Pressure" value={signed(preview.delta.reward_pressure_pct, "%")} />
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {preview.guardrails.map((item) => (
                    <div key={`${item.label}:${item.detail}`} className={`rounded-xl border px-3 py-2 ${guardrailClass(item.tone)}`}>
                      <div className="text-xs font-black">{item.label}</div>
                      <div className="mt-1 text-[11px] leading-4 opacity-75">{item.detail}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm font-bold text-white/[0.45]">
                <Sparkles size={16} aria-hidden="true" />
                Ajusta valores y genera preview para ver impacto economico antes de aplicar.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1.05fr]">
        <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/[0.42]">
              <Target size={14} aria-hidden="true" />
              Recomendaciones quirurgicas
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-black text-white/[0.52]">
              {balance.recommendations.length}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {balance.recommendations.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-400/10 p-3 text-sm font-bold text-emerald-100">
                <CheckCircle2 size={16} aria-hidden="true" />
                Sin ajustes urgentes con la muestra actual.
              </div>
            ) : (
              balance.recommendations.map((item) => (
                <div key={item.id} className={`rounded-xl border p-3 ${severityClass(item.severity)}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black">{item.title}</div>
                      <div className="mt-0.5 text-[11px] font-mono opacity-70">
                        {typeLabel(item.type)}{item.node_index ? ` · Nodo ${item.node_index}` : ""} · {item.confidence}% conf.
                      </div>
                    </div>
                    <span className="rounded-full bg-black/20 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
                      {item.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 opacity-80">{item.detail}</p>
                  <p className="mt-2 text-xs font-bold leading-5 text-white">{item.action}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/[0.42]">
            <BarChart3 size={14} aria-hidden="true" />
            Nodos calientes
          </div>
          <div className="mt-4 space-y-2">
            {balance.node_cards.slice(0, 6).map((node) => (
              <div key={node.node_id} className="rounded-xl border border-white/[0.08] bg-black/[0.18] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-black">
                      {node.node_index}. {node.title}
                    </div>
                    <div className="mt-0.5 text-[11px] font-mono text-white/[0.38]">
                      {gameName(node.game)} · {node.node_type} · {node.run_count} runs
                    </div>
                  </div>
                  <div className="rounded-full bg-white text-black px-2 py-1 text-xs font-black">
                    F{node.friction_score}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  <MiniStat label="Conv" value={pct(node.completion_rate_pct)} />
                  <MiniStat label="Star" value={pct(node.star_rate_pct)} />
                  <MiniStat label="Risk" value={compactNumber(node.avg_risk)} />
                  <MiniStat label="Pay" value={`${node.reward_pressure}`} />
                </div>
                <div className="mt-3 text-xs font-bold leading-5 text-white/[0.68]">{node.recommendation}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/[0.42]">
            <Zap size={14} aria-hidden="true" />
            Curva de recompensa
          </div>
          <div className="text-[11px] font-mono text-white/[0.38]">
            Gold/XP normalizado contra la mediana del mundo
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          {balance.reward_curve.map((node) => (
            <div key={`${node.node_index}:${node.title}`} className="grid grid-cols-[42px_1fr_56px] items-center gap-3">
              <div className="font-mono text-[11px] text-white/[0.44]">N{node.node_index}</div>
              <div className="min-w-0">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="truncate text-xs font-bold text-white/70">{node.title}</span>
                  <span className="shrink-0 text-[11px] font-mono text-white/[0.42]">
                    {compactNumber(node.reward_gold)}G · {compactNumber(node.reward_xp)}XP
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-black/30">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-300 via-cyan-300 to-emerald-300"
                    style={{ width: `${Math.min(100, (node.reward_pressure / maxPressure) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-right font-mono text-xs font-black text-amber-100">{node.reward_pressure}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BalancePill({
  icon,
  label,
  tone,
  value,
}: {
  icon: ReactNode;
  label: string;
  tone: string;
  value: string;
}) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${tone}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] opacity-70">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-black">{value}</div>
    </div>
  );
}

function TuningField({
  icon,
  label,
  max,
  min,
  onChange,
  value,
}: {
  icon: ReactNode;
  label: string;
  max: number;
  min: number;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2">
      <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-white/[0.42]">
        {icon}
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-9 w-full bg-transparent text-lg font-black text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </label>
  );
}

function ImpactMetric({ label, value }: { label: string; value: string }) {
  const positive = value.startsWith("+");
  const negative = value.startsWith("-");
  return (
    <div className="rounded-lg border border-white/[0.08] bg-black/[0.2] px-3 py-2">
      <div className="text-[10px] font-mono uppercase text-white/[0.35]">{label}</div>
      <div className={`font-black ${positive ? "text-emerald-100" : negative ? "text-amber-100" : "text-white"}`}>
        {value}
      </div>
    </div>
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
