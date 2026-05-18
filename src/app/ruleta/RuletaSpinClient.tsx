"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, Loader2, RotateCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Prize = {
  key: string;
  label: string;
  icon: string;
  gold?: number;
  sweeps?: number;
  diamonds?: number;
};

type SpinResult = {
  ok?: boolean;
  error?: string;
  seconds_left?: number;
  prize_key?: string;
  gold_awarded?: number;
  sweeps_awarded?: number;
  diamonds_awarded?: number;
};

const STORAGE_KEY = "bb_roulette_state_v1";
const COOLDOWN_SECONDS = 8 * 3600;

const PRIZES: Prize[] = [
  { key: "gold_250", label: "250 Gold", icon: "🪙", gold: 250 },
  { key: "gold_500", label: "500 Gold", icon: "💰", gold: 500 },
  { key: "sweeps_025", label: "0.25 SC", icon: "SC", sweeps: 0.25 },
  { key: "diamonds_5", label: "5 Diamonds", icon: "💎", diamonds: 5 },
  { key: "gold_1000", label: "1,000 Gold", icon: "🏆", gold: 1000 },
  { key: "ticket", label: "Ticket bonus", icon: "🎟️", gold: 150 },
];

export default function RuletaSpinClient() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [rotation, setRotation] = useState(18);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Prize | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function spin() {
    if (spinning) return;

    const local = readLocalState();
    if (local.nextAt > Date.now()) {
      setMessage(`Siguiente giro en ${formatDuration(Math.ceil((local.nextAt - Date.now()) / 1000))}.`);
      return;
    }

    setSpinning(true);
    setMessage(null);
    setResult(null);

    const rpc = await supabase.rpc("claim_roulette_spin");
    const payload = (rpc.data ?? {}) as SpinResult;

    if (!rpc.error && payload.error === "already_claimed") {
      const seconds = Math.max(0, Number(payload.seconds_left ?? COOLDOWN_SECONDS));
      writeLocalState(Date.now() + seconds * 1000);
      setSpinning(false);
      setMessage(`Siguiente giro en ${formatDuration(seconds)}.`);
      return;
    }

    const prize =
      !rpc.error && payload.ok && payload.prize_key
        ? PRIZES.find((item) => item.key === payload.prize_key) ?? PRIZES[0]
        : pickLocalPrize();

    const prizeIndex = PRIZES.findIndex((item) => item.key === prize.key);
    const target = 360 * 5 + (360 - prizeIndex * (360 / PRIZES.length)) + 18;
    setRotation((current) => current + target);

    window.setTimeout(() => {
      setResult(prize);
      writeLocalState(Date.now() + COOLDOWN_SECONDS * 1000);
      setSpinning(false);
      if (!rpc.error && payload.ok) router.refresh();
    }, 1450);
  }

  return (
    <section className="mb-7 grid gap-5 rounded-[28px] border border-[#ff3d7f]/34 bg-black/52 p-5 shadow-[0_0_34px_rgba(255,61,127,.12)] backdrop-blur-md md:grid-cols-[320px_minmax(0,1fr)] md:p-6">
      <div className="relative mx-auto grid h-72 w-72 place-items-center">
        <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 text-4xl text-[#ffd93d] drop-shadow-[0_0_14px_rgba(255,217,61,.9)]">▼</div>
        <div
          className="h-64 w-64 rounded-full border-8 border-[#ffe68f] bg-[conic-gradient(from_0deg,#ff3d7f_0_16.66%,#5b1a75_16.66%_33.33%,#ffd93d_33.33%_50%,#00e5ff_50%_66.66%,#7b2ff7_66.66%_83.33%,#ff8a00_83.33%_100%)] shadow-[0_0_46px_rgba(255,61,127,.38)] transition-transform duration-[1450ms] ease-out"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div className="grid h-full w-full place-items-center rounded-full border-[18px] border-black/24">
            <div className="grid h-24 w-24 place-items-center rounded-full border-4 border-white/65 bg-[#17051f] text-center text-sm font-black shadow-[0_0_24px_rgba(255,255,255,.28)]">
              BOLLA
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center">
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff7ab0]">Premio cada 8h</div>
        <h2 className="mt-1 text-4xl font-black">Ruleta diaria</h2>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/62">
          Gira, celebra el premio y vuelve cuando el contador esté listo para una nueva tirada.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {PRIZES.map((prize) => (
            <div key={prize.key} className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-center">
              <div className="text-xl font-black">{prize.icon}</div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.08em] text-white/58">{prize.label}</div>
            </div>
          ))}
        </div>

        <button
          onClick={spin}
          disabled={spinning}
          className="mt-6 flex h-14 w-full max-w-sm items-center justify-center gap-3 rounded-2xl bg-[#ff3d7f] px-6 text-lg font-black text-white shadow-[0_0_24px_rgba(255,61,127,.42)] transition hover:brightness-110 disabled:opacity-60"
        >
          {spinning ? <Loader2 className="animate-spin" /> : <RotateCw />}
          {spinning ? "Girando..." : "GIRAR RULETA"}
        </button>

        {result && (
          <div className="mt-4 rounded-2xl border border-[#00e676]/35 bg-[#00e676]/10 p-4 text-sm font-bold text-[#b9ffd7]">
            <CheckCircle2 className="mr-2 inline h-5 w-5" />
            Premio: {result.label}
          </div>
        )}
        {message && (
          <div className="mt-4 rounded-2xl border border-[#ffd93d]/35 bg-[#ffd93d]/10 p-4 text-sm font-bold text-[#fff0aa]">
            <Clock3 className="mr-2 inline h-5 w-5" />
            {message}
          </div>
        )}
      </div>
    </section>
  );
}

function pickLocalPrize() {
  return PRIZES[Math.floor(Math.random() * PRIZES.length)];
}

function readLocalState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as { nextAt?: number }) : {};
    return { nextAt: Number(parsed.nextAt ?? 0) };
  } catch {
    return { nextAt: 0 };
  }
}

function writeLocalState(nextAt: number) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ nextAt }));
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
