"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PERIODS = [
  { v: "24h", label: "24 horas", desc: "Hoy y mañana fuera" },
  { v: "7d", label: "7 días", desc: "Una semana sin jugar" },
  { v: "30d", label: "30 días", desc: "Un mes completo" },
  { v: "6m", label: "6 meses", desc: "Medio año" },
  { v: "1y", label: "1 año", desc: "Año completo" },
  { v: "permanent", label: "Permanente", desc: "Cierre definitivo de cuenta" },
];

export default function ExclusionForm() {
  const router = useRouter();
  const supabase = createClient();
  const [period, setPeriod] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function execute() {
    if (!period) return;
    setLoading(true);
    setError(null);
    const response = await fetch("/api/account/exclusion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ period, reason: reason || null }),
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setError(payload?.error ?? "self_exclusion_failed");
      return;
    }
    // Sign out and redirect
    await supabase.auth.signOut();
    router.push("/?excluded=1");
  }

  if (confirming) {
    return (
      <div className="card p-6 md:p-8 border-[var(--color-magenta)]/40 anim-scale-in">
        <div className="font-display text-2xl mb-3">¿Confirmas?</div>
        <p className="text-[var(--color-fg-dim)] mb-6">
          Vas a auto-excluirte por <strong className="text-[var(--color-magenta)]">{PERIODS.find(p => p.v === period)?.label}</strong>.
          {period === "permanent" && " Esto es permanente — no podrás reactivar tu cuenta."}
          {" "}No podrás cancelarlo antes de tiempo.
        </p>
        {error && <div className="text-sm text-[var(--color-magenta)] mb-4">{error}</div>}
        <div className="flex gap-2">
          <button onClick={() => setConfirming(false)} className="btn btn-ghost flex-1">
            No, volver
          </button>
          <button onClick={execute} disabled={loading} className="btn btn-primary flex-1 disabled:opacity-50">
            {loading ? "..." : "Sí, excluirme"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 anim-slide-up">
      {PERIODS.map((p) => (
        <button
          key={p.v}
          onClick={() => setPeriod(p.v)}
          className={`card w-full p-4 text-left transition-all ${period === p.v ? "border-[var(--color-magenta)]" : "card-hover"}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-lg">{p.label}</div>
              <div className="text-xs text-[var(--color-fg-dim)]">{p.desc}</div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 ${period === p.v ? "bg-[var(--color-magenta)] border-[var(--color-magenta)]" : "border-[var(--color-border)]"}`}>
              {period === p.v && <div className="w-1.5 h-1.5 bg-white rounded-full m-auto mt-[5px]" />}
            </div>
          </div>
        </button>
      ))}

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo (opcional, privado)"
        rows={3}
        className="input resize-none"
      />

      <button
        onClick={() => setConfirming(true)}
        disabled={!period}
        className="btn btn-primary w-full mt-4 disabled:opacity-40"
      >
        Continuar →
      </button>
    </div>
  );
}
