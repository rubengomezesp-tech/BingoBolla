import { redirect } from "next/navigation";
import { Gift, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import WorldEventPage from "@/components/world-events/WorldEventPage";
import type { WorldEventProfile } from "@/components/world-events/WorldEventPage";
import RegaloClient from "./RegaloClient";

export const dynamic = "force-dynamic";

export default async function RegaloPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username,display_name,gold_coins,sweeps_coins,diamonds")
    .eq("id", user.id)
    .single<WorldEventProfile>();

  return (
    <WorldEventPage
      profile={profile}
      eyebrow="Bono diario"
      title="Regalo diario"
      subtitle="Reclama tu premio de entrada y prueba códigos promocionales desde una pantalla preparada para eventos diarios."
      accent="#ffd93d"
      heroArt={<GiftArt />}
    >
      <RegaloClient />
    </WorldEventPage>
  );
}

function GiftArt() {
  return (
    <div className="relative grid h-64 w-64 place-items-center md:h-80 md:w-80" aria-hidden="true">
      <div className="absolute inset-10 rounded-full border border-[#ffd93d]/35 bg-black/35 shadow-[0_0_70px_rgba(255,217,61,.22)]" />
      <Gift className="relative z-10 h-36 w-36 text-[#ffd93d] drop-shadow-[0_0_24px_rgba(255,217,61,.82)] md:h-44 md:w-44" strokeWidth={1.7} />
      <Sparkles className="absolute right-12 top-14 h-9 w-9 text-[#ff6bd6] drop-shadow-[0_0_14px_rgba(255,107,214,.95)]" />
      <Sparkles className="absolute bottom-16 left-12 h-7 w-7 text-[#00e5ff] drop-shadow-[0_0_14px_rgba(0,229,255,.95)]" />
    </div>
  );
}
