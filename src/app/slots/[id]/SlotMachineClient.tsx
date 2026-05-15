"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

// ============ SÍMBOLOS: emoji + color por tema ============
const SYMBOL_VISUAL: Record<string, { e: string; c: string }> = {
  seven: { e: "7️⃣", c: "#FF3D7F" }, bar: { e: "🅱️", c: "#FFD93D" },
  bell: { e: "🔔", c: "#FFD93D" }, diamond: { e: "💎", c: "#00E5FF" },
  cherry: { e: "🍒", c: "#FF3D7F" }, lemon: { e: "🍋", c: "#FFD93D" },
  wild: { e: "🌟", c: "#B388FF" },
  mask: { e: "🗿", c: "#C8941A" }, snake: { e: "🐍", c: "#00E676" },
  jaguar: { e: "🐆", c: "#FFD93D" }, pyramid: { e: "🔺", c: "#C8941A" },
  gem_a: { e: "🅰️", c: "#00E5FF" }, gem_k: { e: "🇰", c: "#B388FF" },
  gem_q: { e: "🇶", c: "#FF3D7F" }, gem_j: { e: "🇯", c: "#00E676" },
  scatter: { e: "🪙", c: "#FFD93D" },
  pink_diamond: { e: "💎", c: "#FF3D7F" }, ring: { e: "💍", c: "#FFD93D" },
  goblet: { e: "🏆", c: "#FFD93D" }, watch: { e: "⌚", c: "#B388FF" },
  card_a: { e: "🅰️", c: "#00E5FF" }, card_k: { e: "🇰", c: "#B388FF" },
  card_q: { e: "🇶", c: "#FF3D7F" },
};

function symViz(id: string) {
  return SYMBOL_VISUAL[id] ?? { e: "❓", c: "#888" };
}

type SlotState = {
  machine: {
    id: string; name: string; theme: string; reels: number; rows: number;
    paylines: number; currency: string; min_bet: number; max_bet: number;
    rtp: number; config: any;
  };
  free_spins_left: number;
  streak: number;
  recent: { win: number; bet: number; created_at: string }[];
};

// Audio: se inicializa tras el primer gesto del usuario (fix AudioContext)
let audioCtx: AudioContext | null = null;
function ensureAudio() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; }
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
function beep(freq: number, dur = 0.08, type: OscillatorType = "sine", vol = 0.06) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + dur);
}
function reelStopSound() { beep(220, 0.07, "triangle", 0.08); }
function spinSound() { beep(140, 0.12, "sawtooth", 0.04); }
function winSound() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.12, "sine", 0.07), i * 90)); }
function bigWinSound() { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => beep(f, 0.18, "triangle", 0.08), i * 110)); }

