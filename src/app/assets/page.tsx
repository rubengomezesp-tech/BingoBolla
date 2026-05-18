import { redirect } from "next/navigation";
import { Copy, ImageIcon, PackageOpen, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import WorldEventPage, { type WorldEventProfile } from "@/components/world-events/WorldEventPage";
import { BINGOBOLLA_ART_DIRECTION, RARITY_THEME } from "@config/artDirection";
import { BINGOBOLLA_ASSET_MANIFEST } from "@config/assetManifest";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
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
      eyebrow="Producción visual"
      title="Assets"
      subtitle="Prompts y rutas exactas para subir a Supabase Storage y reemplazar los elementos básicos por arte final."
      accent="#00e5ff"
      heroArt={<AssetsHero />}
    >
      <section className="mb-5 rounded-[28px] border border-[#00e5ff]/30 bg-black/52 p-6 backdrop-blur-md">
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#00e5ff]">Bucket recomendado</div>
        <div className="mt-2 text-3xl font-black">Storage público: world-assets y mascot-miami</div>
        <p className="mt-3 text-sm font-semibold leading-6 text-white/62">
          Si mantienes esos paths, luego solo cambiamos referencias o activamos las imágenes reales sin rehacer la app.
        </p>
      </section>

      <section className="mb-5 grid gap-4 rounded-[28px] border border-white/10 bg-black/52 p-6 backdrop-blur-md lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ffd93d]">Prompt base central</div>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/72">{BINGOBOLLA_ART_DIRECTION.promptBase}</p>
        </div>
        <div className="grid gap-2">
          <MiniRule title="Reglas" text={BINGOBOLLA_ART_DIRECTION.renderRules.slice(0, 3).join(" · ")} />
          <MiniRule title="Prohibido" text={BINGOBOLLA_ART_DIRECTION.forbiddenStyles.slice(0, 5).join(" · ")} />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {BINGOBOLLA_ASSET_MANIFEST.map((asset) => {
          const rarity = RARITY_THEME[asset.rarity];
          return (
          <article key={asset.id} className="rounded-[26px] border border-white/10 bg-black/48 p-5 backdrop-blur-md">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: rarity.color }}>
                  {asset.rarity} · {asset.category} · {asset.unlockType}
                </div>
                <h2 className="mt-1 text-2xl font-black">{asset.label}</h2>
              </div>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ backgroundColor: `${rarity.color}22`, color: rarity.color }}>
                <Copy size={24} />
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-xs font-bold text-white/54 break-all">
              {asset.bucket}/{asset.storagePath}
            </div>
            {asset.layerType && (
              <div className="mt-3 grid grid-cols-5 gap-2 text-[10px] font-black uppercase tracking-[0.08em] text-white/42">
                <span>{asset.layerType}</span>
                <span>z {asset.zIndex}</span>
                <span>x {asset.equipped.x}</span>
                <span>y {asset.equipped.y}</span>
                <span>r {asset.equipped.rotation}</span>
              </div>
            )}
            <p className="mt-4 text-sm font-semibold leading-6 text-white/72">{asset.prompt}</p>
          </article>
        );
        })}
      </div>
    </WorldEventPage>
  );
}

function MiniRule({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/44">{title}</div>
      <p className="mt-2 text-sm font-semibold leading-6 text-white/66">{text}</p>
    </div>
  );
}

function AssetsHero() {
  return (
    <div className="relative grid h-64 w-64 place-items-center md:h-80 md:w-80" aria-hidden="true">
      <div className="absolute inset-8 rounded-full border border-[#00e5ff]/34 bg-black/45 shadow-[0_0_70px_rgba(0,229,255,.24)]" />
      <div className="relative z-10 grid h-44 w-44 place-items-center rounded-[36px] border-4 border-[#8df7ff] bg-[linear-gradient(145deg,#00e5ff,#7b2ff7_62%,#17041f)] shadow-[0_0_38px_rgba(0,229,255,.42)]">
        <ImageIcon className="h-24 w-24 text-white drop-shadow-[0_0_18px_rgba(255,255,255,.8)]" />
      </div>
      <PackageOpen className="absolute left-9 bottom-14 h-12 w-12 text-[#ffd93d] drop-shadow-[0_0_18px_rgba(255,217,61,.9)]" />
      <Sparkles className="absolute right-9 top-14 h-12 w-12 text-[#ff3d7f] drop-shadow-[0_0_18px_rgba(255,61,127,.9)]" />
    </div>
  );
}
