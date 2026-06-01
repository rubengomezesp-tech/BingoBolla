"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, Gift, Loader2, Sparkles, Ticket } from "lucide-react";

type DailyStatus = {
  available?: boolean;
  seconds_left?: number;
};

type ClaimResult = {
  ok?: boolean;
  error?: string;
  seconds_left?: number;
  gold_awarded?: number;
  sweeps_awarded?: number;
  new_gold?: number;
  new_sweeps?: number;
};

type PromoResult = {
  ok?: boolean;
  error?: string;
  kind?: "coins" | "discount";
  discount_pct?: number;
  gold_awarded?: number;
  sweeps_awarded?: number;
  diamonds_awarded?: number;
};

export default function RegaloClient() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "available" | "claimed">("loading");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [promoMessage, setPromoMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const response = await fetch("/api/rewards/daily");
      const { data } = await response.json().catch(() => ({}));
      if (!active) return;
      const daily = (data ?? {}) as DailyStatus;
      if (daily.available) {
        setStatus("available");
        setSecondsLeft(0);
      } else {
        setStatus("claimed");
        setSecondsLeft(Math.max(0, Number(daily.seconds_left ?? 0)));
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (status !== "claimed" || secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setStatus("available");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft, status]);

  async function claimDaily() {
    setClaiming(true);
    setPromoMessage(null);
    const response = await fetch("/api/rewards/daily", { method: "POST" });
    const { data } = await response.json().catch(() => ({}));
    setClaiming(false);

    if (!response.ok) {
      setPromoMessage({ tone: "error", text: "No se pudo reclamar ahora. Intenta de nuevo en unos segundos." });
      return;
    }

    const result = (data ?? {}) as ClaimResult;
    if (result.error) {
      if (result.seconds_left) {
        setStatus("claimed");
        setSecondsLeft(Math.max(0, Number(result.seconds_left)));
      }
      setPromoMessage({ tone: "error", text: translateDailyError(result.error) });
      return;
    }

    setClaimResult(result);
    setStatus("claimed");
    setSecondsLeft(24 * 3600);
    router.refresh();
  }

  async function redeemCode(e: React.FormEvent) {
    e.preventDefault();
    const normalized = code.trim();
    if (!normalized) return;
    setRedeeming(true);
    setPromoMessage(null);
    const response = await fetch("/api/rewards/code", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: normalized }),
    });
    const { data } = await response.json().catch(() => ({}));
    setRedeeming(false);

    if (!response.ok) {
      setPromoMessage({ tone: "error", text: "No se pudo validar el código." });
      return;
    }

    const result = (data ?? {}) as PromoResult;
    if (result.error) {
      setPromoMessage({ tone: "error", text: translatePromoError(result.error) });
      return;
    }

    setCode("");
    setPromoMessage({ tone: "ok", text: promoText(result) });
    router.refresh();
  }

  const countdown = useMemo(() => formatDuration(secondsLeft), [secondsLeft]);
  const dailyReady = status === "available";

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,.92fr)]">
      <section className="rounded-[26px] border border-[#ffd93d]/35 bg-black/48 p-5 shadow-[0_0_34px_rgba(255,217,61,.14)] backdrop-blur-md md:p-7">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ffd93d]">Premio principal</div>
            <h2 className="mt-1 text-3xl font-black md:text-4xl">500 Gold + 0.50 SC</h2>
          </div>
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#ffd93d]/14 text-[#ffd93d]">
            <Gift size={38} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Reward label="Gold Coins" value="+500" icon="🪙" />
          <Reward label="Sweeps Coins" value="+0.50" icon="SC" />
          <Reward label="Racha" value="24h" icon="⚡" />
        </div>

        <button
          onClick={claimDaily}
          disabled={!dailyReady || claiming}
          className="mt-6 flex h-16 w-full items-center justify-center gap-3 rounded-2xl border-2 border-white/70 bg-[linear-gradient(180deg,#fff28b,#ffc22a_48%,#c77a08)] px-6 text-2xl font-black text-[#2b1500] shadow-[0_0_26px_rgba(255,217,61,.5)] transition hover:brightness-110 disabled:cursor-default disabled:opacity-55"
        >
          {claiming ? <Loader2 className="animate-spin" /> : dailyReady ? <Gift /> : <Clock3 />}
          <span>{status === "loading" ? "Cargando..." : dailyReady ? "RECLAMAR" : `Vuelve en ${countdown}`}</span>
        </button>

        {claimResult?.ok && (
          <div className="mt-4 rounded-2xl border border-[#00e676]/35 bg-[#00e676]/10 p-4 text-sm font-bold text-[#b9ffd7]">
            <CheckCircle2 className="mr-2 inline h-5 w-5" />
            Sumado a tu cuenta: +{claimResult.gold_awarded ?? 500} Gold y +{Number(claimResult.sweeps_awarded ?? 0.5).toFixed(2)} SC.
          </div>
        )}
      </section>

      <section className="rounded-[26px] border border-[#ff3d7f]/35 bg-black/48 p-5 shadow-[0_0_34px_rgba(255,61,127,.14)] backdrop-blur-md md:p-7">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff7ab0]">Código promo</div>
            <h2 className="mt-1 text-3xl font-black">Canjear bonus</h2>
          </div>
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#ff3d7f]/14 text-[#ff7ab0]">
            <Ticket size={32} />
          </div>
        </div>

        <form onSubmit={redeemCode} className="space-y-3">
          <label className="block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Código</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="BINGO2026"
              className="h-14 w-full rounded-2xl border border-white/12 bg-white/[0.07] px-4 text-lg font-black uppercase outline-none transition placeholder:text-white/24 focus:border-[#ff3d7f]"
              maxLength={24}
            />
          </label>
          <button
            disabled={redeeming || !code.trim()}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#ff3d7f] px-5 font-black text-white shadow-[0_0_20px_rgba(255,61,127,.45)] transition hover:brightness-110 disabled:opacity-50"
          >
            {redeeming ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
            Validar código
          </button>
        </form>

        {promoMessage && (
          <div
            className={`mt-4 rounded-2xl border p-4 text-sm font-bold ${
              promoMessage.tone === "ok"
                ? "border-[#00e676]/35 bg-[#00e676]/10 text-[#b9ffd7]"
                : "border-[#ff3d7f]/35 bg-[#ff3d7f]/10 text-[#ffc1d8]"
            }`}
          >
            {promoMessage.text}
          </div>
        )}
      </section>
    </div>
  );
}

