"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Gamepad2,
  Loader2,
  MousePointerClick,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UsersRound,
} from "lucide-react";
import type { GameplayOpsPayload, GameplayOpsWindow } from "@/lib/telemetry/ops-types";

type Props = {
  initialOps: GameplayOpsPayload | null;
};

const WINDOW_OPTIONS: Array<{ label: string; value: GameplayOpsWindow }> = [
  { label: "1h", value: "1h" },
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
];

function compact(value: number) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: value >= 100 ? 0 : 1,
    notation: value >= 10000 ? "compact" : "standard",
  }).format(Number(value ?? 0));
}

function pct(value: number) {
  return `${compact(value)}%`;
}

function timeLabel(value: string | null) {
  if (!value) return "n/d";
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return "n/d";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "ahora";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

function eventLabel(eventName: string) {
  return eventName
    .replace("bolla_master.", "BM ")
    .replace("events.", "")
    .replaceAll("_", " ");
}

function insightClass(severity: GameplayOpsPayload["insights"][number]["severity"]) {
  if (severity === "hot") return "border-red-400/30 bg-red-500/10 text-red-100";
  if (severity === "watch") return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  return "border-emerald-300/25 bg-emerald-400/10 text-emerald-100";
}

function metadataSummary(metadata: Record<string, unknown>) {
  const title = typeof metadata.title === "string" ? metadata.title : "";
  const tab = typeof metadata.tab === "string" ? metadata.tab : "";
  const status = typeof metadata.status === "string" ? metadata.status : "";
  const source = typeof metadata.source === "string" ? metadata.source : "";
  const parts = [title, tab ? `tab ${tab}` : "", status, source].filter(Boolean);
  return parts.length ? parts.join(" · ") : "metadata limpia";
}

function maxCount(values: Array<{ count: number }>) {
  return Math.max(1, ...values.map((item) => item.count));
}

export default function GameplayOpsPanel({ initialOps }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const [ops, setOps] = useState(initialOps);
  const [windowKey, setWindowKey] = useState<GameplayOpsWindow>(initialOps?.window ?? "24h");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxEventCount = useMemo(() => maxCount(ops?.event_breakdown ?? []), [ops]);
  const maxSurfaceCount = useMemo(() => maxCount(ops?.surface_breakdown ?? []), [ops]);
  const maxTrend = useMemo(() => Math.max(1, ...(ops?.trend.map((bucket) => bucket.total) ?? [1])), [ops]);

  async function load(nextWindow = windowKey) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/gameplay-ops?window=${nextWindow}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "gameplay_ops_load_failed");
      setOps(payload);
      setWindowKey(nextWindow);
    } catch (err) {
      setError(err instanceof Error ? err.message : "gameplay_ops_load_failed");
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
      className="relative overflow-hidden rounded-2xl border border-fuchsia-300/15 bg-[#130719] p-4 shadow-[0_24px_80px_-54px_rgba(255,61,127,.7)] md:p-5"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-300/70 to-transparent" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-fuchsia-400/10 blur-3xl" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-fuchsia-100/60">
            <Activity size={14} aria-hidden="true" />
            Gameplay ops
          </div>
          <h2 className="mt-2 font-display text-3xl leading-none md:text-4xl">Clicks, loops y fricción</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/[0.58]">
            Lectura de eventos reales guardados por servidor: superficies, acciones, pestañas y señales de Bolla Master.
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
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs font-black text-white transition-all hover:border-fuchsia-200/30 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
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
          Sin datos de gameplay ops todavía.
        </div>
      ) : (
        <div className="relative mt-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Metric icon={<MousePointerClick size={18} aria-hidden="true" />} label="Eventos" value={compact(ops.health.total_events)} detail={`${compact(ops.health.events_per_player)} por jugador`} />
            <Metric icon={<UsersRound size={18} aria-hidden="true" />} label="Jugadores" value={compact(ops.health.unique_players)} detail={`último ${timeLabel(ops.health.latest_at)}`} />
            <Metric icon={<Smartphone size={18} aria-hidden="true" />} label="Mobile" value={pct(ops.health.mobile_pct)} detail="viewport ≤ 640" />
            <Metric icon={<Sparkles size={18} aria-hidden="true" />} label="Tabs eventos" value={compact(ops.health.tab_selects)} detail="exploración" />
            <Metric icon={<Gamepad2 size={18} aria-hidden="true" />} label="Bolla Master" value={compact(ops.health.bolla_events)} detail="loop profundo" />
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.05fr_.95fr]">
            <div className="rounded-xl border border-white/10 bg-black/18 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-sm font-black text-white">
                  <BarChart3 size={17} aria-hidden="true" />
                  Tendencia
                </div>
                {ops.limited && <span className="rounded-full bg-amber-300/12 px-2 py-1 text-[10px] font-black text-amber-100">muestra limitada</span>}
              </div>
              <div className="flex h-28 items-end gap-2">
                {ops.trend.length > 0 ? (
                  ops.trend.map((bucket) => (
                    <div key={bucket.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                      <div className="flex h-20 w-full items-end justify-center rounded-lg bg-white/[0.035] px-1">
                        <div
                          className="w-full max-w-8 rounded-t-md bg-gradient-to-t from-[#ff3d7f] via-[#b388ff] to-[#00e5ff]"
                          style={{ height: `${Math.max(5, (bucket.total / maxTrend) * 100)}%` }}
                          title={`${bucket.total} eventos`}
                        />
                      </div>
                      <span className="max-w-full truncate text-[10px] font-mono text-white/38">{bucket.label}</span>
                    </div>
                  ))
                ) : (
                  <div className="grid h-full w-full place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-sm text-white/45">
                    Sin tendencia todavía
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/18 p-4">
              <div className="mb-3 inline-flex items-center gap-2 text-sm font-black text-white">
                <ShieldCheck size={17} aria-hidden="true" />
                Señales
              </div>
              <div className="grid gap-2">
                {ops.insights.map((insight) => (
                  <div key={`${insight.title}-${insight.detail}`} className={`rounded-lg border px-3 py-2 ${insightClass(insight.severity)}`}>
                    <div className="flex items-center gap-2 text-sm font-black">
                      {insight.severity === "good" ? <CheckCircle2 size={15} aria-hidden="true" /> : <AlertTriangle size={15} aria-hidden="true" />}
                      {insight.title}
                    </div>
                    <p className="mt-1 text-xs leading-5 opacity-75">{insight.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Breakdown title="Superficies" items={ops.surface_breakdown.map((item) => ({ label: item.surface, count: item.count, detail: `${item.unique_players} jugadores` }))} max={maxSurfaceCount} />
            <Breakdown title="Eventos" items={ops.event_breakdown.map((item) => ({ label: eventLabel(item.event_name), count: item.count, detail: `${item.unique_players} jugadores · ${timeLabel(item.last_seen)}` }))} max={maxEventCount} />
          </div>

          <div className="rounded-xl border border-white/10 bg-black/18 p-4">
            <div className="mb-3 inline-flex items-center gap-2 text-sm font-black text-white">
              <MousePointerClick size={17} aria-hidden="true" />
              Acciones principales
            </div>
            {ops.action_breakdown.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-white/45">
                Sin acciones abiertas en esta ventana.
              </div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {ops.action_breakdown.map((action) => (
                  <div key={`${action.event_name}-${action.href}-${action.title}-${action.source}`} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-white">{action.title ?? action.label ?? eventLabel(action.event_name)}</div>
                        <div className="mt-1 truncate text-xs font-mono text-white/45">{action.href ?? action.source ?? action.event_name}</div>
                      </div>
                      <strong className="rounded-full bg-white px-2 py-1 text-xs font-black text-black">{action.count}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-black/18 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 text-sm font-black text-white">
                <Clock3 size={17} aria-hidden="true" />
                Últimos eventos
              </div>
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/35">sin PII</span>
            </div>
            {ops.recent_events.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-white/45">
                Sin eventos recientes.
              </div>
            ) : (
              <div className="grid gap-2">
                {ops.recent_events.slice(0, 12).map((event, index) => (
                  <div key={`${event.created_at}-${event.event_name}-${index}`} className="grid gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-xs md:grid-cols-[1fr_1fr_auto] md:items-center">
                    <div className="min-w-0">
                      <div className="truncate font-black text-white">{eventLabel(event.event_name)}</div>
                      <div className="mt-1 font-mono text-white/40">{event.surface} · {event.path ?? "/"}</div>
                    </div>
                    <div className="min-w-0 truncate text-white/58">{metadataSummary(event.metadata)}</div>
                    <div className="font-mono text-white/38 md:text-right">#{event.player_ref} · {timeLabel(event.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.section>
  );
}

function Metric({ detail, icon, label, value }: { detail: string; icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-white/42">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-display text-3xl leading-none text-white">{value}</div>
      <div className="mt-2 text-xs font-bold text-white/45">{detail}</div>
    </div>
  );
}

function Breakdown({
  items,
  max,
  title,
}: {
  items: Array<{ count: number; detail: string; label: string }>;
  max: number;
  title: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/18 p-4">
      <div className="mb-3 inline-flex items-center gap-2 text-sm font-black text-white">
        <BarChart3 size={17} aria-hidden="true" />
        {title}
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-white/45">
          Sin datos.
        </div>
      ) : (
        <div className="grid gap-3">
          {items.slice(0, 8).map((item) => (
            <div key={`${title}-${item.label}`} className="grid gap-1">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate font-black text-white">{item.label}</span>
                <span className="font-mono text-white/46">{item.count} · {item.detail}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#ff3d7f] to-[#00e5ff]"
                  style={{ width: `${Math.max(5, (item.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
