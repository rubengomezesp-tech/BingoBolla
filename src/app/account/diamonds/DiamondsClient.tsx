"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const REDEEM_RATE = 0.08;  // 1 Diamond = $0.08 USD

export default function DiamondsClient({
  profile,
  packages,
  redemptions,
  recentTx,
}: {
  profile: any;
  packages: any[];
  redemptions: any[];
  recentTx: any[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"buy" | "redeem" | "history">("buy");
  const [redeemAmount, setRedeemAmount] = useState<number>(100);
  const [redeemMethod, setRedeemMethod] = useState<"paypal" | "bank_transfer">("paypal");
  const [paymentDetail, setPaymentDetail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleBuy(packageId: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_id: packageId, currency_type: "diamonds" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Error iniciando pago");
        setLoading(false);
      }
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (redeemAmount < 100) {
      setError("Mínimo 100 Diamonds para canjear");
      return;
    }
    if (redeemAmount > (profile?.diamonds ?? 0)) {
      setError("No tienes suficientes Diamonds");
      return;
    }
    if (!paymentDetail.trim()) {
      setError(redeemMethod === "paypal" ? "Email de PayPal requerido" : "IBAN requerido");
      return;
    }
    if (profile?.kyc_status !== "verified") {
      setError("Necesitas KYC verificado para canjear. Contacta soporte.");
      return;
    }

    setLoading(true);
    const response = await fetch("/api/account/diamonds/redeem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        diamond_amount: redeemAmount,
        payment_method: redeemMethod,
        payment_detail: paymentDetail,
      }),
    });
    const { data, error } = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok || error) {
      setError(translateError(error ?? "diamond_redemption_failed"));
      return;
    }
    setSuccess(`Canje solicitado: $${(data as any).usd_amount.toFixed(2)} en 3-5 días`);
    setPaymentDetail("");
    setRedeemAmount(100);
    router.refresh();
  }

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-10">
      {/* Balance hero */}
      <div className="card p-6 md:p-8 mb-6 text-center anim-slide-up" style={{
        background: "linear-gradient(135deg, rgba(0,229,255,0.08), rgba(179,136,255,0.08))",
        borderColor: "rgba(0,229,255,0.30)",
      }}>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--color-cyan)] mb-2">
          Tu balance
        </div>
        <div className="font-display text-6xl md:text-7xl mb-2 shimmer-gold flex items-center justify-center gap-2">
          💎 {Number(profile?.diamonds ?? 0).toFixed(2)}
        </div>
        <div className="text-sm text-[var(--color-fg-dim)]">
          Valor canjeable: <strong className="text-white">${(Number(profile?.diamonds ?? 0) * REDEEM_RATE).toFixed(2)}</strong>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 max-w-sm mx-auto text-xs">
          <div>
            <div className="text-[var(--color-fg-muted)] uppercase tracking-wider font-mono mb-0.5">Comprado total</div>
            <div className="font-display text-lg">💎 {Number(profile?.diamonds_lifetime_purchased ?? 0).toFixed(0)}</div>
          </div>
          <div>
            <div className="text-[var(--color-fg-muted)] uppercase tracking-wider font-mono mb-0.5">Canjeado total</div>
            <div className="font-display text-lg">${(Number(profile?.diamonds_lifetime_redeemed ?? 0) * REDEEM_RATE).toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg bg-[var(--color-surface-2)] max-w-md mx-auto">
        <TabBtn active={mode === "buy"} onClick={() => setMode("buy")}>Comprar</TabBtn>
        <TabBtn active={mode === "redeem"} onClick={() => setMode("redeem")}>Canjear</TabBtn>
        <TabBtn active={mode === "history"} onClick={() => setMode("history")}>Historial</TabBtn>
      </div>

      {/* Content */}
      {mode === "buy" && (
        <div className="anim-slide-up">
          <div className="grid sm:grid-cols-2 gap-3">
            {packages.map((p, i) => {
              const isHottest = i === 2;
              const bonusPct = Math.round(((p.diamonds_amount / (p.price_usd / 0.1)) - 1) * 100);
              return (
                <div key={p.sku} className="card p-5 relative" style={isHottest ? { borderColor: "rgba(0,229,255,0.5)" } : {}}>
                  {isHottest && (
                    <div className="absolute -top-2 -right-2 font-mono text-[10px] px-2 py-1 rounded-md bg-[var(--color-cyan)] text-bb-ink chunky">
                      🔥 POPULAR
                    </div>
                  )}
                  {bonusPct > 0 && (
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-gold)] mb-1">
                      +{bonusPct}% BONUS
                    </div>
                  )}
                  <div className="text-3xl mb-2">💎</div>
                  <div className="font-display text-xl mb-1">{p.name}</div>
                  <div className="font-display text-3xl shimmer-gold mb-3">
                    {Number(p.diamonds_amount).toFixed(0)}
                  </div>
                  <button
                    onClick={() => handleBuy(p.id)}
                    disabled={loading}
                    className="btn btn-primary w-full disabled:opacity-50"
                  >
                    ${p.price_usd}
                  </button>
                </div>
              );
            })}
          </div>
          {error && <div className="mt-4 text-sm text-[var(--color-magenta)] text-center">{error}</div>}
          <div className="mt-6 text-xs text-[var(--color-fg-muted)] text-center max-w-md mx-auto leading-relaxed">
            Diamonds otorgan acceso a la <strong className="text-white">sala VIP Diamond Royale</strong> (RTP 92%, pozos premium) y multiplicador <strong className="text-white">x2</strong> en bingo pagado con Diamonds.
          </div>
        </div>
      )}

      {mode === "redeem" && (
        <form onSubmit={handleRedeem} className="card p-6 md:p-8 anim-slide-up max-w-md mx-auto">
          <div className="font-display text-xl mb-2">Canjear Diamonds por USD</div>
          <div className="text-xs text-[var(--color-fg-dim)] mb-5">
            Tasa: 1 💎 = ${REDEEM_RATE.toFixed(2)} · Mínimo 100 Diamonds · Tiempo procesamiento: 3-5 días
          </div>

          {profile?.kyc_status !== "verified" && (
            <div className="card p-3 border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5 text-sm text-[var(--color-fg-dim)] mb-4">
              ⚠️ Necesitas <strong className="text-white">KYC verificado</strong> para canjear (subir DNI). Contacta a soporte mientras tanto.
            </div>
          )}

          <label className="block mb-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-1.5">Cantidad de Diamonds</div>
            <input
              type="number"
              min={100}
              step={1}
              max={Math.floor(profile?.diamonds ?? 0)}
              value={redeemAmount}
              onChange={(e) => setRedeemAmount(Number(e.target.value))}
              className="input"
            />
            <div className="text-xs text-[var(--color-cyan)] mt-1">
              → Recibirás <strong>${(redeemAmount * REDEEM_RATE).toFixed(2)}</strong>
            </div>
          </label>

          <label className="block mb-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-1.5">Método de pago</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRedeemMethod("paypal")}
                className={`p-3 rounded-lg border transition-all ${
                  redeemMethod === "paypal"
                    ? "border-[var(--color-magenta)] bg-[var(--color-magenta)]/10"
                    : "border-[var(--color-border)]"
                }`}
              >
                <div className="text-xl mb-1">💳</div>
                <div className="text-sm">PayPal</div>
              </button>
              <button
                type="button"
                onClick={() => setRedeemMethod("bank_transfer")}
                className={`p-3 rounded-lg border transition-all ${
                  redeemMethod === "bank_transfer"
                    ? "border-[var(--color-magenta)] bg-[var(--color-magenta)]/10"
                    : "border-[var(--color-border)]"
                }`}
              >
                <div className="text-xl mb-1">🏦</div>
                <div className="text-sm">Transferencia</div>
              </button>
            </div>
          </label>

          <label className="block mb-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-1.5">
              {redeemMethod === "paypal" ? "Email PayPal" : "IBAN / cuenta"}
            </div>
            <input
              type={redeemMethod === "paypal" ? "email" : "text"}
              value={paymentDetail}
              onChange={(e) => setPaymentDetail(e.target.value)}
              placeholder={redeemMethod === "paypal" ? "tu@email.com" : "ES00 0000 0000..."}
              className="input"
            />
          </label>

          {error && <div className="text-sm text-[var(--color-magenta)] mb-3">{error}</div>}
          {success && <div className="text-sm text-[var(--color-emerald)] mb-3">✓ {success}</div>}

          <button
            type="submit"
            disabled={loading || profile?.kyc_status !== "verified"}
            className="btn btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Procesando..." : `Canjear por $${(redeemAmount * REDEEM_RATE).toFixed(2)}`}
          </button>
        </form>
      )}

      {mode === "history" && (
        <div className="anim-slide-up space-y-6 max-w-2xl mx-auto">
          {redemptions.length > 0 && (
            <div className="card p-5">
              <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-3">Canjes solicitados</div>
              <div className="space-y-2">
                {redemptions.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm py-2 border-b border-[var(--color-border)] last:border-0">
                    <div>
                      <div className="font-mono">💎 {Number(r.diamonds_amount).toFixed(0)} → ${Number(r.usd_amount).toFixed(2)}</div>
                      <div className="text-xs text-[var(--color-fg-muted)]">{new Date(r.created_at).toLocaleString()}</div>
                    </div>
                    <span className={`text-xs font-mono uppercase px-2 py-0.5 rounded ${
                      r.status === "paid" ? "bg-[var(--color-emerald)]/15 text-[var(--color-emerald)]"
                      : r.status === "rejected" ? "bg-[var(--color-magenta)]/15 text-[var(--color-magenta)]"
                      : "bg-[var(--color-gold)]/15 text-[var(--color-gold)]"
                    }`}>{r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentTx.length > 0 && (
            <div className="card p-5">
              <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-3">Transacciones recientes</div>
              <div className="space-y-1">
                {recentTx.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm py-1.5">
                    <span className="text-[var(--color-fg-dim)] text-xs">{t.reason.replace(/_/g, " ")}</span>
                    <span className={`font-mono ${Number(t.amount) > 0 ? "text-[var(--color-emerald)]" : "text-[var(--color-magenta)]"}`}>
                      {Number(t.amount) > 0 ? "+" : ""}{Number(t.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
        active ? "bg-[var(--color-surface)] text-white" : "text-[var(--color-fg-dim)] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function translateError(msg: string): string {
  const map: Record<string, string> = {
    kyc_verification_required: "Necesitas KYC verificado (DNI)",
    insufficient_diamonds: "Diamonds insuficientes",
    minimum_redemption_100_diamonds: "Mínimo 100 Diamonds",
    invalid_payment_method: "Método de pago inválido",
    account_banned: "Cuenta suspendida",
  };
  for (const k of Object.keys(map)) if (msg.includes(k)) return map[k];
  return msg;
}
