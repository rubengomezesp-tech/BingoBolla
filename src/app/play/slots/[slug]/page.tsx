import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import SlotMachine from "./SlotMachine";

export const dynamic = "force-dynamic";

export default async function SlotPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: machine } = await supabase
    .from("slot_machines")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (!machine) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: recentSpins } = await supabase
    .from("slot_spins")
    .select("*")
    .eq("player_id", user.id)
    .eq("machine_id", machine.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] grain">
      <header className="sticky top-0 z-30 bg-[var(--color-bg)]/85 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-2">
          <Link href="/lobby" className="text-sm text-[var(--color-fg-dim)] hover:text-white">← Lobby</Link>
          <div className="font-display text-lg flex items-center gap-2">
            <span>{machine.emoji}</span>
            <span>{machine.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="glass rounded-full px-2.5 py-1 font-mono text-xs">🪙 {profile?.gold_coins?.toLocaleString() ?? 0}</div>
            <div className="rounded-full px-2.5 py-1 bg-[var(--color-magenta)]/15 border border-[var(--color-magenta)]/30 font-mono text-xs">
              💎 {profile?.sweeps_coins?.toFixed(2) ?? "0.00"}
            </div>
          </div>
        </div>
      </header>

      <SlotMachine
        machine={machine}
        initialProfile={profile}
        recentSpins={recentSpins ?? []}
      />
    </div>
  );
}
