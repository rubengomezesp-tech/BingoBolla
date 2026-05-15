import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/supabase/types";
import DailyBonus from "./DailyBonus";

export const dynamic = "force-dynamic";

const variantMeta: Record<string, { emoji: string; label: string; accent: string }> = {
  bingo75: { emoji: "🎯", label: "Bingo 75", accent: "#FF3D7F" },
  bingo90: { emoji: "🇬🇧", label: "Bingo 90", accent: "#00E5FF" },
  lite: { emoji: "⚡", label: "Speedy Lite", accent: "#FFD93D" },
  cinco: { emoji: "✨", label: "Cinco", accent: "#B388FF" },
  pulse: { emoji: "💫", label: "Pulse", accent: "#00E676" },
};

type RoomRow = {
  id: string;
  name: string;
  variant: string;
  ticket_gold: number;
  ticket_sweeps: number;
  rtp: number;
  rollover_sweeps: number;
  rollover_gold: number;
  game_status: string | null;
  pot_sweeps: number | null;
  pot_gold: number | null;
  effective_pot_sweeps: number;
  effective_pot_gold: number;
  players_in_play: number;
};

export default async function LobbyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile?.kyc_status || profile.kyc_status === "unverified") redirect("/onboarding");

  const today = new Date().toISOString().slice(0, 10);
  const { data: bonus } = await supabase
    .from("daily_bonuses_claimed")
    .select("claimed_date")
    .eq("player_id", user.id)
    .eq("claimed_date", today)
    .maybeSingle();

  const { data: excluded } = await supabase.from("excluded_states").select("state").eq("blocks_sweeps", true);
  const excludedSet = new Set(excluded?.map((e: any) => e.state) ?? []);
  const stateExcluded = profile.state && excludedSet.has(profile.state);

  const { data: rooms } = await supabase
    .from("rooms_live")
    .select("*")
    .order("ticket_sweeps", { ascending: true });

  const { data: stats } = await supabase
    .from("player_stats")
    .select("*")
    .eq("player_id", user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-[var(--color-bg)] grain">
      <header className="sticky top-0 z-30 bg-[var(--color-bg)]/85 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF3D7F] to-[#B388FF] flex items-center justify-center">
              <span className="font-display text-white">B</span>
            </div>
            <span className="font-display text-xl hidden sm:inline">BingoBolla</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/store" className="glass rounded-full px-3 py-1.5 hover:bg-white/10 flex items-center gap-1.5 transition-colors">
              <span className="text-[var(--color-gold)]">🪙</span>
              <span className="font-mono font-semibold text-sm">{profile.gold_coins.toLocaleString()}</span>
            </Link>
            <Link href="/store" className="rounded-full px-3 py-1.5 bg-[var(--color-magenta)]/15 border border-[var(--color-magenta)]/30 hover:bg-[var(--color-magenta)]/25 flex items-center gap-1.5 transition-colors">
              <span>💎</span>
              <span className="font-mono font-semibold text-sm">{profile.sweeps_coins.toFixed(2)}</span>
            </Link>
            <Link href="/account" className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF3D7F] to-[#FFD93D] flex items-center justify-center font-display font-bold text-sm">
              {profile.username?.[0]?.toUpperCase() ?? "?"}
            </Link>
          </div>
        </div>

        {stateExcluded && (
          <div className="border-t border-[var(--color-border)] bg-[var(--color-gold)]/10">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-2 text-xs text-[var(--color-fg-dim)]">
              ⚠️ <strong className="text-white">{profile.state}</strong> tiene restricciones — solo Gold Coins.
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4 anim-slide-up">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-magenta)] mb-2">
              ● Bienvenido
            </div>
            <h1 className="font-display text-4xl md:text-5xl">
              Hola, <span className="italic-serif">{profile.username}</span>
            </h1>
          </div>
          {!bonus && <DailyBonus />}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <StatTile label="Partidas" value={`${stats?.games_played ?? 0}`} icon="🎮" accent="#00E5FF" />
          <StatTile label="Victorias" value={`${stats?.total_wins ?? 0}`} icon="🏆" accent="#FFD93D" />
          <StatTile label="Racha" value={`${stats?.current_streak ?? 0}`} icon="🔥" accent="#FF3D7F" />
          <StatTile label="Ganado" value={`$${Number(stats?.total_sweeps_won ?? 0).toFixed(2)}`} icon="💎" accent="#00E676" />
        </div>

        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-fg-muted)] mb-2">
              ● Salas en vivo
            </div>
            <h2 className="font-display text-2xl md:text-3xl">Elige una sala</h2>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 stagger">
          {(rooms as RoomRow[] | null)?.map((room) => {
            const meta = variantMeta[room.variant] ?? variantMeta.bingo75;
            const players = room.players_in_play ?? 0;
            const effectivePot = Number(room.effective_pot_sweeps ?? 0);
            const rollover = Number(room.rollover_sweeps ?? 0);
            const isPlaying = room.game_status === "playing";
            const hasJackpot = rollover > 0;

            return (
              <Link
                key={room.id}
                href={`/room/${room.id}`}
                className="room-card p-5 anim-slide-up group relative"
                style={{ ['--accent' as any]: meta.accent }}
              >
                {hasJackpot && (
                  <div className="absolute -top-2 -right-2 font-mono text-[10px] px-2 py-1 rounded-md bg-[var(--color-gold)] text-bb-ink chunky shadow-lg shadow-[var(--color-gold)]/50">
                    🔥 JACKPOT +${rollover.toFixed(2)}
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div className="text-3xl">{meta.emoji}</div>
                  {isPlaying ? (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-[var(--color-emerald)]/15 text-[var(--color-emerald)] border border-[var(--color-emerald)]/30 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-[var(--color-emerald)] anim-blink" />
                      LIVE
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-[var(--color-gold)]/15 text-[var(--color-gold)] border border-[var(--color-gold)]/30">
                      EMPIEZA PRONTO
                    </span>
                  )}
                </div>

                <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-1">
                  {meta.label} · RTP {(Number(room.rtp) * 100).toFixed(0)}%
                </div>
                <div className="font-display text-2xl mb-4">{room.name}</div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[var(--color-border)]">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-0.5">
                      {hasJackpot ? "Pozo total" : "Pozo"}
                    </div>
                    <div className="font-display text-xl shimmer-gold">${effectivePot.toFixed(2)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-0.5">
                      Cartón
                    </div>
                    <div className="font-mono text-base">${room.ticket_sweeps}</div>
                    <div className="font-mono text-[10px] text-[var(--color-fg-muted)]">{room.ticket_gold} 🪙</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--color-fg-dim)]">
                    <span className="w-1 h-1 rounded-full bg-[var(--color-emerald)]" />
                    {players} jugando
                  </div>
                  <div className="text-xs font-medium text-[var(--color-fg-dim)] group-hover:text-white transition-colors">
                    Entrar →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-10 text-center text-xs text-[var(--color-fg-muted)] leading-relaxed max-w-2xl mx-auto">
          Cada sala muestra su <strong className="text-white">RTP</strong> (Return To Player). Los premios no entregados en una ronda se acumulan al <strong className="text-[var(--color-gold)]">jackpot 🔥</strong> de la siguiente. Juego transparente, ganancias reales.
        </div>
      </main>
    </div>
  );
}

function StatTile({ label, value, accent, icon }: { label: string; value: string; accent: string; icon: string }) {
  return (
    <div className="card p-3 md:p-4">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10px] md:text-xs font-mono uppercase tracking-wider text-[var(--color-fg-muted)]">{label}</div>
        <span className="text-sm md:text-base opacity-80">{icon}</span>
      </div>
      <div className="font-display text-xl md:text-2xl" style={{ color: accent }}>{value}</div>
    </div>
  );
}
