"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Coins,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Table2,
  Ticket,
} from "lucide-react";
import type { GameplayOpsPayload } from "@/lib/telemetry/ops-types";
import type { WorldOpsPayload } from "@/lib/world/ops-types";
import GameplayOpsPanel from "./GameplayOpsPanel";
import WorldOpsPanel from "./WorldOpsPanel";

type AdminModule = "gameplay" | "worlds" | "economy" | "codes";

type ModuleCard = {
  detail: string;
  icon: ReactNode;
  id: AdminModule;
  label: string;
  status: string;
  value: string;
};

function compactNumber(value: number) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: value >= 100 ? 0 : 1,
    notation: value >= 10000 ? "compact" : "standard",
  }).format(Number(value ?? 0));
}

function usd(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    style: "currency",
  }).format(Number(value ?? 0));
}

export default function AdminClient({
  initialCodes,
  initialGameplayOps,
  initialStats,
  initialWorldOps,
}: {
  initialCodes: any[];
  initialGameplayOps: GameplayOpsPayload | null;
  initialStats: any;
  initialWorldOps: WorldOpsPayload | null;
}) {
  const [activeModule, setActiveModule] = useState<AdminModule>("gameplay");
  const [stats, setStats] = useState(initialStats);
  const [codes, setCodes] = useState(initialCodes);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Grant coins
  const [gEmail, setGEmail] = useState("");
  const [gGold, setGGold] = useState("");
  const [gSweeps, setGSweeps] = useState("");
  const [gDiamonds, setGDiamonds] = useState("");

  // Create code
  const [cCode, setCCode] = useState("");
  const [cKind, setCKind] = useState<"coins" | "discount">("coins");
  const [cGold, setCGold] = useState("");
  const [cSweeps, setCSweeps] = useState("");
  const [cDiamonds, setCDiamonds] = useState("");
  const [cDiscount, setCDiscount] = useState("");
  const [cMaxUses, setCMaxUses] = useState("1");
  const [cExpires, setCExpires] = useState("0");

  function flash(ok: boolean, text: string) {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 4000);
  }

  async function adminRequest(body?: Record<string, unknown>) {
    const response = await fetch("/api/admin", {
      method: body ? "POST" : "GET",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error ?? "admin_request_failed");
    }
    return payload;
  }

  async function refreshStats() {
    try {
      const data = await adminRequest();
      if (data.stats && !data.stats.error) setStats(data.stats);
      if (data.codes) setCodes(data.codes);
    } catch (error: any) {
      flash(false, error?.message ?? "Error");
    }
  }

  async function grantCoins() {
    if (!gEmail) return flash(false, "Email requerido");
    try {
      await adminRequest({
        action: "grant_coins",
        email: gEmail,
        gold: Number(gGold) || 0,
        sweeps: Number(gSweeps) || 0,
        diamonds: Number(gDiamonds) || 0,
      });
      flash(true, `Coins acreditados a ${gEmail}`);
      setGGold(""); setGSweeps(""); setGDiamonds("");
      refreshStats();
    } catch (error: any) {
      flash(false, error?.message ?? "Error");
    }
  }

  async function createCode() {
    if (!cCode) return flash(false, "Código requerido");
    try {
      const data = await adminRequest({
        action: "create_code",
        code: cCode,
        kind: cKind,
        gold: Number(cGold) || 0,
        sweeps: Number(cSweeps) || 0,
        diamonds: Number(cDiamonds) || 0,
        discount_pct: Number(cDiscount) || 0,
        max_uses: Number(cMaxUses) || 1,
        expires_days: Number(cExpires) || 0,
      });
      flash(true, `Código ${data.code} creado`);
      setCCode(""); setCGold(""); setCSweeps(""); setCDiamonds(""); setCDiscount("");
      refreshStats();
    } catch (error: any) {
      flash(false, error?.message ?? "Error");
    }
  }

  const inputCls = "w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-sm focus:border-[var(--color-magenta)]/50 outline-none";

  const modules = useMemo<ModuleCard[]>(() => {
    const totalEvents = initialGameplayOps?.health.total_events ?? 0;
    const worldRuns = initialWorldOps?.health.run_volume ?? 0;
    const worldRisk = initialWorldOps?.health.risk_posture ?? "normal";
    const activeCodes = stats?.codes_active ?? codes.filter((code: any) => code.active).length;

    return [
      {
        detail: `${compactNumber(initialGameplayOps?.health.unique_players ?? 0)} jugadores`,
        icon: <Activity size={18} aria-hidden="true" />,
        id: "gameplay",
        label: "Gameplay",
        status: "Fricción",
        value: `${compactNumber(totalEvents)} eventos`,
      },
      {
        detail: `${compactNumber(initialWorldOps?.health.completed_runs ?? 0)} completados`,
        icon: <BarChart3 size={18} aria-hidden="true" />,
        id: "worlds",
        label: "Mundos",
        status: worldRisk === "hot" ? "Riesgo alto" : worldRisk === "watch" ? "En observación" : "Normal",
        value: `${compactNumber(worldRuns)} runs`,
      },
      {
        detail: `${compactNumber(stats?.total_purchases ?? 0)} compras`,
        icon: <Coins size={18} aria-hidden="true" />,
        id: "economy",
        label: "Economía",
        status: "Resumen",
        value: usd(stats?.revenue_usd ?? 0),
      },
      {
        detail: `${compactNumber(codes.length)} creados`,
        icon: <Ticket size={18} aria-hidden="true" />,
        id: "codes",
        label: "Códigos",
        status: "Promos",
        value: `${compactNumber(activeCodes)} activos`,
      },
    ];
  }, [codes, initialGameplayOps, initialWorldOps, stats]);

  const activeLabel = modules.find((module) => module.id === activeModule)?.label ?? "Gameplay";

  return (
    <div className="min-h-screen bg-[#08080c] text-white grain">
      <header className="sticky top-0 z-30 bg-[#08080c]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <Link href="/lobby" className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white">
            <ArrowLeft size={15} aria-hidden="true" />
            Lobby
          </Link>
          <div className="inline-flex items-center gap-2 text-sm font-black tracking-tight sm:text-base">
            <ShieldCheck size={18} aria-hidden="true" />
            Admin Panel
          </div>
          <div className="text-[10px] font-mono text-white/40">RESTRINGIDO</div>
        </div>
      </header>

      {msg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 px-4">
          <div className={`px-5 py-3 rounded-xl font-medium text-sm border ${msg.ok ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" : "bg-red-500/15 border-red-500/40 text-red-300"}`}>
            {msg.text}
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-5 md:py-8">
        <section className="mb-5 rounded-2xl border border-white/10 bg-[#10101a] p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-mono uppercase tracking-[0.14em] text-white/45">
                <ShieldCheck size={13} aria-hidden="true" />
                Control room
              </div>
              <h1 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">Operaciones BingoBolla</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
                Señales de juego, balance y administración separadas por módulo para decidir rápido.
              </p>
            </div>

            <button
              type="button"
              onClick={refreshStats}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 text-sm font-black text-white transition-all hover:border-cyan-200/30 hover:bg-white/[0.1]"
            >
              <RefreshCw size={16} aria-hidden="true" />
              Refrescar resumen
            </button>
          </div>

          <div
            aria-label="Módulos de administración"
            className="mt-5 grid grid-cols-4 gap-1.5 sm:gap-2"
            role="tablist"
          >
            {modules.map((module) => {
              const active = module.id === activeModule;
              return (
                <button
                  key={module.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveModule(module.id)}
                  className={`min-h-[82px] rounded-xl border p-2 text-left transition-all sm:min-h-[92px] sm:p-3 ${
                    active
                      ? "border-cyan-200/40 bg-cyan-300/10 text-white"
                      : "border-white/10 bg-black/18 text-white/65 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${active ? "bg-cyan-300 text-black" : "bg-white/[0.08] text-white/60"}`}>
                      {module.icon}
                    </span>
                    <span className="hidden rounded-full border border-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white/45 sm:inline-flex">
                      {module.status}
                    </span>
                  </div>
                  <div className="mt-2 truncate text-[11px] font-black sm:mt-3 sm:text-sm">{module.label}</div>
                  <div className="mt-1 truncate text-xs font-black leading-none sm:text-lg">{module.value}</div>
                  <div className="mt-2 hidden text-xs font-bold text-white/45 sm:block">{module.detail}</div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/38">Módulo activo</div>
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black text-white/60">{activeLabel}</div>
        </div>

        {activeModule === "gameplay" && <GameplayOpsPanel initialOps={initialGameplayOps} />}
        {activeModule === "worlds" && <WorldOpsPanel initialOps={initialWorldOps} />}
        {activeModule === "economy" && <EconomyPanel stats={stats} />}
        {activeModule === "codes" && (
          <PromoOpsPanel
            cCode={cCode}
            cDiamonds={cDiamonds}
            cDiscount={cDiscount}
            cExpires={cExpires}
            cGold={cGold}
            cKind={cKind}
            cMaxUses={cMaxUses}
            cSweeps={cSweeps}
            codes={codes}
            createCode={createCode}
            gDiamonds={gDiamonds}
            gEmail={gEmail}
            gGold={gGold}
            gSweeps={gSweeps}
            grantCoins={grantCoins}
            inputCls={inputCls}
            setCCode={setCCode}
            setCDiamonds={setCDiamonds}
            setCDiscount={setCDiscount}
            setCExpires={setCExpires}
            setCGold={setCGold}
            setCKind={setCKind}
            setCMaxUses={setCMaxUses}
            setCSweeps={setCSweeps}
            setGDiamonds={setGDiamonds}
            setGEmail={setGEmail}
            setGGold={setGGold}
            setGSweeps={setGSweeps}
          />
        )}
      </main>
    </div>
  );
}

function EconomyPanel({ stats }: { stats: any }) {
  const rows = [
    ["Usuarios", compactNumber(stats?.total_users ?? 0)],
    ["Partidas", compactNumber(stats?.total_games ?? 0)],
    ["Tiradas slot", compactNumber(stats?.total_spins ?? 0)],
    ["Ingresos", usd(stats?.revenue_usd ?? 0)],
    ["Compras", compactNumber(stats?.total_purchases ?? 0)],
    ["Salas activas", compactNumber(stats?.active_games ?? 0)],
    ["Códigos activos", compactNumber(stats?.codes_active ?? 0)],
    ["Canjes", compactNumber(stats?.codes_redeemed ?? 0)],
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-[#10101a] p-4 md:p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-emerald-100/55">
            <Coins size={14} aria-hidden="true" />
            Economía
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Resumen interno</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-white/50">
          Foto rápida para operar soporte, actividad y monetización sin entrar a Supabase.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-black/18 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-white/38">{label}</div>
            <div className="mt-2 text-2xl font-black leading-none text-white">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PromoOpsPanel({
  cCode,
  cDiamonds,
  cDiscount,
  cExpires,
  cGold,
  cKind,
  cMaxUses,
  cSweeps,
  codes,
  createCode,
  gDiamonds,
  gEmail,
  gGold,
  gSweeps,
  grantCoins,
  inputCls,
  setCCode,
  setCDiamonds,
  setCDiscount,
  setCExpires,
  setCGold,
  setCKind,
  setCMaxUses,
  setCSweeps,
  setGDiamonds,
  setGEmail,
  setGGold,
  setGSweeps,
}: {
  cCode: string;
  cDiamonds: string;
  cDiscount: string;
  cExpires: string;
  cGold: string;
  cKind: "coins" | "discount";
  cMaxUses: string;
  cSweeps: string;
  codes: any[];
  createCode: () => void;
  gDiamonds: string;
  gEmail: string;
  gGold: string;
  gSweeps: string;
  grantCoins: () => void;
  inputCls: string;
  setCCode: (value: string) => void;
  setCDiamonds: (value: string) => void;
  setCDiscount: (value: string) => void;
  setCExpires: (value: string) => void;
  setCGold: (value: string) => void;
  setCKind: (value: "coins" | "discount") => void;
  setCMaxUses: (value: string) => void;
  setCSweeps: (value: string) => void;
  setGDiamonds: (value: string) => void;
  setGEmail: (value: string) => void;
  setGGold: (value: string) => void;
  setGSweeps: (value: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[.95fr_1.05fr]">
      <div className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-[#10101a] p-4 md:p-5">
          <h2 className="mb-4 inline-flex items-center gap-2 font-display text-xl">
            <Coins size={19} aria-hidden="true" />
            Dar coins a usuario
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            <input className={inputCls} placeholder="Email del usuario" value={gEmail} onChange={(e) => setGEmail(e.target.value)} />
            <div className="grid gap-2 sm:grid-cols-3">
              <input className={inputCls} placeholder="Gold" value={gGold} onChange={(e) => setGGold(e.target.value)} />
              <input className={inputCls} placeholder="Sweeps" value={gSweeps} onChange={(e) => setGSweeps(e.target.value)} />
              <input className={inputCls} placeholder="Diamonds" value={gDiamonds} onChange={(e) => setGDiamonds(e.target.value)} />
            </div>
          </div>
          <button onClick={grantCoins} className="mt-4 px-5 py-2.5 rounded-lg bg-[var(--color-magenta)] text-white font-medium text-sm hover:brightness-110 transition-all">
            <Coins size={16} aria-hidden="true" className="mr-2 inline" />
            Acreditar
          </button>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#10101a] p-4 md:p-5">
          <h2 className="mb-4 inline-flex items-center gap-2 font-display text-xl">
            <Ticket size={19} aria-hidden="true" />
            Crear código
          </h2>
          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <input className={inputCls} placeholder="CÓDIGO (ej: BINGO500)" value={cCode} onChange={(e) => setCCode(e.target.value.toUpperCase())} />
            <select className={inputCls} value={cKind} onChange={(e) => setCKind(e.target.value as any)}>
              <option value="coins">Coins (regala monedas)</option>
              <option value="discount">Descuento (% en tienda)</option>
            </select>
          </div>
          {cKind === "coins" ? (
            <div className="mb-3 grid gap-2 sm:grid-cols-3">
              <input className={inputCls} placeholder="Gold" value={cGold} onChange={(e) => setCGold(e.target.value)} />
              <input className={inputCls} placeholder="Sweeps" value={cSweeps} onChange={(e) => setCSweeps(e.target.value)} />
              <input className={inputCls} placeholder="Diamonds" value={cDiamonds} onChange={(e) => setCDiamonds(e.target.value)} />
            </div>
          ) : (
            <div className="mb-3">
              <input className={inputCls} placeholder="% descuento (ej: 20)" value={cDiscount} onChange={(e) => setCDiscount(e.target.value)} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <input className={inputCls} placeholder="Máx usos" value={cMaxUses} onChange={(e) => setCMaxUses(e.target.value)} />
            <input className={inputCls} placeholder="Días caducidad (0 = nunca)" value={cExpires} onChange={(e) => setCExpires(e.target.value)} />
          </div>
          <button onClick={createCode} className="px-5 py-2.5 rounded-lg bg-[var(--color-gold)] text-black font-medium text-sm hover:brightness-110 transition-all">
            <KeyRound size={16} aria-hidden="true" className="mr-2 inline" />
            Crear código
          </button>
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-[#10101a] p-4 md:p-5">
          <h2 className="mb-4 inline-flex items-center gap-2 font-display text-xl">
            <Table2 size={19} aria-hidden="true" />
            Códigos existentes
          </h2>
          {codes.length === 0 ? (
            <div className="text-white/40 text-sm">No hay códigos aún</div>
          ) : (
            <div className="grid gap-2">
              {codes.map((c: any) => (
                <div key={c.code} className="grid gap-2 rounded-lg border border-white/5 bg-white/[0.03] p-3 text-sm sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="truncate font-mono font-bold">{c.code}</div>
                    <div className="mt-1 text-xs text-white/50">
                      {c.kind === "coins"
                        ? `Gold ${c.gold} · Sweeps ${c.sweeps} · Diamonds ${c.diamonds}`
                        : `${c.discount_pct}% desc`}
                    </div>
                  </div>
                  <div className="font-mono text-xs text-white/40">{c.uses}/{c.max_uses}</div>
                  <div className={`text-xs font-mono ${c.active ? "text-emerald-400" : "text-red-400"}`}>
                    {c.active ? "activo" : "inactivo"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
    </div>
  );
}
