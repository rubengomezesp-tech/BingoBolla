import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { RoomLive, Profile } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const variantMeta: Record<string, { emoji: string; label: string; accent: string }> = {
  bingo75: { emoji: "🎯", label: "Bingo 75", accent: "#FF3D7F" },
  bingo90: { emoji: "🇬🇧", label: "Bingo 90", accent: "#00E5FF" },
  lite: { emoji: "⚡", label: "Speedy Lite", accent: "#FFD93D" },
  cinco: { emoji: "✨", label: "Cinco", accent: "#B388FF" },
  pulse: { emoji: "💫", label: "Pulse", accent: "#00E676" },
};

export default async function LobbyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile?.kyc_status || profile.kyc_status === "unverified") redirect("/onboarding");

  const { data: excluded } = await supabase.from("excluded_states").select("state").eq("blocks_sweeps", true);
  const excludedSet = new Set(excluded?.map((e: any) => e.state) ?? []);
  const stateExcluded = profile.state && excludedSet.has(profile.state);

  const { data: rooms } = await supabase
    .from("rooms_live")
    .select("*")
    .order("ticket_sweeps", { ascending: true });

  return (
    <div className="min-h-screen bg-[var(--color-bg)] grain">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-[var(--color-bg)]/80 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF3D7F] to-[#B388FF] flex items-center justify-center">
              <span className="font-display text-white">B</span>
            </div>
            <span className="font-display text-xl hidden sm:inline">BingoBolla</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/store"
              className="flex items-center gap-2 glass rounded-full px-3.5 py-2 hover:bg-white/10 transition-colors group"
            >
              <span className="text-[var(--color-gold)]">🪙</span>
              <span className="font-mono font-semibold text-sm">{profile.gold_coins.toLocaleString()}</span>
              <span className="text-[var(--color-fg-muted)] group-hover:text-white text-sm">+</span>
            </Link>
            <Link
              href="/store"
              className="flex items-center gap-2 rounded-full px-3.5 py-2 bg-[var(--color-magenta)]/15 border border-[var(--color-magenta)]/30 hover:bg-[var(--color-magenta)]/25 transition-colors"
            >
              <span>💎</span>
              <span className="font-mono font-semibold text-sm">{profile.sweeps_coins.toFixed(2)}</span>
            </Link>
            <Link
              href="/account"
              className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF3D7F] to-[#FFD93D] flex items-center justify-center font-display font-bold text-sm text-white"
            >
              {profile.username?.[0]?.toUpperCase() ?? "?"}
            </Link>
          </div>
        </div>

        {stateExcluded && (
          <div className="border-t border-[var(--color-border)] bg-[var(--color-gold)]/10">
            <div className="max-w-7xl mx-auto px-6 py-2.5 text-xs text-[var(--color-fg-dim)]">
              ⚠️ <strong className="text-white">{profile.state}</strong> has restrictions — Gold Coins only, no Sweeps.
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Welcome */}
        <div className="mb-12 anim-slide-up">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-magenta)] mb-3">
            ● Welcome back
          </div>
          <h1 className="font-display text-5xl md:text-6xl mb-2">
            Hey, <span className="italic-serif">{profile.username}</span>
          </h1>
          <p className="text-[var(--color-fg-dim)]">
            Verified in {profile.state} · {profile.kyc_status === "self_declared" ? "Age confirmed" : "KYC complete"}
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <StatTile label="Gold balance" value={`${profile.gold_coins.toLocaleString()}`} accent="#FFD93D" icon="🪙" />
          <StatTile label="Sweeps balance" value={`$${profile.sweeps_coins.toFixed(2)}`} accent="#FF3D7F" icon="💎" />
          <StatTile label="Won lifetime" value={`$${Number(profile.total_won_sweeps).toFixed(2)}`} accent="#00E676" icon="🏆" />
          <StatTile label="Rooms live" value={String(rooms?.length ?? 0)} accent="#00E5FF" icon="🎯" />
        </div>

        {/* Section title */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-fg-muted)] mb-2">
              ● Live rooms
            </div>
            <h2 className="font-display text-3xl">Pick a room</h2>
          </div>
          <Link href="/store" className="btn btn-ghost text-sm hidden md:inline-flex">
            💰 Buy coins
          </Link>
        </div>

        {/* Rooms grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {rooms?.map((room: RoomLive) => {
            const meta = variantMeta[room.variant] ?? variantMeta.bingo75;
            const players = room.players_in_play ?? 0;
            const potSweeps = Number(room.pot_sweeps ?? 0);
            const isPlaying = room.game_status === "playing";
            return (
              <Link
                key={room.id}
                href={`/room/${room.id}`}
                className="room-card p-6 anim-slide-up group"
                style={{ ['--accent' as any]: meta.accent }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-3xl">{meta.emoji}</div>
                  {isPlaying ? (
                    <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-[var(--color-emerald)]/15 text-[var(--color-emerald)] border border-[var(--color-emerald)]/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-emerald)] anim-blink" />
                      LIVE
                    </span>
                  ) : (
                    <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-white/5 text-[var(--color-fg-dim)] border border-[var(--color-border)]">
                      WAITING
                    </span>
                  )}
                </div>

                <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-1">
                  {meta.label}
                </div>
                <div className="font-display text-3xl mb-6">{room.name}</div>

                <div className="grid grid-cols-2 gap-4 pt-5 border-t border-[var(--color-border)]">
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-1">
                      Pot
                    </div>
                    <div className="font-display text-2xl shimmer-gold">${potSweeps.toFixed(2)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-1">
                      Ticket
                    </div>
                    <div className="font-mono text-lg">${room.ticket_sweeps}</div>
                    <div className="font-mono text-xs text-[var(--color-fg-muted)]">or {room.ticket_gold} 🪙</div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm text-[var(--color-fg-dim)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-emerald)]" />
                    {players} playing
                  </div>
                  <div className="text-sm font-medium text-[var(--color-fg-dim)] group-hover:text-white transition-colors">
                    Enter →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function StatTile({ label, value, accent, icon }: { label: string; value: string; accent: string; icon: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-fg-muted)]">{label}</div>
        <span className="text-base opacity-80">{icon}</span>
      </div>
      <div className="font-display text-2xl" style={{ color: accent }}>{value}</div>
    </div>
  );
}
