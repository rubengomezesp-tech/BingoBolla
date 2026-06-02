import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Profile } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const { data: stats } = await supabase.from("player_stats").select("*").eq("player_id", user.id).maybeSingle();
  const { data: exclusion } = await supabase
    .from("self_exclusions")
    .select("*")
    .eq("player_id", user.id)
    .eq("active", true)
    .maybeSingle();
  const { data: limits } = await supabase.from("rg_limits").select("*").eq("player_id", user.id).maybeSingle();

  return (
    <div className="min-h-screen bg-[var(--color-bg)] grain">
      <header className="sticky top-0 z-30 bg-[var(--color-bg)]/85 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <Link href="/lobby" className="text-sm text-[var(--color-fg-dim)] hover:text-white">← Lobby</Link>
          <div className="font-display text-xl">Mi cuenta</div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF3D7F] to-[#FFD93D] flex items-center justify-center font-display font-bold text-sm">
            {profile?.username?.[0]?.toUpperCase() ?? "?"}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8">
        {/* Profile card */}
        <section className="anim-slide-up">
          <div className="card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF3D7F] to-[#B388FF] flex items-center justify-center font-display text-3xl text-white">
                {profile?.username?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-3xl truncate">{profile?.username}</div>
                <div className="text-sm text-[var(--color-fg-dim)] truncate">{user.email}</div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-[var(--color-emerald)]/15 text-[var(--color-emerald)] border border-[var(--color-emerald)]/30">
                    ✓ VERIFICADO
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-[var(--color-fg-dim)] border border-[var(--color-border)]">
                    📍 {profile?.state}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-6 border-t border-[var(--color-border)]">
              <Balance label="Gold" value={profile?.gold_coins.toLocaleString() ?? "0"} icon="🪙" />
              <Balance label="Sweeps" value={`$${profile?.sweeps_coins.toFixed(2) ?? "0.00"}`} icon="💎" />
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="anim-slide-up">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--color-fg-muted)] mb-3">
            ● Estadísticas
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Partidas" value={`${stats?.games_played ?? 0}`} />
            <Stat label="Victorias" value={`${stats?.total_wins ?? 0}`} />
            <Stat label="Bingos" value={`${stats?.full_houses_won ?? 0}`} />
            <Stat label="Mejor racha" value={`${stats?.best_streak ?? 0}`} />
          </div>
        </section>

        {/* RG status */}
        {exclusion && (
          <section className="anim-slide-up">
            <div className="card p-6 border-[var(--color-magenta)]/40 bg-[var(--color-magenta)]/5">
              <div className="font-display text-xl mb-2">🚫 Auto-exclusión activa</div>
              <div className="text-sm text-[var(--color-fg-dim)]">
                Período: <span className="text-white font-mono">{exclusion.period_type}</span>
                {exclusion.ends_at && (
                  <> · Termina: <span className="text-white font-mono">{new Date(exclusion.ends_at).toLocaleString()}</span></>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Settings */}
        <section className="anim-slide-up">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--color-fg-muted)] mb-3">
            ● Ajustes y seguridad
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <SettingTile
              href="/account/limits"
              icon="⚖️"
              title="Límites de juego"
              subtitle={limits ? "Límites configurados" : "Sin límites configurados"}
              accent="cyan"
            />
            <SettingTile
              href="/account/exclude"
              icon="🚫"
              title="Auto-exclusión"
              subtitle="Tómate un descanso"
              accent="magenta"
            />
            <SettingTile
              href="/store"
              icon="💰"
              title="Comprar Coins"
              subtitle="Recargar saldo"
              accent="gold"
            />
            <SettingTile
              href="/account/sessions"
              icon="🔐"
              title="Sesiones activas"
              subtitle="Dispositivos conectados"
              accent="emerald"
            />
          </div>
        </section>

        {/* Help */}
        <section className="text-center pt-6 border-t border-[var(--color-border)]">
          <div className="text-xs text-[var(--color-fg-muted)] leading-relaxed max-w-md mx-auto">
            ¿Problema con el juego? Si sientes que estás perdiendo el control, considera auto-excluirte. Líneas de ayuda 24/7: <strong className="text-white">1-800-GAMBLER</strong>.
          </div>
        </section>
      </main>
    </div>
  );
}

function Balance({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div>
      <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-1">{label}</div>
      <div className="font-display text-2xl flex items-center gap-1">
        <span>{icon}</span>
        <span>{value}</span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-1">{label}</div>
      <div className="font-display text-2xl">{value}</div>
    </div>
  );
}

function SettingTile({ href, icon, title, subtitle, accent }: { href: string; icon: string; title: string; subtitle: string; accent: string }) {
  const colors: Record<string, string> = {
    magenta: "#FF3D7F", cyan: "#00E5FF", gold: "#FFD93D", emerald: "#00E676",
  };
  return (
    <Link href={href} className="card card-hover p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${colors[accent]}15`, border: `1px solid ${colors[accent]}30` }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-[var(--color-fg-muted)] truncate">{subtitle}</div>
      </div>
      <div className="text-[var(--color-fg-muted)]">→</div>
    </Link>
  );
}
