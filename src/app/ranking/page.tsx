import Link from "next/link";
import { redirect } from "next/navigation";
import { Crown, Medal, Star, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import WorldEventPage, { formatCompact, type WorldEventProfile } from "@/components/world-events/WorldEventPage";

export const dynamic = "force-dynamic";

type PlayerStat = {
  player_id: string;
  games_played: number | null;
  total_wins: number | null;
  lines_won: number | null;
  two_lines_won: number | null;
  full_houses_won: number | null;
  total_gold_won: number | null;
  total_sweeps_won: number | null;
  current_streak: number | null;
  best_streak: number | null;
  last_played: string | null;
};

export default async function RankingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: stats }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username,display_name,gold_coins,sweeps_coins,diamonds")
      .eq("id", user.id)
      .single<WorldEventProfile>(),
    supabase
      .from("player_stats")
      .select(
        "player_id,games_played,total_wins,lines_won,two_lines_won,full_houses_won,total_gold_won,total_sweeps_won,current_streak,best_streak,last_played",
      )
      .order("total_wins", { ascending: false })
      .order("full_houses_won", { ascending: false })
      .order("games_played", { ascending: false })
      .limit(25),
  ]);

  const rows = ((stats ?? []) as PlayerStat[]).map((row, index) => ({
    ...row,
    rank: index + 1,
    isMe: row.player_id === user.id,
  }));
  const me = rows.find((row) => row.isMe);

  return (
    <WorldEventPage
      profile={profile}
      eyebrow="Competición"
      title="Ranking"
      subtitle="Victorias, líneas, bingos completos y rachas reales leídas desde player_stats."
      accent="#ffd93d"
      heroArt={<RankingHero top={rows[0]} />}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-[28px] border border-white/10 bg-black/52 p-4 shadow-[0_0_34px_rgba(255,217,61,.1)] backdrop-blur-md md:p-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ffd93d]">Top jugadores</div>
              <h2 className="mt-1 text-3xl font-black">Tabla global</h2>
            </div>
            <Link href="/lobby#salas" className="rounded-full border border-white/12 bg-white/[0.07] px-4 py-2 text-sm font-black text-white/80 hover:text-white">
              Jugar
            </Link>
          </div>

          <div className="space-y-3">
            {rows.length > 0 ? (
              rows.map((row) => <RankingRow key={row.player_id} row={row} />)
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 text-sm font-semibold text-white/62">
                Todavía no hay stats públicas suficientes. En cuanto se jueguen partidas aparecerán aquí.
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-[#ffd93d]/34 bg-black/52 p-6 backdrop-blur-md">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#ffd93d]/12 text-[#ffd93d]">
              <Star size={32} />
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ffd93d]">Tu posición</div>
            <div className="mt-2 text-4xl font-black">{me ? `#${me.rank}` : "Sin rango"}</div>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/60">
              {me
                ? `${Number(me.total_wins ?? 0)} victorias y mejor racha de ${Number(me.best_streak ?? 0)}.`
                : "Juega una partida para entrar en la tabla."}
            </p>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-black/52 p-6 backdrop-blur-md">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#ff3d7f]/12 text-[#ff7ab0]">
              <Medal size={32} />
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/48">Objetivo semanal</div>
            <div className="mt-2 text-2xl font-black">Top 10</div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#ff3d7f,#ffd93d)]" style={{ width: me ? `${Math.max(8, 100 - me.rank * 8)}%` : "8%" }} />
            </div>
            <Link href="/mundos" className="mt-6 flex h-12 items-center justify-center rounded-2xl bg-white px-4 font-black text-[#16051d]">
              Subir de rango
            </Link>
          </section>
        </aside>
      </div>
    </WorldEventPage>
  );
}

function RankingRow({ row }: { row: PlayerStat & { rank: number; isMe: boolean } }) {
  const gold = Number(row.total_gold_won ?? 0);
  const wins = Number(row.total_wins ?? 0);
  const name = row.isMe ? "Tú" : `Jugador ${row.player_id.slice(0, 4).toUpperCase()}`;
  const medal = row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : `#${row.rank}`;

  return (
    <div
      className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-[86px_minmax(0,1fr)_repeat(3,110px)] md:items-center ${
        row.isMe ? "border-[#ffd93d]/55 bg-[#ffd93d]/10" : "border-white/10 bg-white/[0.05]"
      }`}
    >
      <div className="text-2xl font-black">{medal}</div>
      <div>
        <div className="text-lg font-black">{name}</div>
        <div className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-white/42">
          {Number(row.games_played ?? 0)} partidas · racha {Number(row.current_streak ?? 0)}
        </div>
      </div>
      <Metric label="Victorias" value={formatCompact(wins)} />
      <Metric label="Bingos" value={formatCompact(row.full_houses_won)} />
      <Metric label="Gold ganado" value={formatCompact(gold)} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/28 px-3 py-2">
      <div className="text-base font-black text-white">{value}</div>
      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/42">{label}</div>
    </div>
  );
}

function RankingHero({ top }: { top?: PlayerStat }) {
  return (
    <div className="relative grid h-64 w-64 place-items-center md:h-80 md:w-80" aria-hidden="true">
      <div className="absolute inset-8 rounded-full border border-[#ffd93d]/30 bg-black/45 shadow-[0_0_70px_rgba(255,217,61,.22)]" />
      <div className="relative z-10 grid h-44 w-44 place-items-center rounded-full border-4 border-[#fff2aa] bg-[radial-gradient(circle_at_30%_22%,#fff4b8,#f2a914_44%,#571c62)] shadow-[0_0_38px_rgba(255,217,61,.45)]">
        <Crown className="absolute -top-9 h-16 w-16 rotate-[-10deg] text-[#ffd93d] drop-shadow-[0_0_16px_rgba(255,217,61,.9)]" />
        <Trophy className="h-24 w-24 text-[#1f0b22]" />
      </div>
      <div className="absolute bottom-9 rounded-full border border-white/14 bg-black/62 px-5 py-2 text-sm font-black text-white">
        Top: {top ? `Jugador ${top.player_id.slice(0, 4).toUpperCase()}` : "Disponible"}
      </div>
    </div>
  );
}
