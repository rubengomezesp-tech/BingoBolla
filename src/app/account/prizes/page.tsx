import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PATTERN_LABEL: Record<string, string> = {
  line: "Línea",
  two_lines: "Doble línea",
  full_house: "¡Bingo!",
};

export default async function PrizesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: history } = await supabase.rpc("my_prize_history");
  const prizes = Array.isArray(history) ? history : [];

  const totalSweeps = prizes.reduce((s: number, p: any) => s + Number(p.prize_sweeps || 0), 0);
  const totalGold = prizes.reduce((s: number, p: any) => s + Number(p.prize_gold || 0), 0);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] grain">
      <header className="sticky top-0 z-30 bg-[var(--color-bg)]/85 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <Link href="/account" className="text-sm text-[var(--color-fg-dim)] hover:text-white">← Cuenta</Link>
          <div className="font-display text-lg">Mis premios</div>
          <div className="w-12" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="card p-5 text-center">
            <div className="text-[10px] font-mono uppercase text-[var(--color-fg-muted)]">Total Sweeps ganado</div>
            <div className="font-display text-3xl text-[var(--color-magenta)] mt-1">${totalSweeps.toFixed(2)}</div>
          </div>
          <div className="card p-5 text-center">
            <div className="text-[10px] font-mono uppercase text-[var(--color-fg-muted)]">Total Gold ganado</div>
            <div className="font-display text-3xl text-[var(--color-gold)] mt-1">{totalGold.toLocaleString()}</div>
          </div>
        </div>

        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--color-fg-muted)] mb-3">
          ● Historial ({prizes.length})
        </div>

        {prizes.length === 0 ? (
          <div className="card p-10 text-center text-[var(--color-fg-muted)] italic-serif">
            Aún no has ganado premios. ¡Juega una partida! 🎯
          </div>
        ) : (
          <div className="space-y-2">
            {prizes.map((p: any, i: number) => (
              <div key={i} className="card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {p.pattern === "full_house" ? "🏆" : p.pattern === "two_lines" ? "✨" : "🎯"}
                  </div>
                  <div>
                    <div className="font-medium">{PATTERN_LABEL[p.pattern] ?? p.pattern}</div>
                    <div className="text-xs text-[var(--color-fg-muted)]">
                      {p.room} · {new Date(p.claimed_at).toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono text-sm">
                  {Number(p.prize_sweeps) > 0 && <div className="text-[var(--color-magenta)]">+${Number(p.prize_sweeps).toFixed(2)}</div>}
                  {Number(p.prize_gold) > 0 && <div className="text-[var(--color-gold)]">+{Number(p.prize_gold).toLocaleString()} 🪙</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
