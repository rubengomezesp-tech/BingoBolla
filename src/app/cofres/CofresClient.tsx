"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, Crown, Gift, Loader2, Sparkles, Ticket } from "lucide-react";

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

export default function CofresClient() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "available" | "claimed">("loading");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
      setSecondsLeft((value) => {
        if (value <= 1) {
          setStatus("available");
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft, status]);

  async function claimDailyChest() {
    setClaiming(true);
    setMessage(null);
    const response = await fetch("/api/rewards/daily", { method: "POST" });
    const { data } = await response.json().catch(() => ({}));
    setClaiming(false);

    if (!response.ok) {
      setMessage("No se pudo abrir ahora. Intenta otra vez en unos segundos.");
      return;
    }

    const claim = (data ?? {}) as ClaimResult;
    if (claim.error) {
      setStatus("claimed");
      setSecondsLeft(Math.max(0, Number(claim.seconds_left ?? 0)));
      setMessage(claim.error === "already_claimed" ? "Ese cofre ya fue abierto. El contador quedó actualizado." : claim.error);
      return;
    }

    setResult(claim);
    setStatus("claimed");
    setSecondsLeft(24 * 3600);
    router.refresh();
  }

  const countdown = formatDuration(secondsLeft);
  const dailyReady = status === "available";

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="relative overflow-hidden rounded-[28px] border border-[#ffd93d]/38 bg-black/52 p-6 shadow-[0_0_34px_rgba(255,217,61,.13)] backdrop-blur-md">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#ffd93d]/16 blur-2xl" />
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ffd93d]">Disponible cada 24h</div>
              <h2 className="mt-2 text-3xl font-black">Cofre diario</h2>
            </div>
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#ffd93d]/13 text-[#ffd93d]">
              <Gift size={38} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <RewardPill label="Gold Coins" value="+500" />
            <RewardPill label="Sweeps Coins" value="+0.50" />
          </div>
          <button
            onClick={claimDailyChest}
            disabled={!dailyReady || claiming}
            className="mt-6 flex h-[60px] w-full items-center justify-center gap-3 rounded-2xl border-2 border-white/70 bg-[linear-gradient(180deg,#fff28b,#ffc22a_48%,#c77a08)] px-5 text-xl font-black text-[#2b1500] shadow-[0_0_24px_rgba(255,217,61,.48)] transition hover:brightness-110 disabled:cursor-default disabled:opacity-55"
          >
            {claiming ? <Loader2 className="animate-spin" /> : dailyReady ? <Gift /> : <Clock3 />}
            {status === "loading" ? "Cargando..." : dailyReady ? "ABRIR COFRE" : countdown}
          </button>
        </section>

        <ChestLink
          href="/vip"
          icon={<Crown size={38} />}
          eyebrow="Premium"
          title="Cofre VIP"
          text="Diamonds, packs y zona premium conectada con la tienda."
          action="Entrar"
          accent="#00e5ff"
        />

        <ChestLink
          href="/eventos"
          icon={<Ticket size={38} />}
          eyebrow="Eventos"
          title="Cofre especial"
          text="Misiones, códigos y premios temporales en una sola pestaña."
          action="Ver eventos"
          accent="#ff3d7f"
        />
      </div>

      {(result?.ok || message) && (
        <div
          className={`rounded-[22px] border p-5 text-sm font-bold ${
            result?.ok
              ? "border-[#00e676]/35 bg-[#00e676]/10 text-[#b9ffd7]"
              : "border-[#ff3d7f]/35 bg-[#ff3d7f]/10 text-[#ffc1d8]"
          }`}
        >
          {result?.ok ? (
            <>
              <CheckCircle2 className="mr-2 inline h-5 w-5" />
              Abierto: +{result.gold_awarded ?? 500} Gold y +{Number(result.sweeps_awarded ?? 0.5).toFixed(2)} SC.
            </>
          ) : (
            message
          )}
        </div>
      )}
    </div>
  );
}

function ChestLink({
  href,
  icon,
  eyebrow,
  title,
  text,
  action,
  accent,
}: {
  href: string;
  icon: ReactNode;
  eyebrow: string;
  title: string;
  text: string;
  action: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-[28px] border bg-black/52 p-6 shadow-[0_0_34px_rgba(0,0,0,.24)] backdrop-blur-md transition hover:-translate-y-1"
      style={{ borderColor: `${accent}66` }}
    >
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full blur-2xl" style={{ backgroundColor: `${accent}26` }} />
      <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl" style={{ backgroundColor: `${accent}20`, color: accent }}>
        {icon}
      </div>
      <div className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: accent }}>
        {eyebrow}
      </div>
      <h2 className="mt-2 text-3xl font-black">{title}</h2>
      <p className="mt-3 min-h-14 text-sm font-semibold leading-6 text-white/62">{text}</p>
      <div
        className="mt-6 inline-flex h-12 items-center gap-2 rounded-2xl px-5 font-black text-[#120416] shadow-[0_0_18px_rgba(255,255,255,.16)]"
        style={{ backgroundColor: accent }}
      >
        <Sparkles size={18} />
        {action}
      </div>
    </Link>
  );
}

function RewardPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <div className="text-2xl font-black text-[#ffd93d]">{value}</div>
      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/46">{label}</div>
    </div>
  );
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `Vuelve en ${h}h ${m}m`;
  if (m > 0) return `Vuelve en ${m}m ${s}s`;
  return `Vuelve en ${s}s`;
}
