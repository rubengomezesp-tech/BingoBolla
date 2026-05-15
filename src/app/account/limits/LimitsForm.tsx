"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Limits = {
  daily_deposit_limit?: number;
  weekly_deposit_limit?: number;
  monthly_deposit_limit?: number;
  daily_wager_limit?: number;
  weekly_wager_limit?: number;
  daily_loss_limit?: number;
  weekly_loss_limit?: number;
  session_minutes_limit?: number;
  reality_check_interval_minutes?: number;
};

export default function LimitsForm({ initial }: { initial: Limits | null }) {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState<Limits>(initial ?? { reality_check_interval_minutes: 30 });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof Limits>(k: K, v: any) {
    setForm((prev) => ({ ...prev, [k]: v === "" || v === "0" ? undefined : Number(v) }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase.rpc("upsert_rg_limits", { p_limits: form });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-6 anim-slide-up">
      {/* Deposit */}
      <Section title="Depósitos" subtitle="Máximo dinero que puedes meter en USD">
        <Limit label="Diario ($)" value={form.daily_deposit_limit} onChange={(v) => set("daily_deposit_limit", v)} placeholder="Sin límite" />
        <Limit label="Semanal ($)" value={form.weekly_deposit_limit} onChange={(v) => set("weekly_deposit_limit", v)} placeholder="Sin límite" />
        <Limit label="Mensual ($)" value={form.monthly_deposit_limit} onChange={(v) => set("monthly_deposit_limit", v)} placeholder="Sin límite" />
      </Section>

      {/* Wager */}
      <Section title="Apuestas (Sweeps)" subtitle="Total apostado en Sweeps Coins">
        <Limit label="Diario (💎)" value={form.daily_wager_limit} onChange={(v) => set("daily_wager_limit", v)} placeholder="Sin límite" />
        <Limit label="Semanal (💎)" value={form.weekly_wager_limit} onChange={(v) => set("weekly_wager_limit", v)} placeholder="Sin límite" />
      </Section>

      {/* Loss */}
      <Section title="Pérdidas netas" subtitle="Apostado menos ganado">
        <Limit label="Diario (💎)" value={form.daily_loss_limit} onChange={(v) => set("daily_loss_limit", v)} placeholder="Sin límite" />
        <Limit label="Semanal (💎)" value={form.weekly_loss_limit} onChange={(v) => set("weekly_loss_limit", v)} placeholder="Sin límite" />
      </Section>

      {/* Session */}
      <Section title="Sesión" subtitle="Tiempo y recordatorios">
        <Limit label="Sesión máx (min)" value={form.session_minutes_limit} onChange={(v) => set("session_minutes_limit", v)} placeholder="Sin límite" />
        <Limit label="Aviso cada (min)" value={form.reality_check_interval_minutes} onChange={(v) => set("reality_check_interval_minutes", v)} placeholder="30" />
      </Section>

      <div className="pt-6 sticky bottom-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary flex-1 disabled:opacity-50"
        >
          {saving ? "Guardando..." : saved ? "✓ Guardado" : "Guardar límites"}
        </button>
      </div>

      <div className="text-xs text-[var(--color-fg-muted)] leading-relaxed pt-4">
        Cuando alcances un límite, no podrás comprar más cartones con Sweeps hasta que pase el período.
        Para reducir un límite el cambio es inmediato. Para aumentarlo necesitas esperar 24h.
      </div>
    </form>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 md:p-6">
      <div className="mb-4">
        <div className="font-display text-xl">{title}</div>
        <div className="text-xs text-[var(--color-fg-muted)]">{subtitle}</div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Limit({ label, value, onChange, placeholder }: { label: string; value?: number; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-1.5">{label}</div>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input"
      />
    </label>
  );
}
