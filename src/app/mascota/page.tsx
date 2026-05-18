import Link from "next/link";
import { redirect } from "next/navigation";
import { Palette, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import WorldEventPage, { type WorldEventProfile } from "@/components/world-events/WorldEventPage";
import MascotaClient from "./MascotaClient";

export const dynamic = "force-dynamic";

const MASCOT_URL = "https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/mascot-miami/mascot-miami.PNG";

export default async function MascotaPage() {
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
      eyebrow="Identidad visual"
      title="Mascota"
      subtitle="Personaliza gafas, gorra, ropa y aura. Se guarda al instante y queda preparada para sincronizarse con Supabase."
      accent="#b56bff"
      heroArt={<MascotHero />}
    >
      <div className="mb-5 flex justify-end">
        <Link href="/assets" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/12 bg-white/[0.07] px-4 text-sm font-black text-white/80 hover:text-white">
          <Palette size={17} />
          Prompts de assets
        </Link>
      </div>
      <MascotaClient />
    </WorldEventPage>
  );
}

function MascotHero() {
  return (
    <div className="relative grid h-64 w-64 place-items-center md:h-80 md:w-80" aria-hidden="true">
      <div className="absolute inset-8 rounded-full border border-[#b56bff]/35 bg-black/44 shadow-[0_0_74px_rgba(181,107,255,.28)]" />
      <img src={MASCOT_URL} alt="" className="relative z-10 h-56 w-56 object-contain drop-shadow-[0_0_26px_rgba(255,61,255,.7)] md:h-72 md:w-72" />
      <Sparkles className="absolute right-8 top-14 h-10 w-10 text-[#ffd93d] drop-shadow-[0_0_18px_rgba(255,217,61,.9)]" />
      <Palette className="absolute bottom-14 left-8 h-10 w-10 text-[#00e5ff] drop-shadow-[0_0_18px_rgba(0,229,255,.9)]" />
    </div>
  );
}
