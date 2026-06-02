"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Coins,
  KeyRound,
  ShieldCheck,
  Table2,
  Ticket,
} from "lucide-react";
import type { WorldOpsPayload } from "@/lib/world/ops-types";
import WorldOpsPanel from "./WorldOpsPanel";

export default function AdminClient({
  initialCodes,
  initialStats,
  initialWorldOps,
}: {
  initialCodes: any[];
  initialStats: any;
  initialWorldOps: WorldOpsPayload | null;
}) {
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

  return (
    <div className="min-h-screen bg-[#08080c] text-white grain">
      <header className="sticky top-0 z-30 bg-[#08080c]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <Link href="/lobby" className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white">
            <ArrowLeft size={15} aria-hidden="true" />
            Lobby
          </Link>
          <div className="inline-flex items-center gap-2 font-display text-lg">
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

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-6">
        <WorldOpsPanel initialOps={initialWorldOps} />

        {/* STATS */}
        <section>
          <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 mb-3">Estadísticas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ["Usuarios", stats?.total_users ?? 0],
              ["Partidas", stats?.total_games ?? 0],
              ["Tiradas slot", stats?.total_spins ?? 0],
              ["Ingresos", `$${(stats?.revenue_usd ?? 0).toFixed(2)}`],
              ["Compras", stats?.total_purchases ?? 0],
              ["Salas activas", stats?.active_games ?? 0],
              ["Códigos activos", stats?.codes_active ?? 0],
              ["Canjes", stats?.codes_redeemed ?? 0],
            ].map(([label, val]) => (
              <div key={label as string} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[10px] font-mono uppercase text-white/40">{label}</div>
                <div className="font-display text-2xl mt-1">{val}</div>
              </div>
            ))}
          </div>
        </section>

        {/* GRANT COINS */}
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="mb-4 inline-flex items-center gap-2 font-display text-xl">
            <Coins size={19} aria-hidden="true" />
            Dar coins a usuario
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            <input className={inputCls} placeholder="Email del usuario" value={gEmail} onChange={(e) => setGEmail(e.target.value)} />
            <div className="grid grid-cols-3 gap-2">
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

        {/* CREATE CODE */}
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
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
            <div className="grid grid-cols-3 gap-2 mb-3">
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

        {/* CODES LIST */}
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="mb-4 inline-flex items-center gap-2 font-display text-xl">
            <Table2 size={19} aria-hidden="true" />
            Códigos existentes
          </h2>
          {codes.length === 0 ? (
            <div className="text-white/40 text-sm">No hay códigos aún</div>
          ) : (
            <div className="space-y-2">
              {codes.map((c: any) => (
                <div key={c.code} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5 text-sm">
                  <div className="font-mono font-bold">{c.code}</div>
                  <div className="text-white/50 text-xs">
                    {c.kind === "coins"
                      ? `Gold ${c.gold} · Sweeps ${c.sweeps} · Diamonds ${c.diamonds}`
                      : `${c.discount_pct}% desc`}
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
      </main>
    </div>
  );
}