export default function SlotMachineClient({
  initialState, initialProfile, userId,
}: { initialState: SlotState; initialProfile: any; userId: string }) {
  const supabase = createClient();
  const M = initialState.machine;
  const cfg = M.config;
  const colors = cfg.colors ?? { primary: "#FF3D7F", secondary: "#00E5FF", bg: "#0a0118" };
  const symbolPool: string[] = useMemo(
    () => (cfg.symbols ?? []).map((s: any) => s.id),
    [cfg]
  );

  const [profile, setProfile] = useState(initialProfile);
  const [bet, setBet] = useState<number>(M.min_bet);
  const [spinning, setSpinning] = useState(false);
  const [grid, setGrid] = useState<string[][]>(() =>
    Array.from({ length: M.reels }, () =>
      Array.from({ length: M.rows }, () => symbolPool[Math.floor(Math.random() * symbolPool.length)] ?? "seven")
    )
  );
  const [reelSpinning, setReelSpinning] = useState<boolean[]>(Array(M.reels).fill(false));
  const [winLines, setWinLines] = useState<any[]>([]);
  const [lastWin, setLastWin] = useState<number>(0);
  const [freeSpins, setFreeSpins] = useState<number>(initialState.free_spins_left);
  const [streak, setStreak] = useState<number>(initialState.streak);
  const [bigWin, setBigWin] = useState<{ amount: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [autoSpin, setAutoSpin] = useState(false);
  const [displayWin, setDisplayWin] = useState(0);
  const autoRef = useRef(false);

  const curEmoji = M.currency === "gold" ? "🪙" : M.currency === "sweeps" ? "💎" : "✨";
  const balance = M.currency === "gold" ? profile?.gold_coins
    : M.currency === "sweeps" ? profile?.sweeps_coins : profile?.diamonds;

  // Contador de ganancia animado
  useEffect(() => {
    if (lastWin <= 0) { setDisplayWin(0); return; }
    let raf: number; const start = performance.now(); const dur = 800;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayWin(lastWin * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lastWin]);

  const winningCells = useMemo(() => {
    const set = new Set<string>();
    for (const wl of winLines) {
      if (wl.scatter) continue;
      const lines5: number[][] = M.id === "neon-777"
        ? cfg.paylines
        : [[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,0,1,0],[2,1,2,1,2],[1,1,0,1,1],[1,1,2,1,1],[0,1,1,1,0],[2,1,1,1,2],[1,0,1,0,1],[1,2,1,2,1],[0,2,0,2,0],[2,0,2,0,2],[0,0,2,0,0],[2,2,0,2,2],[1,0,2,0,1],[1,2,0,2,1],[0,2,2,2,0],[2,0,0,0,2]];
      const line = lines5[wl.line];
      if (!line) continue;
      for (let r = 0; r < wl.count; r++) set.add(`${r}-${line[r]}`);
    }
    return set;
  }, [winLines, M.id, cfg.paylines]);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.from("profiles")
      .select("gold_coins, sweeps_coins, diamonds").eq("id", userId).single();
    if (data) setProfile(data);
  }, [supabase, userId]);

  async function doSpin() {
    if (spinning) return;
    if (freeSpins <= 0 && (balance ?? 0) < bet) {
      setToast("Saldo insuficiente"); setTimeout(() => setToast(null), 2500); return;
    }
    setSpinning(true);
    setWinLines([]); setLastWin(0); setBigWin(null);
    setReelSpinning(Array(M.reels).fill(true));
    spinSound();

    // Animar grid girando (símbolos random rotando) mientras esperamos el server
    const spinAnim = setInterval(() => {
      setGrid(Array.from({ length: M.reels }, () =>
        Array.from({ length: M.rows }, () => symbolPool[Math.floor(Math.random() * symbolPool.length)])
      ));
    }, 70);

    const { data, error } = await supabase.rpc("spin_slot", {
      p_slug: M.id, p_currency: M.currency, p_bet: bet,
    });

    // Tiempo mínimo de giro para que se sienta (cascada de paradas)
    await new Promise((r) => setTimeout(r, 600));
    clearInterval(spinAnim);

    if (error || !data || data.error) {
      setReelSpinning(Array(M.reels).fill(false));
      setSpinning(false);
      setToast(data?.error === "insufficient_funds" ? "Saldo insuficiente" : (data?.error ?? "Error"));
      setTimeout(() => setToast(null), 2500);
      return;
    }

    const finalGrid: string[][] = data.grid;

    // Parar rodillos en cascada (uno a uno, izquierda → derecha)
    for (let reel = 0; reel < M.reels; reel++) {
      await new Promise((r) => setTimeout(r, reel === 0 ? 0 : 140));
      setGrid((prev) => {
        const next = prev.map((c) => [...c]);
        next[reel] = finalGrid[reel];
        return next;
      });
      setReelSpinning((prev) => { const n = [...prev]; n[reel] = false; return n; });
      reelStopSound();
    }

    await new Promise((r) => setTimeout(r, 150));

    // Resultados
    setWinLines(data.win_lines ?? []);
    setFreeSpins(data.free_spins_left ?? 0);
    if (data.win > 0) {
      setLastWin(data.win);
      if (data.big_win) {
        setBigWin({ amount: data.win });
        bigWinSound();
        setTimeout(() => setBigWin(null), 4000);
      } else {
        winSound();
      }
    }
    if (data.free_spins_awarded > 0) {
      setToast(`🎉 ¡${data.free_spins_awarded} giros gratis!`);
      setTimeout(() => setToast(null), 3500);
    }
    if (typeof data.new_balance === "number") {
      setProfile((p: any) => ({
        ...p,
        [M.currency === "gold" ? "gold_coins" : M.currency === "sweeps" ? "sweeps_coins" : "diamonds"]: data.new_balance,
      }));
    }
    setStreak((s) => (data.win > 0 ? s + 1 : 0));
    setSpinning(false);

    // Auto-spin
    if (autoRef.current && (data.free_spins_left > 0 || (data.new_balance ?? 0) >= bet)) {
      setTimeout(() => { if (autoRef.current) doSpin(); }, 900);
    } else if (autoRef.current) {
      autoRef.current = false; setAutoSpin(false);
    }
  }

  function toggleAuto() {
    const v = !autoSpin; setAutoSpin(v); autoRef.current = v;
    if (v && !spinning) doSpin();
  }

  const betSteps = useMemo(() => {
    const { min_bet: mn, max_bet: mx } = M;
    return [mn, +(mn + (mx - mn) * 0.1).toFixed(2), +(mn + (mx - mn) * 0.25).toFixed(2),
      +(mn + (mx - mn) * 0.5).toFixed(2), mx];
  }, [M]);

  return (
    <div className="min-h-screen grain relative overflow-hidden" style={{ background: colors.bg }}>
      {/* Atmósfera */}
      <div className="absolute inset-0 pointer-events-none opacity-40"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${colors.primary}22, transparent 60%), radial-gradient(ellipse at 80% 100%, ${colors.secondary}18, transparent 55%)` }} />

      {/* BIG WIN overlay */}
      {bigWin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
          <div className="text-center bb-bigwin">
            <div className="font-display leading-none"
              style={{ fontSize: "clamp(4rem,15vw,11rem)",
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 30px " + colors.primary + ")" }}>
              ¡BIG WIN!
            </div>
            <div className="font-mono text-2xl md:text-4xl text-white mt-4">
              {curEmoji} {bigWin.amount.toFixed(M.currency === "gold" ? 0 : 2)}
            </div>
          </div>
          <ParticleBurst color={colors.primary} />
        </div>
      )}

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 anim-slide-up px-4">
          <div className="card glass px-5 py-3 font-medium text-sm border-white/20">{toast}</div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl border-b border-white/10"
        style={{ background: colors.bg + "cc" }}>
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <Link href="/slots" className="text-sm text-white/60 hover:text-white flex items-center gap-1.5">← <span className="hidden sm:inline">Slots</span></Link>
          <div className="font-display text-lg md:text-xl text-white">{M.name}</div>
          <div className="rounded-full px-4 py-1.5 font-mono text-sm border"
            style={{ borderColor: colors.primary + "55", background: colors.primary + "1a", color: "#fff" }}>
            {curEmoji} {(balance ?? 0).toFixed(M.currency === "gold" ? 0 : 2)}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-10 relative z-10">
        {/* Free spins banner */}
        {freeSpins > 0 && (
          <div className="card p-3 mb-4 text-center anim-slide-up"
            style={{ borderColor: colors.secondary + "55", background: colors.secondary + "12" }}>
            <span className="font-mono text-sm" style={{ color: colors.secondary }}>
              🎁 GIROS GRATIS: {freeSpins} {cfg.free_spin_multiplier ? `· x${cfg.free_spin_multiplier}` : ""}
            </span>
          </div>
        )}

        {/* Streak (Diamond Royale multiplicador progresivo) */}
        {M.id === "diamond-royale" && streak > 0 && (
          <div className="text-center mb-4 font-mono text-xs" style={{ color: colors.secondary }}>
            🔥 RACHA {streak} · multiplicador x{cfg.progressive_multipliers?.[Math.min(streak, 3)] ?? 1}
          </div>
        )}

        {/* ===== GRID DE RODILLOS ===== */}
        <div className="card p-4 md:p-6 relative" style={{ borderColor: colors.primary + "33" }}>
          <div className="absolute inset-0 rounded-[inherit] pointer-events-none"
            style={{ boxShadow: `inset 0 0 60px ${colors.primary}15` }} />
          <div className="flex gap-2 md:gap-3 justify-center relative">
            {Array.from({ length: M.reels }).map((_, reel) => (
              <div key={reel} className="flex-1 max-w-[110px] flex flex-col gap-2 md:gap-3">
                {Array.from({ length: M.rows }).map((_, row) => {
                  const sym = grid[reel]?.[row] ?? "seven";
                  const v = symViz(sym);
                  const isWin = winningCells.has(`${row}-${reel}`);
                  const isSpin = reelSpinning[reel];
                  return (
                    <div
                      key={row}
                      className={`relative aspect-square rounded-xl flex items-center justify-center text-3xl md:text-5xl select-none transition-all duration-200
                        ${isSpin ? "bb-reel-spin" : ""} ${isWin ? "bb-sym-win" : ""}`}
                      style={{
                        background: isWin
                          ? `linear-gradient(135deg, ${v.c}33, ${v.c}11)`
                          : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isWin ? v.c + "aa" : "rgba(255,255,255,0.08)"}`,
                        boxShadow: isWin ? `0 0 24px ${v.c}66, inset 0 0 16px ${v.c}33` : "none",
                      }}
                    >
                      <span style={{ filter: isSpin ? "blur(3px)" : "none", transition: "filter 0.15s" }}>
                        {v.e}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Win display */}
          <div className="mt-4 text-center h-12 flex items-center justify-center">
            {lastWin > 0 ? (
              <div className="font-display text-2xl md:text-3xl bb-win-pop"
                style={{ color: colors.secondary }}>
                + {curEmoji} {displayWin.toFixed(M.currency === "gold" ? 0 : 2)}
              </div>
            ) : spinning ? (
              <div className="font-mono text-sm text-white/40">Girando...</div>
            ) : (
              <div className="font-mono text-sm text-white/30">Haz tu apuesta y gira</div>
            )}
          </div>
        </div>

        {/* ===== CONTROLES ===== */}
        <div className="card p-4 md:p-5 mt-4" style={{ borderColor: colors.primary + "22" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-mono uppercase tracking-wider text-white/50">Apuesta</div>
            <div className="font-mono text-lg text-white">{curEmoji} {bet}</div>
          </div>
          <div className="flex gap-2 mb-4 flex-wrap">
            {betSteps.map((b) => (
              <button key={b} onClick={() => setBet(b)} disabled={spinning}
                className={`flex-1 min-w-[56px] py-2 rounded-lg font-mono text-sm transition-all disabled:opacity-40`}
                style={bet === b
                  ? { background: colors.primary, color: colors.bg, fontWeight: 700 }
                  : { background: "rgba(255,255,255,0.05)", color: "#fff" }}>
                {b}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { ensureAudio(); doSpin(); }}
              disabled={spinning}
              className="flex-1 py-4 rounded-xl font-display text-xl transition-all disabled:opacity-50 bb-spin-btn"
              style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, color: "#fff" }}>
              {spinning ? "···" : freeSpins > 0 ? "GIRO GRATIS" : "GIRAR"}
            </button>
            <button
              onClick={() => { ensureAudio(); toggleAuto(); }}
              className="px-5 rounded-xl font-mono text-sm transition-all border"
              style={autoSpin
                ? { background: colors.secondary, color: colors.bg, borderColor: colors.secondary }
                : { background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.2)" }}>
              {autoSpin ? "■ AUTO" : "▶ AUTO"}
            </button>
          </div>
        </div>

        {/* Paytable resumida */}
        <details className="card p-4 mt-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <summary className="font-mono text-xs uppercase tracking-wider text-white/50 cursor-pointer">
            Tabla de pagos · RTP {(M.rtp * 100).toFixed(0)}%
          </summary>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
            {(cfg.symbols ?? []).map((s: any) => {
              const v = symViz(s.id);
              const maxPay = Math.max(...Object.values(s.pays ?? { 0: 0 }).map(Number));
              return (
                <div key={s.id} className="flex items-center gap-2 text-sm">
                  <span className="text-xl">{v.e}</span>
                  <span className="text-white/60 font-mono text-xs">
                    {s.wild ? "WILD" : s.scatter ? "SCATTER" : `×${maxPay}`}
                  </span>
                </div>
              );
            })}
          </div>
        </details>
      </main>

      <style>{`
        @keyframes bb-reel-blur { 0%{transform:translateY(-8%)} 100%{transform:translateY(8%)} }
        .bb-reel-spin { animation: bb-reel-blur 0.12s linear infinite alternate; }
        @keyframes bb-sym-pop { 0%{transform:scale(1)} 40%{transform:scale(1.12)} 100%{transform:scale(1)} }
        .bb-sym-win { animation: bb-sym-pop 0.6s ease-in-out infinite; }
        @keyframes bb-win-pop-k { 0%{transform:scale(0.6);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        .bb-win-pop { animation: bb-win-pop-k 0.5s cubic-bezier(.34,1.56,.64,1); }
        @keyframes bb-bigwin-k { 0%{transform:scale(0.3) rotate(-8deg);opacity:0} 50%{transform:scale(1.1) rotate(3deg)} 100%{transform:scale(1) rotate(0);opacity:1} }
        .bb-bigwin { animation: bb-bigwin-k 0.7s cubic-bezier(.34,1.56,.64,1); }
        .bb-spin-btn:active:not(:disabled) { transform: scale(0.97); }
        .bb-spin-btn:hover:not(:disabled) { filter: brightness(1.1); box-shadow: 0 8px 30px ${colors.primary}55; }
      `}</style>
    </div>
  );
}

function ParticleBurst({ color }: { color: string }) {
  const parts = useMemo(() =>
    Array.from({ length: 40 }, () => ({
      x: 50 + (Math.random() - 0.5) * 14,
      y: 50 + (Math.random() - 0.5) * 14,
      dx: (Math.random() - 0.5) * 130,
      dy: (Math.random() - 0.5) * 130,
      d: Math.random() * 0.4,
      s: 4 + Math.random() * 8,
    })), []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {parts.map((p, i) => (
        <div key={i} className="absolute rounded-full"
          style={{
            left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s,
            background: i % 2 ? color : "#FFD93D",
            animation: `bb-particle 1.4s ease-out ${p.d}s forwards`,
            ["--dx" as any]: `${p.dx}px`, ["--dy" as any]: `${p.dy}px`,
          }} />
      ))}
      <style>{`@keyframes bb-particle { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0} }`}</style>
    </div>
  );
}
