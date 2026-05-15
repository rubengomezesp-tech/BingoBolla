import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import DiamondsClient from "./DiamondsClient";

export const dynamic = "force-dynamic";

export default async function DiamondsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: packages } = await supabase
    .from("coin_packages")
    .select("*")
    .eq("currency_type", "diamonds")
    .eq("active", true)
    .order("price_usd");

  const { data: redemptions } = await supabase
    .from("diamond_redemptions")
    .select("*")
    .eq("player_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: tx } = await supabase
    .from("diamond_tx")
    .select("*")
    .eq("player_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] grain">
      <header className="sticky top-0 z-30 bg-[var(--color-bg)]/85 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <Link href="/account" className="text-sm text-[var(--color-fg-dim)] hover:text-white">← Mi cuenta</Link>
          <div className="font-display text-lg flex items-center gap-2">💎 Diamonds</div>
          <div className="w-9" />
        </div>
      </header>

      <DiamondsClient
        profile={profile}
        packages={packages ?? []}
        redemptions={redemptions ?? []}
        recentTx={tx ?? []}
      />
    </div>
  );
}
