import { redirect } from "next/navigation";
import { Copy, ImageIcon, PackageOpen, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import WorldEventPage, { type WorldEventProfile } from "@/components/world-events/WorldEventPage";

export const dynamic = "force-dynamic";

const STYLE_PREFIX =
  "BingoBolla mobile casino game asset, Miami neon night, premium Candy Crush style, glossy 3D cartoon render, vibrant magenta purple cyan gold lighting, clean readable silhouette, polished game UI, no text unless requested, no watermark";

const PROMPTS = [
  {
    title: "Mascota base",
    path: "mascot-miami/mascot-miami.PNG",
    size: "1024x1024 PNG transparente",
    prompt:
      `${STYLE_PREFIX}. Cute round bingo ball mascot, happy face, purple and gold body, tropical Miami flowers, friendly premium game character, centered full body, transparent background.`,
  },
  {
    title: "Gafas neon",
    path: "mascot-miami/accessories/glasses-neon.png",
    size: "1024x1024 PNG transparente",
    prompt:
      `${STYLE_PREFIX}. Oversized black sunglasses with neon magenta and cyan rim glow, accessory only, front view, transparent background, designed to fit a round mascot face.`,
  },
  {
    title: "Gorra tropical",
    path: "mascot-miami/accessories/hat-flower-cap.png",
    size: "1024x1024 PNG transparente",
    prompt:
      `${STYLE_PREFIX}. Purple baseball cap with golden B emblem and tropical hibiscus flower, accessory only, front three-quarter view, transparent background.`,
  },
  {
    title: "Hoodie Bolla",
    path: "mascot-miami/accessories/outfit-hoodie.png",
    size: "1024x1024 PNG transparente",
    prompt:
      `${STYLE_PREFIX}. Cropped purple hoodie outfit with gold BingoBolla B emblem, accessory only for round mascot lower body, transparent background.`,
  },
  {
    title: "Cofre diario",
    path: "world-assets/ui/chest-daily.png",
    size: "1024x1024 PNG transparente",
    prompt:
      `${STYLE_PREFIX}. Treasure chest full of gold coins and bingo balls, purple wood, golden trim, magical sparkles, front view, transparent background.`,
  },
  {
    title: "Cofre VIP",
    path: "world-assets/ui/chest-vip.png",
    size: "1024x1024 PNG transparente",
    prompt:
      `${STYLE_PREFIX}. Luxury VIP treasure chest with diamonds, gold trim, cyan glow, premium casino reward, front view, transparent background.`,
  },
  {
    title: "Ruleta",
    path: "world-assets/ui/roulette-wheel.png",
    size: "1024x1024 PNG transparente",
    prompt:
      `${STYLE_PREFIX}. Bright prize wheel with gold rim, magenta cyan purple segments, coin and diamond icons, centered front view, transparent background.`,
  },
  {
    title: "Mundos hub",
    path: "world-assets/bg-worlds-hub.png",
    size: "1792x1024 JPG/PNG",
    prompt:
      `${STYLE_PREFIX}. Wide panoramic Bingo World island hub at night, Miami beach foreground, Vegas and Tokyo islands in distance, glowing dotted path, yachts, palm trees, city skyline, no UI, no text.`,
  },
  {
    title: "Home lobby",
    path: "world-assets/bg-home-lobby.png",
    size: "1080x1920 JPG/PNG",
    prompt:
      `${STYLE_PREFIX}. Vertical mobile home lobby background, tropical Miami night, bingo balls characters, neon city, casino party energy, open center area for UI panels, no text.`,
  },
];

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

      <div className="grid gap-4 md:grid-cols-2">
        {PROMPTS.map((asset) => (
          <article key={asset.path} className="rounded-[26px] border border-white/10 bg-black/48 p-5 backdrop-blur-md">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ffd93d]">{asset.size}</div>
                <h2 className="mt-1 text-2xl font-black">{asset.title}</h2>
              </div>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#00e5ff]/12 text-[#00e5ff]">
                <Copy size={24} />
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-xs font-bold text-white/54 break-all">
              {asset.path}
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-white/72">{asset.prompt}</p>
          </article>
        ))}
      </div>
    </WorldEventPage>
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
