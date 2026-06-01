import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleDollarSign, Play, RotateCw, Sparkles, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/server/supabase-admin";
import WorldEventPage, { formatCompact, type WorldEventProfile } from "@/components/world-events/WorldEventPage";
import RuletaSpinClient from "./RuletaSpinClient";

export const dynamic = "force-dynamic";

type SlotMachine = {
  id?: string;
  slug?: string;
  name?: string;
  emoji?: string | null;
  currency?: "gold" | "sweeps" | "diamonds" | string | null;
  min_bet_gold?: number | null;
  max_bet_gold?: number | null;
  min_bet_sweeps?: number | null;
  max_bet_sweeps?: number | null;
  rtp?: number | null;
  active?: boolean | null;
};

type JackpotRoom = {
  room_name?: string;
  jackpot_gold?: number;
  jackpot_sweeps?: number;
};

export default async function RuletaPage() {
  const supabase = await createClient();
  const serviceSupabase = createSupabaseServiceClient();
  if (!serviceSupabase) throw new Error("Supabase service role is not configured");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: machines }, { data: jackpots }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username,display_name,gold_coins,sweeps_coins,diamonds")
      .eq("id", user.id)
      .single<WorldEventProfile>(),
    supabase.from("slot_machines").select("*").eq("active", true).order("display_order"),
    serviceSupabase.rpc("service_room_jackpots", { p_actor_id: user.id }),
  ]);

  const jackpotGold = Array.isArray(jackpots)
    ? (jackpots as JackpotRoom[]).reduce((sum, room) => sum + Number(room.jackpot_gold ?? 0), 0)
    : 0;

  return (
    <WorldEventPage
      profile={profile}
      eyebrow="Evento activo"
      title="Gira y gana"
      subtitle="Una entrada directa al motor real de slots: máquinas activas, balances reales y jackpots vivos de BingoBolla."
      accent="#ff3d7f"
      heroArt={<WheelArt jackpotGold={jackpotGold} />}
    >
      <RuletaSpinClient />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/46">Máquinas conectadas</div>
              <h2 className="mt-1 text-3xl font-black">Elige tu tirada</h2>
            </div>
            <Link
              href="/slots"
              className="hidden rounded-full border border-white/14 bg-white/[0.07] px-4 py-2 text-sm font-black text-white/80 transition hover:text-white sm:inline-flex"
            >
              Ver todas
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {(machines ?? []).slice(0, 6).map((machine: SlotMachine, index: number) => {
              const slug = machine.slug ?? machine.id ?? "";
              const currency = machine.currency ?? "gold";
              const minBet = currency === "sweeps" ? machine.min_bet_sweeps : machine.min_bet_gold;
              const maxBet = currency === "sweeps" ? machine.max_bet_sweeps : machine.max_bet_gold;
              return (
                <Link
                  key={slug || index}
                  href={slug ? `/slots/${slug}` : "/slots"}
                  className="group rounded-[24px] border border-white/10 bg-black/48 p-5 shadow-[0_14px_40px_rgba(0,0,0,.32)] backdrop-blur-md transition hover:-translate-y-1 hover:border-[#ff3d7f]/55"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#ff3d7f]/12 text-4xl shadow-[inset_0_1px_0_rgba(255,255,255,.14)]">
                      {machine.emoji ?? "🎰"}
                    </div>
                    <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-[#ffd93d]">
                      RTP {formatRtp(machine.rtp)}
                    </div>
                  </div>
                  <div className="text-xl font-black">{machine.name ?? "Slot"}</div>
                  <div className="mt-2 text-sm font-semibold text-white/55">
                    {currencyLabel(currency)} · {formatBetRange(minBet, maxBet)}
                  </div>
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#ff3d7f] px-4 py-2 text-sm font-black text-white shadow-[0_0_18px_rgba(255,61,127,.36)]">
                    <Play size={16} fill="currentColor" />
                    Jugar
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <aside className="rounded-[26px] border border-[#ffd93d]/32 bg-black/52 p-5 backdrop-blur-md">
          <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#ffd93d]/12 text-[#ffd93d]">
            <Trophy size={32} />
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ffd93d]">Pozo total</div>
          <div className="mt-2 text-4xl font-black">{formatCompact(jackpotGold || 23_450_000)}</div>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/62">
            La vitrina de ruleta ya queda lista para sumar tiradas gratis, multiplicadores y premios diarios cuando conectemos la RPC dedicada.
          </p>
          <Link
            href="/mundomiami"
            className="mt-6 flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.08] px-4 font-black text-white transition hover:bg-white/[0.12]"
          >
            <RotateCw size={18} />
            Volver al mapa
          </Link>
        </aside>
      </div>
    </WorldEventPage>
  );
}

function WheelArt({ jackpotGold }: { jackpotGold: number }) {
  return (
    <div className="relative grid h-72 w-72 place-items-center md:h-[21.5rem] md:w-[21.5rem]" aria-hidden="true">
      <div className="absolute inset-3 rounded-full border border-white/20 bg-[conic-gradient(from_12deg,#ff3d7f,#ffd93d,#00e5ff,#b388ff,#00e676,#ff3d7f)] p-4 shadow-[0_0_65px_rgba(255,61,127,.34)]">
        <div className="h-full w-full rounded-full border-8 border-[#24051f] bg-[conic-gradient(from_18deg,#ff3d7f_0_15%,#571546_15%_31%,#ffd93d_31%_47%,#1b5672_47%_64%,#00e5ff_64%_80%,#3c186c_80%_100%)]" />
      </div>
      <div className="relative z-10 grid h-28 w-28 place-items-center rounded-full border-4 border-white/75 bg-[#15051e] text-center shadow-[0_0_28px_rgba(255,255,255,.28)]">
        <CircleDollarSign className="h-10 w-10 text-[#ffd93d]" />
        <span className="text-xs font-black text-white/68">{formatCompact(jackpotGold || 23_450_000)}</span>
      </div>
      <Sparkles className="absolute right-7 top-9 h-8 w-8 text-[#00e5ff] drop-shadow-[0_0_14px_rgba(0,229,255,.95)]" />
    </div>
  );
}

function formatRtp(value: number | null | undefined) {
  const rtp = Number(value ?? 0.92);
  return `${(rtp <= 1 ? rtp * 100 : rtp).toFixed(0)}%`;
}

function currencyLabel(value: string | null | undefined) {
  if (value === "sweeps") return "Sweeps";
  if (value === "diamonds") return "Diamonds";
  return "Gold";
}

function formatBetRange(minBet: number | null | undefined, maxBet: number | null | undefined) {
  const min = Number(minBet ?? 1);
  const max = Number(maxBet ?? 50);
  return `${formatCompact(min)}-${formatCompact(max)}`;
}
