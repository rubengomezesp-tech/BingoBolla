import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const THEME_META: Record<string, { emoji: string; tag: string; grad: string }> = {
  "neon-777": { emoji: "🎰", tag: "CLÁSICA · SYNTHWAVE", grad: "from-[#FF3D7F] to-[#00E5FF]" },
  "aztec-gold": { emoji: "🗿", tag: "AVENTURA · FREE SPINS", grad: "from-[#C8941A] to-[#00E676]" },
  "diamond-royale": { emoji: "💎", tag: "VIP · MULTIPLICADORES", grad: "from-[#B388FF] to-[#FFD93D]" },
};

export default async function SlotsLobby() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: machines }, { data: profile }] = await Promise.all([
    supabase.from("slot_machines").select("*").eq("active", true).order("rtp"),
    supabase.from("profiles").select("gold_coins, sweeps_coins, diamonds").eq("id", user.id).single(),
  ]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] grain">
      <header className="sticky top-0 z-30 bg-[var(--color-bg)]/85 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <Link href="/lobby" className="text-sm text-[var(--color-fg-dim)] hover:text-white flex items-center gap-1.5">← <span className="hidden sm:inline">Lobby</span></Link>
          <div className="font-display text-lg md:text-xl">Slots</div>
          <div className="flex items-center gap-2">
            <div className="glass rounded-full px-3 py-1.5 font-mono text-xs">🪙 {(profile?.gold_coins ?? 0).toLocaleString()}</div>
            <div className="rounded-full px-3 py-1.5 bg-[var(--color-magenta)]/15 border border-[var(--color-magenta)]/30 font-mono text-xs">💎 {(profile?.sweeps_coins ?? 0).toFixed(2)}</div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-8 anim-slide-up">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-[var(--color-fg-muted)] mb-2">● MÁQUINAS</div>
          <h1 className="font-display text-3xl md:text-5xl">Elige tu suerte</h1>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {(machines ?? []).map((m: any, i: number) => {
            const meta = THEME_META[m.id] ?? { emoji: "🎰", tag: m.theme, grad: "from-[#FF3D7F] to-[#00E5FF]" };
            const curEmoji = m.currency === "gold" ? "🪙" : m.currency === "sweeps" ? "💎" : "✨";
            return (
              <Link
                key={m.id}
                href={`/slots/${m.id}`}
                className="card p-6 card-lift relative overflow-hidden group anim-slide-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={`absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br ${meta.grad} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />
                <div className="text-5xl mb-4">{meta.emoji}</div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-1">{meta.tag}</div>
                <div className="font-display text-2xl mb-4">{m.name}</div>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-[var(--color-fg-muted)]">RTP</div>
                    <div className="font-mono text-[var(--color-emerald)]">{(m.rtp * 100).toFixed(0)}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono uppercase text-[var(--color-fg-muted)]">Apuesta</div>
                    <div className="font-mono">{curEmoji} {m.min_bet}–{m.max_bet}</div>
                  </div>
                </div>
                <div className={`mt-4 text-sm font-medium bg-gradient-to-r ${meta.grad} bg-clip-text text-transparent`}>
                  {m.reels}×{m.rows} · {m.paylines} líneas · Jugar →
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-12 text-center text-xs text-[var(--color-fg-muted)]">
          🎲 RNG verificable server-side · RTP auditado · Juego responsable · 21+
        </div>
      </main>
    </div>
  );
}
