"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Machine = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  theme_color: string;
  reels: { symbols: string[]; weights: number[] };
  paytable: Record<string, number>;
  min_bet_gold: number;
  max_bet_gold: number;
  min_bet_sweeps: number;
  max_bet_sweeps: number;
  rtp: number;
};

type Spin = {
  id: string;
  symbols: string[];
  win_amount: number;
  bet: number;
  currency: string;
};

export default function SlotMachine({
  machine,
  initialProfile,
  recentSpins,
}: {
  machine: Machine;
  initialProfile: any;
  recentSpins: Spin[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState(initialProfile);
  const [bet, setBet] = useState<number>(machine.min_bet_gold);
  const [currency, setCurrency] = useState<"gold" | "sweeps" | "diamonds">("gold");
  const [reels, setReels] = useState<string[]>(["🎰", "🎰", "🎰"]);
  const [spinning, setSpinning] = useState(false);
  const [lastWin, setLastWin] = useState<{ amount: number; multiplier: number } | null>(null);
  const [spins, setSpins] = useState<Spin[]>(recentSpins);
  const [error, setError] = useState<string | null>(null);
  const spinTimerRef = useRef<NodeJS.Timeout[]>([]);

  // Symbol pool for animation
  const allSymbols = machine.reels.symbols;

  async function spin() {
    if (spinning) return;
    setError(null);
    setLastWin(null);

    // Validate bet
    const min = currency === "gold" ? machine.min_bet_gold : currency === "sweeps" ? machine.min_bet_sweeps : 1;
    const max = currency === "gold" ? machine.max_bet_gold : currency === "sweeps" ? machine.max_bet_sweeps : 100;
    if (bet < min || bet > max) {
      setError(`Apuesta entre ${min} y ${max}`);
      return;
    }

    setSpinning(true);

    // Start spinning animation - randomize reels
    spinTimerRef.current.forEach(clearTimeout);
    spinTimerRef.current = [];
    const animateInterval = setInterval(() => {
      setReels([
        allSymbols[Math.floor(Math.random() * allSymbols.length)],
        allSymbols[Math.floor(Math.random() * allSymbols.length)],
        allSymbols[Math.floor(Math.random() * allSymbols.length)],
      ]);
    }, 80);

    try {
      const { data, error } = await supabase.rpc("play_slot", {
        p_machine_id: machine.id,
        p_bet: bet,
        p_currency: currency,
      });
      if (error) throw error;

      // Stop reels one by one
      const result = (data as any).symbols as string[];
      spinTimerRef.current.push(setTimeout(() => {
        setReels([result[0], allSymbols[Math.floor(Math.random() * allSymbols.length)], allSymbols[Math.floor(Math.random() * allSymbols.length)]]);
      }, 800));
      spinTimerRef.current.push(setTimeout(() => {
        setReels([result[0], result[1], allSymbols[Math.floor(Math.random() * allSymbols.length)]]);
      }, 1400));
      spinTimerRef.current.push(setTimeout(() => {
        clearInterval(animateInterval);
        setReels(result);
        setSpinning(false);

        const win = Number((data as any).win);
        const mult = Number((data as any).multiplier);
        if (win > 0) setLastWin({ amount: win, multiplier: mult });

        // Update profile
        setProfile((p: any) => {
          const updated = { ...p };
          if (currency === "gold") updated.gold_coins = (data as any).new_balance;
          else if (currency === "sweeps") updated.sweeps_coins = (data as any).new_balance;
          else updated.diamonds = (data as any).new_balance;
          return updated;
        });

        // Prepend to history
        setSpins((prev) => [
          {
            id: (data as any).spin_id,
            symbols: result,
            win_amount: win,
            bet,
            currency,
          },
          ...prev.slice(0, 9),
        ]);
      }, 2000));
    } catch (err: any) {
      clearInterval(animateInterval);
      setSpinning(false);
      setError(translateError(err.message ?? "error"));
    }
  }

  const balance = currency === "gold" ? profile?.gold_coins ?? 0
    : currency === "sweeps" ? profile?.sweeps_coins ?? 0
    : profile?.diamonds ?? 0;

  const presets = currency === "gold"
    ? [machine.min_bet_gold, machine.min_bet_gold * 5, machine.min_bet_gold * 10, machine.max_bet_gold]
    : currency === "sweeps"
    ? [machine.min_bet_sweeps, machine.min_bet_sweeps * 5, machine.min_bet_sweeps * 10, machine.max_bet_sweeps]
    : [1, 5, 10, 50];

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-10">
      {/* Machine */}
      <div
        className="card p-6 md:p-10 anim-slide-up relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${machine.theme_color}15, transparent)`,
          borderColor: `${machine.theme_color}40`,
        }}
      >
        <div className="absolute top-3 right-4 text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg-muted)]">
          RTP {(machine.rtp * 100).toFixed(0)}%
        </div>

        <div className="text-center mb-6">
          <div className="text-5xl mb-2">{machine.emoji}</div>
          <h1 className="font-display text-3xl md:text-4xl">{machine.name}</h1>
        </div>

        {/* Reels */}
        <div className="flex justify-center gap-2 md:gap-4 mb-6 md:mb-8">
          {reels.map((symbol, i) => (
            <div
              key={i}
              className={`w-24 h-28 md:w-32 md:h-36 rounded-2xl bg-[var(--color-surface-2)] border-2 border-[var(--color-border)] flex items-center justify-center text-5xl md:text-7xl shadow-lg ${
                spinning ? "anim-blur" : ""
              } ${lastWin && !spinning ? "anim-pulse-glow" : ""}`}
              style={lastWin && !spinning ? { borderColor: machine.theme_color } : {}}
            >
              {symbol}
            </div>
          ))}
        </div>

        {/* Win flash */}
        {lastWin && !spinning && (
          <div className="text-center mb-6 anim-scale-in">
            <div className="font-display text-5xl shimmer-gold mb-1">
              +{lastWin.amount.toFixed(2)}
            </div>
            <div className="text-sm text-[var(--color-fg-dim)]">
              ¡{lastWin.multiplier}x multiplicador!
            </div>
          </div>
        )}

        {/* Currency selector */}
        <div className="flex gap-2 mb-4 justify-center">
          <CurrencyTab active={currency === "gold"} onClick={() => { setCurrency("gold"); setBet(machine.min_bet_gold); }} icon="🪙" label="Gold" />
          <CurrencyTab active={currency === "sweeps"} onClick={() => { setCurrency("sweeps"); setBet(machine.min_bet_sweeps); }} icon="💵" label="Sweeps" />
          <CurrencyTab active={currency === "diamonds"} onClick={() => { setCurrency("diamonds"); setBet(1); }} icon="💎" label="Diamonds" />
        </div>

        {/* Bet */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg-muted)]">Apuesta</div>
            <div className="font-mono text-xs text-[var(--color-fg-dim)]">
              Saldo: {currency === "gold" ? Number(balance).toLocaleString() : Number(balance).toFixed(2)}
            </div>
          </div>
          <div className="flex gap-2 mb-2">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setBet(p)}
                className={`flex-1 py-2 rounded-lg font-mono text-sm transition-colors ${
                  bet === p
                    ? "bg-[var(--color-magenta)] text-white"
                    : "bg-[var(--color-surface-2)] text-[var(--color-fg-dim)] hover:bg-white/10"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="text-sm text-[var(--color-magenta)] text-center mb-3">{error}</div>}

        {/* Spin button */}
        <button
          onClick={spin}
          disabled={spinning || bet > balance}
          className="btn btn-primary w-full py-4 text-lg disabled:opacity-50"
          style={spinning || bet > balance ? {} : { background: machine.theme_color, color: "#0a0a0c" }}
        >
          {spinning ? "Girando..." : bet > balance ? "Saldo insuficiente" : `Girar ${bet}`}
        </button>
      </div>

      {/* Paytable */}
      <div className="mt-6 card p-5 anim-slide-up">
        <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-3">Tabla de pagos (3 iguales)</div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {Object.entries(machine.paytable).map(([symbol, mult]) => (
            <div key={symbol} className="text-center">
              <div className="text-2xl mb-1">{symbol}</div>
              <div className="font-mono text-xs text-[var(--color-fg-dim)]">x{mult}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent spins */}
      {spins.length > 0 && (
        <div className="mt-6 card p-5 anim-slide-up">
          <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-3">Últimos giros</div>
          <div className="space-y-1.5">
            {spins.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm py-1">
                <span className="text-lg tracking-wider">{s.symbols.join(" ")}</span>
                <span className={s.win_amount > 0 ? "text-[var(--color-emerald)] font-mono" : "text-[var(--color-fg-muted)] font-mono"}>
                  {s.win_amount > 0 ? `+${Number(s.win_amount).toFixed(2)}` : `−${Number(s.bet).toFixed(2)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function CurrencyTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        active
          ? "bg-[var(--color-surface)] text-white border border-[var(--color-border)]"
          : "text-[var(--color-fg-muted)] hover:text-white"
      }`}
    >
      <span className="mr-1">{icon}</span>{label}
    </button>
  );
}

function translateError(msg: string): string {
  const map: Record<string, string> = {
    insufficient_funds: "Saldo insuficiente",
    bet_out_of_range: "Apuesta fuera de rango",
    kyc_required: "Verifica tu cuenta primero",
    self_excluded: "Estás auto-excluido",
    account_banned: "Cuenta suspendida",
  };
  for (const k of Object.keys(map)) if (msg.includes(k)) return map[k];
  return msg;
}
