import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ExclusionForm from "./ExclusionForm";

export const dynamic = "force-dynamic";

export default async function ExcludePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: active } = await supabase
    .from("self_exclusions")
    .select("*")
    .eq("player_id", user.id)
    .eq("active", true)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-[var(--color-bg)] grain">
      <header className="sticky top-0 z-30 bg-[var(--color-bg)]/85 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <Link href="/account" className="text-sm text-[var(--color-fg-dim)] hover:text-white">← Mi cuenta</Link>
          <div className="font-display text-lg">Auto-exclusión</div>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-8 anim-slide-up">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--color-magenta)] mb-2">
            🚫 Tomar un descanso
          </div>
          <h1 className="font-display text-3xl md:text-4xl mb-3">Auto-excluirte de BingoBolla</h1>
          <p className="text-[var(--color-fg-dim)] leading-relaxed">
            Bloquea tu acceso al juego por un período. Durante ese tiempo no podrás iniciar sesión, comprar coins ni jugar.
            <strong className="text-white"> No se puede deshacer hasta que termine el período.</strong>
          </p>
        </div>

        {active ? (
          <ActiveExclusion exclusion={active} />
        ) : (
          <ExclusionForm />
        )}

        <div className="mt-10 text-xs text-[var(--color-fg-muted)] leading-relaxed">
          ¿Crees que tienes un problema con el juego? Llama a <strong className="text-white">1-800-GAMBLER</strong> (USA),
          es gratis y confidencial. También puedes visitar{" "}
          <a href="https://www.ncpgambling.org/" target="_blank" rel="noopener" className="underline text-[var(--color-cyan)]">
            NCPGambling.org
          </a>.
        </div>
      </main>
    </div>
  );
}

function ActiveExclusion({ exclusion }: { exclusion: any }) {
  return (
    <div className="card p-6 md:p-8 border-[var(--color-magenta)]/40 bg-[var(--color-magenta)]/5">
      <div className="font-display text-2xl mb-2">🚫 Auto-exclusión activa</div>
      <div className="space-y-2 text-sm mt-4">
        <div className="flex justify-between">
          <span className="text-[var(--color-fg-dim)]">Período</span>
          <span className="font-mono text-white">{exclusion.period_type}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-fg-dim)]">Iniciada</span>
          <span className="font-mono text-white">{new Date(exclusion.starts_at).toLocaleString()}</span>
        </div>
        {exclusion.ends_at && (
          <div className="flex justify-between">
            <span className="text-[var(--color-fg-dim)]">Termina</span>
            <span className="font-mono text-white">{new Date(exclusion.ends_at).toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
