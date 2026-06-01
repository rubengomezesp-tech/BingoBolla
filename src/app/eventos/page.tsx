import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { CalendarDays, Gift, Sparkles, Target, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/server/supabase-admin";
import WorldEventPage, { type WorldEventProfile } from "@/components/world-events/WorldEventPage";

export const dynamic = "force-dynamic";

type DailyStatus = {
  available?: boolean;
  seconds_left?: number;
};

export default async function EventosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = createSupabaseServiceClient();
  const [{ data: profile }, { data: dailyStatus }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username,display_name,gold_coins,sweeps_coins,diamonds")
      .eq("id", user.id)
      .single<WorldEventProfile>(),
    service
      ? service.rpc("service_daily_bonus_status", { p_actor_id: user.id })
      : Promise.resolve({ data: null }),
  ]);

  const daily = (dailyStatus ?? {}) as DailyStatus;

  return (
    <WorldEventPage
      profile={profile}
      eyebrow="Centro vivo"
      title="Eventos"
      subtitle="Regalos, ruleta, cofres y objetivos agrupados para que cada tarjeta clicable tenga destino propio."
      accent="#ff3d7f"
      heroArt={<EventHero />}
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <EventCard
          href="/regalo"
          icon={<Gift size={36} />}
          label="Regalo diario"
          title={daily.available ? "Listo para reclamar" : "Ya reclamado"}
          text={daily.available ? "Bonus directo conectado a Supabase." : `Vuelve en ${formatDuration(Number(daily.seconds_left ?? 0))}.`}
          accent="#ffd93d"
          action="Abrir"
        />
        <EventCard
          href="/ruleta"
          icon={<Sparkles size={36} />}
          label="Ruleta"
          title="Gira y gana"
          text="Tirada diaria con monedas, SC y Diamonds."
          accent="#ff3d7f"
          action="Girar"
        />
        <EventCard
          href="/cofres"
          icon={<Trophy size={36} />}
          label="Cofres"
          title="Premios y VIP"
          text="Cofre diario, cofre especial y zona VIP en una pestaña propia."
          accent="#00e5ff"
          action="Ver cofres"
        />
        <EventCard
          href="/mundos"
          icon={<Target size={36} />}
          label="Mundos"
          title="Progreso global"
          text="El camino central para niveles, mapas, mascotas y recompensas."
          accent="#8d6bff"
          action="Viajar"
        />
      </div>

      <section className="mt-5 rounded-[28px] border border-white/10 bg-black/52 p-6 backdrop-blur-md">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#ffd93d]/12 text-[#ffd93d]">
            <CalendarDays size={28} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/42">Calendario</div>
            <h2 className="text-2xl font-black">Siguiente bloque de trabajo</h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Milestone title="Assets pro" text="Subir mascota, cofres, ruleta y fondos desde la pestaña Assets." />
          <Milestone title="Premios guardados" text="Cosméticos y recompensas quedan preparados para vivir en la cuenta." />
          <Milestone title="Juegos wow" text="Después conectamos mejoras visuales y gestos al motor Candy style." />
        </div>
      </section>
    </WorldEventPage>
  );
}

function EventCard({
  href,
  icon,
  label,
  title,
  text,
  accent,
  action,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  title: string;
  text: string;
  accent: string;
  action: string;
}) {
  return (
    <Link
      href={href}
      className="group relative min-h-[260px] overflow-hidden rounded-[28px] border bg-black/52 p-6 backdrop-blur-md transition hover:-translate-y-1"
      style={{ borderColor: `${accent}66` }}
    >
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full blur-2xl" style={{ backgroundColor: `${accent}24` }} />
      <div className="relative z-10 grid h-16 w-16 place-items-center rounded-2xl" style={{ backgroundColor: `${accent}1f`, color: accent }}>
        {icon}
      </div>
      <div className="relative z-10 mt-5 text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: accent }}>
        {label}
      </div>
      <h2 className="relative z-10 mt-2 text-3xl font-black">{title}</h2>
      <p className="relative z-10 mt-3 text-sm font-semibold leading-6 text-white/62">{text}</p>
      <div className="relative z-10 mt-6 inline-flex h-11 items-center rounded-2xl px-5 text-sm font-black text-[#110415]" style={{ backgroundColor: accent }}>
        {action}
      </div>
    </Link>
  );
}

function Milestone({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
      <div className="text-lg font-black">{title}</div>
      <p className="mt-2 text-sm font-semibold leading-6 text-white/58">{text}</p>
    </div>
  );
}

function EventHero() {
  return (
    <div className="relative grid h-64 w-64 place-items-center md:h-80 md:w-80" aria-hidden="true">
      <div className="absolute inset-8 rounded-full border border-[#ff3d7f]/36 bg-black/45 shadow-[0_0_70px_rgba(255,61,127,.28)]" />
      <div className="relative z-10 grid h-44 w-44 place-items-center rounded-[36px] border-4 border-[#ffb1d0] bg-[linear-gradient(145deg,#ff3d7f,#7b2ff7_58%,#19051f)] shadow-[0_0_38px_rgba(255,61,127,.48)]">
        <Sparkles className="h-24 w-24 text-white drop-shadow-[0_0_18px_rgba(255,255,255,.8)]" />
      </div>
      <Gift className="absolute left-8 bottom-14 h-12 w-12 rotate-[-12deg] text-[#ffd93d] drop-shadow-[0_0_18px_rgba(255,217,61,.9)]" />
      <Trophy className="absolute right-8 top-14 h-12 w-12 rotate-[12deg] text-[#00e5ff] drop-shadow-[0_0_18px_rgba(0,229,255,.9)]" />
    </div>
  );
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${Math.max(1, m)}m`;
}
