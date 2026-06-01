"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Mapa de ids de simbolo -> emoji visual
const SYM: Record<string, string> = {
  seven: "7️⃣", bar: "🅱️", bell: "🔔", diamond: "💎",
  cherry: "🍒", lemon: "🍋", wild: "⭐", coin: "🪙",
};
function glyph(id: string | null): string {
  if (!id) return "❔";
  return SYM[id] ?? "❔";
}

type Machine = {
  id: string; slug: string; name: string; emoji: string; theme_color: string;
  min_bet_gold: number; max_bet_gold: number;
  min_bet_sweeps: number; max_bet_sweeps: number; rtp: number;
};

export default function HoldWinSlot({
  machine, initialProfile,
}: {
  machine: Machine; initialProfile: any;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState(initialProfile);
  const [bet, setBet] = useState<number>(machine.min_bet_gold);
  const [currency, setCurrency] = useState<"gold" | "sweeps" | "diamonds">("gold");
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // grid 3x3 lineal (9 celdas). Estado visual.
  const [grid, setGrid] = useState<(string | null)[]>(Array(9).fill("seven"));
  const [grandPool, setGrandPool] = useState<number>(0);

  // Hold & Win state
  const [hwActive, setHwActive] = useState(false);
  const [hwRespins, setHwRespins] = useState(3);
  const [hwFlash, setHwFlash] = useState(false);
  const [coinCells, setCoinCells] = useState<boolean[]>(Array(9).fill(false));
  const [coinVals, setCoinVals] = useState<(number | null)[]>(Array(9).fill(null));
  const [grandWon, setGrandWon] = useState(false);

  const [lastWin, setLastWin] = useState<number | null>(null);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cargar grand pool al montar
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("slot_jackpots")
        .select("grand_pool")
        .eq("machine_id", machine.id)
        .maybeSingle();
      if (data) setGrandPool(Number(data.grand_pool));
    })();
    return () => {
      if (animRef.current) clearInterval(animRef.current);
      timers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const balance = currency === "gold" ? profile?.gold_coins ?? 0
    : currency === "sweeps" ? profile?.sweeps_coins ?? 0
    : profile?.diamonds ?? 0;

  const presets = currency === "gold"
    ? [machine.min_bet_gold, machine.min_bet_gold * 5, machine.min_bet_gold * 10, machine.max_bet_gold]
    : currency === "sweeps"
    ? [machine.min_bet_sweeps, machine.min_bet_sweeps * 5, machine.min_bet_sweeps * 10, machine.max_bet_sweeps]
    : [1, 5, 10, 50];

  function resetHW() {
    setHwActive(false);
    setHwRespins(3);
    setHwFlash(false);
    setCoinCells(Array(9).fill(false));
    setCoinVals(Array(9).fill(null));
    setGrandWon(false);
  }

  async function spin() {
    if (spinning) return;
    setError(null);
    setLastWin(null);
    resetHW();

    const min = currency === "gold" ? machine.min_bet_gold : currency === "sweeps" ? machine.min_bet_sweeps : 1;
    const max = currency === "gold" ? machine.max_bet_gold : currency === "sweeps" ? machine.max_bet_sweeps : 50;
    if (bet < min || bet > max) { setError(`Apuesta entre ${min} y ${max}`); return; }
    if (bet > balance) { setError("Saldo insuficiente"); return; }

    setSpinning(true);

    // Animacion: barajar grid rapido
    const pool = ["seven", "bar", "bell", "diamond", "cherry", "lemon", "wild", "coin"];
    animRef.current = setInterval(() => {
      setGrid(Array.from({ length: 9 }, () => pool[Math.floor(Math.random() * pool.length)]));
    }, 70);

    try {
      const response = await fetch("/api/slots/spin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          engine: "hold_win",
          slug: machine.slug,
          currency,
          bet,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? "spin_failed");
      const res = payload?.data as any;
      if (res?.error) throw new Error(res.error);

      // grid viene como [[col0_r0,col0_r1,col0_r2],[col1...],[col2...]]
      // Lo aplanamos por filas para mostrar 3x3 (fila = r, col = c)
      const g: string[][] = res.grid;
      const flat: (string | null)[] = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) flat.push(g?.[c]?.[r] ?? null);

      // Parar reels escalonado
      timers.current.push(setTimeout(() => {
        if (animRef.current) clearInterval(animRef.current);
        setGrid(flat);
        setSpinning(false);

        // Actualizar balance
        setProfile((p: any) => {
          const u = { ...p };
          if (currency === "gold") u.gold_coins = res.new_balance;
          else if (currency === "sweeps") u.sweeps_coins = res.new_balance;
          else u.diamonds = res.new_balance;
          return u;
        });
        if (typeof res.grand_pool === "number") setGrandPool(res.grand_pool);

        const win = Number(res.win) || 0;

        // ¿Hold & Win?
        if (res.hold_win) {
          runHoldWinAnimation(flat, res, win);
        } else {
          if (win > 0) setLastWin(win);
          setTimeout(() => router.refresh(), 1500);
        }
      }, 1100));
    } catch (err: any) {
      if (animRef.current) clearInterval(animRef.current);
      setSpinning(false);
      setError(translateError(err.message ?? "error"));
    }
  }

  // Anima el Hold & Win: el SQL YA decidio todo (coin_values, filled, grand).
  // Aqui solo lo presentamos dramaticamente.
  function runHoldWinAnimation(flat: (string | null)[], res: any, finalWin: number) {
    setHwActive(true);
    const values: number[] = (res.coin_values ?? []).map((v: any) => Number(v));
    const totalCoins = Number(res.coins_filled) || values.length;
    const isGrand = !!res.grand_won;

    // Detectar celdas que YA tienen coin en el grid inicial
    const initialCoins: number[] = [];
    flat.forEach((s, i) => { if (s === "coin") initialCoins.push(i); });

    // Celdas no-coin disponibles para "fijar" monedas extra durante respins
    const emptyOrder: number[] = [];
    for (let i = 0; i < 9; i++) if (!initialCoins.includes(i)) emptyOrder.push(i);

    const cells = Array(9).fill(false);
    const vals: (number | null)[] = Array(9).fill(null);
    let vi = 0;

    // Paso 1: fijar las monedas iniciales
    initialCoins.forEach((idx) => {
      if (vi < values.length) { cells[idx] = true; vals[idx] = values[vi++]; }
    });
    setCoinCells([...cells]);
    setCoinVals([...vals]);
    setHwRespins(3);

    // Paso 2: animar monedas adicionales hasta totalCoins
    let placed = initialCoins.length;
    let ei = 0;
    let respins = 3;
    let step = 0;

    const tick = () => {
      if (placed >= totalCoins || placed >= 9) {
        // Fin: mostrar premio (Grand si aplica)
        timers.current.push(setTimeout(() => {
          setGrandWon(isGrand);
          setLastWin(finalWin);
          setTimeout(() => router.refresh(), 2200);
        }, 600));
        return;
      }
      // Cada "respin" puede traer 1 moneda nueva (segun lo que el SQL ya decidio)
      if (ei < emptyOrder.length && placed < totalCoins) {
        const idx = emptyOrder[ei++];
        cells[idx] = true;
        vals[idx] = vi < values.length ? values[vi++] : bet;
        placed++;
        setCoinCells([...cells]);
        setCoinVals([...vals]);
        // RESET respins a 3 + flash (el momento dopamina)
        respins = 3;
        setHwRespins(3);
        setHwFlash(true);
        timers.current.push(setTimeout(() => setHwFlash(false), 350));
      } else {
        respins -= 1;
        setHwRespins(Math.max(0, respins));
      }
      step++;
      timers.current.push(setTimeout(tick, 750));
    };
    timers.current.push(setTimeout(tick, 900));
  }

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-10">
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

        {/* Grand jackpot en vivo */}
        <div className="text-center mb-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--color-fg-muted)]">
            🏆 Grand Jackpot
          </div>
          <div className="font-display text-3xl md:text-4xl shimmer-gold">
            {Number(grandPool).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="text-center mb-5">
          <div className="text-4xl mb-1">{machine.emoji}</div>
          <h1 className="font-display text-2xl md:text-3xl">{machine.name}</h1>
        </div>

        {/* Banner Hold & Win */}
        {hwActive && (
          <div
            className={`text-center mb-4 py-3 rounded-2xl anim-scale-in transition-all ${hwFlash ? "scale-105" : ""}`}
            style={{
              background: hwFlash
                ? "linear-gradient(135deg,#FFD93D,#C8941A)"
                : "rgba(255,217,61,0.12)",
              border: "1px solid rgba(255,217,61,0.4)",
            }}
          >
            <div className="font-display text-xl md:text-2xl" style={{ color: hwFlash ? "#08080C" : "#FFD93D" }}>
              🪙 HOLD &amp; WIN
            </div>
            <div className="font-mono text-sm" style={{ color: hwFlash ? "#08080C" : "#fff" }}>
              {hwRespins} RESPIN{hwRespins === 1 ? "" : "S"}
            </div>
          </div>
        )}

        {/* Grid 3x3 */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 max-w-sm mx-auto mb-6">
          {grid.map((sym, i) => {
            const isCoin = coinCells[i];
            return (
              <div
                key={i}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center text-4xl md:text-5xl shadow-lg transition-all duration-300 ${
                  spinning ? "anim-blur" : ""
                }`}
                style={{
                  background: isCoin
                    ? "linear-gradient(135deg,#FFD93D,#C8941A)"
                    : "var(--color-surface-2)",
                  border: isCoin
                    ? "2px solid #FFD93D"
                    : "2px solid var(--color-border)",
                  boxShadow: isCoin ? "0 0 20px rgba(255,217,61,0.5)" : undefined,
                }}
              >
                <span>{isCoin ? "🪙" : glyph(sym)}</span>
                {isCoin && coinVals[i] != null && (
                  <span className="text-[10px] font-mono font-bold" style={{ color: "#08080C" }}>
                    {Number(coinVals[i]).toFixed(2)}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Grand won overlay */}
        {grandWon && (
          <div className="text-center mb-4 anim-scale-in">
            <div className="font-display text-4xl md:text-5xl shimmer-gold">
              🏆 GRAND JACKPOT 🏆
            </div>
          </div>
        )}

        {/* Win flash */}
        {lastWin != null && lastWin > 0 && !spinning && (
          <div className="text-center mb-5 anim-scale-in">
            <div className="font-display text-4xl md:text-5xl shimmer-gold">
              +{Number(lastWin).toFixed(2)}
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
          <div className="flex gap-2">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setBet(p)}
                disabled={spinning}
                className={`flex-1 py-2 rounded-lg font-mono text-sm transition-colors disabled:opacity-50 ${
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

        <button
          onClick={spin}
          disabled={spinning || bet > balance}
          className="btn btn-primary w-full py-4 text-lg disabled:opacity-50"
          style={spinning || bet > balance ? {} : { background: machine.theme_color, color: "#0a0a0c" }}
        >
          {spinning ? "Girando..." : bet > balance ? "Saldo insuficiente" : `Girar ${bet}`}
        </button>

        <div className="mt-3 text-center text-[10px] font-mono text-[var(--color-fg-muted)]">
          Junta 4+ 🪙 para activar HOLD &amp; WIN · Llena la pantalla → GRAND
        </div>
      </div>
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
    invalid_bet: "Apuesta fuera de rango",
    not_authenticated: "Inicia sesión",
    machine_not_found: "Máquina no encontrada",
    wrong_currency: "Moneda incorrecta para esta máquina",
  };
  for (const k of Object.keys(map)) if (msg.includes(k)) return map[k];
  return msg;
}
