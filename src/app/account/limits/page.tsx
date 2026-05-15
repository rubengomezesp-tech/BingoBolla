import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LimitsForm from "./LimitsForm";

export const dynamic = "force-dynamic";

export default async function LimitsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: limits } = await supabase
    .from("rg_limits")
    .select("*")
    .eq("player_id", user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-[var(--color-bg)] grain">
      <header className="sticky top-0 z-30 bg-[var(--color-bg)]/85 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <Link href="/account" className="text-sm text-[var(--color-fg-dim)] hover:text-white">← Mi cuenta</Link>
          <div className="font-display text-lg">Límites de juego</div>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-8 anim-slide-up">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--color-cyan)] mb-2">
            ⚖️ Juego responsable
          </div>
          <h1 className="font-display text-3xl md:text-4xl mb-3">Pon tus reglas</h1>
          <p className="text-[var(--color-fg-dim)] leading-relaxed">
            Estos límites se aplican a <strong className="text-white">Sweeps Coins</strong> (dinero real). Una vez fijados,
            <strong className="text-white"> no se pueden subir inmediatamente</strong> — toma 24h para que un aumento entre en vigor (mecanismo de protección).
          </p>
        </div>
        <LimitsForm initial={limits ?? null} />
      </main>
    </div>
  );
}
