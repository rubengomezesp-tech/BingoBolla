import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Crown, Gem, LockKeyhole, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import WorldEventPage, { formatCompact, type WorldEventProfile } from "@/components/world-events/WorldEventPage";

export const dynamic = "force-dynamic";

type CoinPackage = {
  id: string;
  sku?: string;
  name?: string;
  currency_type?: string | null;
  gold_coins?: number | null;
  sweeps_coins?: number | null;
  diamonds_amount?: number | null;
  price_usd?: number | null;
  price_cents?: number | null;
  bonus_pct?: number | null;
};

export default async function VipPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: packages }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username,display_name,gold_coins,sweeps_coins,diamonds")
      .eq("id", user.id)
      .single<WorldEventProfile>(),
    supabase.from("coin_packages").select("*").eq("active", true).order("price_usd"),
  ]);

  const diamondPackages = ((packages ?? []) as CoinPackage[])
    .filter((pkg) => pkg.currency_type === "diamonds")
    .slice(0, 4);

  return (
    <WorldEventPage
      profile={profile}
      eyebrow="Zona premium"
      title="Cofre VIP"
      subtitle="Diamonds, acceso premium y una ruta clara hacia la tienda real sin salir del mundo Miami Nights."
      accent="#00e5ff"
      heroArt={<VipChestArt diamonds={Number(profile?.diamonds ?? 0)} />}
    >
      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-[26px] border border-[#00e5ff]/34 bg-black/52 p-5 backdrop-blur-md md:p-6">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[#00e5ff]/12 text-[#00e5ff]">
            <Gem size={36} />
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#00e5ff]">Tu balance VIP</div>
          <div className="mt-2 text-5xl font-black">{formatCompact(profile?.diamonds)}</div>
          <div className="mt-2 text-sm font-semibold text-white/56">Diamonds disponibles</div>

          <div className="mt-6 grid gap-3">
            <Link
              href="/account/diamonds"
              className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#00e5ff] px-4 font-black text-[#03131a] shadow-[0_0_22px_rgba(0,229,255,.42)] transition hover:brightness-110"
            >
              <Gem size={18} />
              Gestionar Diamonds
            </Link>
            <Link
              href="/store"
              className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.08] px-4 font-black text-white transition hover:bg-white/[0.12]"
            >
              <ShoppingBag size={18} />
              Abrir tienda
            </Link>
          </div>
        </aside>

        <section className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <VipPerk icon={<Crown />} title="Salas premium" text="Entrada preparada para rooms y slots Diamond." />
            <VipPerk icon={<Sparkles />} title="Multiplicadores" text="Lugar listo para boosts y eventos x2." />
            <VipPerk icon={<ShieldCheck />} title="Cuenta segura" text="Canjes protegidos por KYC y límites." />
          </div>

          <div>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/46">Packs activos</div>
                <h2 className="mt-1 text-3xl font-black">Recargar VIP</h2>
              </div>
              <Link href="/store" className="text-sm font-black text-[#00e5ff] hover:text-white">
                Ver tienda
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {diamondPackages.length > 0 ? (
                diamondPackages.map((pkg, index) => <DiamondPackage key={pkg.id} pkg={pkg} highlighted={index === 2} />)
              ) : (
                <div className="rounded-[24px] border border-white/10 bg-black/46 p-5 text-sm font-semibold text-white/62">
                  No hay packs de Diamonds activos ahora mismo.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </WorldEventPage>
  );
}

function VipChestArt({ diamonds }: { diamonds: number }) {
  return (
    <div className="relative grid h-64 w-64 place-items-center md:h-80 md:w-80" aria-hidden="true">
      <div className="absolute inset-8 rounded-full border border-[#00e5ff]/30 bg-black/38 shadow-[0_0_70px_rgba(0,229,255,.26)]" />
      <div className="relative z-10 grid h-40 w-52 place-items-center rounded-[34px] border-4 border-[#ffe68f] bg-[linear-gradient(180deg,#7d3a16,#2b0d26)] shadow-[0_18px_45px_rgba(0,0,0,.55),0_0_32px_rgba(255,217,61,.28)]">
        <div className="absolute -top-10 h-16 w-44 rounded-t-[44px] border-4 border-[#ffe68f] bg-[linear-gradient(180deg,#a85722,#42113a)]" />
        <Gem className="relative z-10 h-20 w-20 text-[#69efff] drop-shadow-[0_0_22px_rgba(0,229,255,.9)]" />
        <div className="absolute bottom-3 rounded-full bg-black/45 px-4 py-1 text-sm font-black text-white">{formatCompact(diamonds)}</div>
      </div>
      <LockKeyhole className="absolute bottom-12 right-10 h-10 w-10 text-[#ffd93d] drop-shadow-[0_0_16px_rgba(255,217,61,.85)]" />
    </div>
  );
}

function VipPerk({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/48 p-5 backdrop-blur-md">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#00e5ff]/12 text-[#00e5ff]">{icon}</div>
      <div className="text-lg font-black">{title}</div>
      <p className="mt-2 text-sm font-semibold leading-6 text-white/56">{text}</p>
    </div>
  );
}

function DiamondPackage({ pkg, highlighted }: { pkg: CoinPackage; highlighted: boolean }) {
  const price = Number(pkg.price_usd ?? (pkg.price_cents ? pkg.price_cents / 100 : 0));
  return (
    <Link
      href="/store"
      className="relative rounded-[24px] border bg-black/48 p-5 backdrop-blur-md transition hover:-translate-y-1"
      style={{ borderColor: highlighted ? "rgba(0,229,255,.65)" : "rgba(255,255,255,.10)" }}
    >
      {highlighted && (
        <div className="absolute -right-2 -top-2 rounded-full bg-[#00e5ff] px-3 py-1 text-[10px] font-black text-[#03131a]">
          POPULAR
        </div>
      )}
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/48">{pkg.name ?? "Diamonds"}</div>
      <div className="mt-3 text-4xl font-black text-[#00e5ff]">{formatCompact(pkg.diamonds_amount)}</div>
      <div className="mt-1 text-sm font-semibold text-white/55">Diamonds</div>
      {Number(pkg.bonus_pct ?? 0) > 0 && (
        <div className="mt-4 rounded-full bg-[#ffd93d]/12 px-3 py-1 text-xs font-black text-[#ffd93d]">
          +{pkg.bonus_pct}% bonus
        </div>
      )}
      <div className="mt-5 flex h-11 items-center justify-center rounded-2xl bg-white text-sm font-black text-[#061016]">
        {price > 0 ? `$${price.toFixed(2)}` : "Ver pack"}
      </div>
    </Link>
  );
}
