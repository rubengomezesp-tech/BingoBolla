import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Profile } from "@/lib/supabase/types";
import StoreClient from "./StoreClient";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: packages }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
    supabase.from("coin_packages")
      .select("*")
      .eq("active", true)
      .order("price_usd"),
  ]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] grain">
      <header className="sticky top-0 z-30 bg-[var(--color-bg)]/85 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <Link href="/lobby" className="text-sm text-[var(--color-fg-dim)] hover:text-white flex items-center gap-1.5">
            ← <span className="hidden sm:inline">Lobby</span>
          </Link>
          <div className="font-display text-lg md:text-xl">Tienda</div>
          <div className="flex items-center gap-2">
            <div className="glass rounded-full px-3 py-1.5 font-mono text-xs whitespace-nowrap">🪙 {profile?.gold_coins?.toLocaleString() ?? 0}</div>
            <div className="rounded-full px-3 py-1.5 bg-[var(--color-magenta)]/15 border border-[var(--color-magenta)]/30 font-mono text-xs whitespace-nowrap">💎 {profile?.sweeps_coins?.toFixed(2) ?? "0.00"}</div>
          </div>
        </div>
      </header>

      <StoreClient profile={profile!} packages={packages ?? []} />
    </div>
  );
}