function Reward({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <div className="text-2xl font-black">{icon}</div>
      <div className="mt-3 text-2xl font-black text-white">{value}</div>
      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/48">{label}</div>
    </div>
  );
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function translateDailyError(error: string) {
  const messages: Record<string, string> = {
    already_claimed: "Ese regalo ya fue reclamado. El contador se actualizó.",
    not_authenticated: "Inicia sesión para reclamar el regalo.",
  };
  return messages[error] ?? error;
}

function translatePromoError(error: string) {
  const messages: Record<string, string> = {
    invalid_code: "Ese código no existe o ya no está activo.",
    expired: "Ese código expiró.",
    max_uses_reached: "Ese código ya llegó a su límite.",
    already_redeemed: "Ya canjeaste ese código.",
    not_authenticated: "Inicia sesión para canjear códigos.",
  };
  return messages[error] ?? error;
}

function promoText(result: PromoResult) {
  if (result.kind === "discount") return `Código aplicado: ${result.discount_pct ?? 0}% de descuento.`;
  const chunks = [
    Number(result.gold_awarded ?? 0) > 0 ? `+${result.gold_awarded} Gold` : "",
    Number(result.sweeps_awarded ?? 0) > 0 ? `+${Number(result.sweeps_awarded).toFixed(2)} SC` : "",
    Number(result.diamonds_awarded ?? 0) > 0 ? `+${Number(result.diamonds_awarded).toFixed(0)} Diamonds` : "",
  ].filter(Boolean);
  return chunks.length ? `Código canjeado: ${chunks.join(" · ")}.` : "Código canjeado correctamente.";
}
