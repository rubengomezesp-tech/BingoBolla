import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import SessionsList from "./SessionsList";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sessions } = await supabase
    .from("sessions_log")
    .select("*")
    .eq("player_id", user.id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(20);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] grain">
      <header className="sticky top-0 z-30 bg-[var(--color-bg)]/85 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <Link href="/account" className="text-sm text-[var(--color-fg-dim)] hover:text-white">← Mi cuenta</Link>
          <div className="font-display text-lg">Sesiones</div>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-8 anim-slide-up">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--color-emerald)] mb-2">
            🔐 Seguridad
          </div>
          <h1 className="font-display text-3xl md:text-4xl mb-3">Dispositivos conectados</h1>
          <p className="text-[var(--color-fg-dim)]">
            Si ves una sesión que no reconoces, ciérrala y cambia tu email de inicio de sesión.
          </p>
        </div>

        <SessionsList sessions={sessions ?? []} />
      </main>
    </div>
  );
}
