import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ChevronLeft, Coins, Gem, Plus } from "lucide-react";

export const WORLD_EVENT_BG =
  "https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/world-assets/bg-miami-map.png";

export type WorldEventProfile = {
  username?: string | null;
  display_name?: string | null;
  gold_coins?: number | null;
  sweeps_coins?: number | null;
  diamonds?: number | null;
};

type WorldEventPageProps = {
  profile?: WorldEventProfile | null;
  eyebrow: string;
  title: string;
  subtitle: string;
  accent?: string;
  backHref?: string;
  backLabel?: string;
  heroArt?: ReactNode;
  children: ReactNode;
};

export function formatCompact(value: number | null | undefined) {
  const n = Number(value ?? 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("en-US").format(n);
}

export default function WorldEventPage({
  profile,
  eyebrow,
  title,
  subtitle,
  accent = "#ff3d7f",
  backHref = "/mundo",
  backLabel = "Mundo",
  heroArt,
  children,
}: WorldEventPageProps) {
  const userInitial = (profile?.display_name || profile?.username || "B").slice(0, 1).toUpperCase();

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[#05020d] text-white grain"
      style={{
        "--event-accent": accent,
        backgroundImage: `linear-gradient(180deg, rgba(5,2,13,.78), rgba(5,2,13,.88) 46%, rgba(5,2,13,.98)), url(${WORLD_EVENT_BG})`,
        backgroundPosition: "center top",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
      } as CSSProperties}
    >
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070314]/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link
            href={backHref}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 text-sm font-semibold text-white/80 transition hover:border-white/25 hover:text-white"
          >
            <ChevronLeft size={18} />
            <span className="hidden sm:inline">{backLabel}</span>
          </Link>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-2 overflow-x-auto px-1 md:justify-end">
            <ResourcePill href="/store" icon={<Coins size={17} />} value={formatCompact(profile?.gold_coins)} />
            <ResourcePill href="/store" icon={<Gem size={17} />} value={formatCompact(profile?.diamonds)} />
            <ResourcePill href="/store" icon={<span className="text-sm">SC</span>} value={Number(profile?.sweeps_coins ?? 0).toFixed(2)} />
          </div>

          <Link
            href="/account"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-[linear-gradient(135deg,#ff3d7f,#ffd93d)] text-sm font-black text-[#140517] shadow-[0_0_18px_rgba(255,61,127,.45)]"
            aria-label="Mi cuenta"
          >
            {userInitial}
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-7 md:px-6 md:py-10">
        <section className="grid min-h-[280px] items-end gap-7 pb-8 pt-8 md:min-h-[360px] md:grid-cols-[minmax(0,1fr)_360px] md:pt-12">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.26em] text-white/65">
              {eyebrow}
            </div>
            <h1
              className="max-w-3xl text-5xl font-black leading-[0.92] md:text-7xl"
              style={{
                textShadow: `0 0 18px ${accent}88, 0 7px 24px rgba(0,0,0,.75)`,
              }}
            >
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-white/76 md:text-lg">
              {subtitle}
            </p>
          </div>
          {heroArt && <div className="justify-self-center md:justify-self-end">{heroArt}</div>}
        </section>

        {children}
      </main>
    </div>
  );
}

function ResourcePill({ href, icon, value }: { href: string; icon: ReactNode; value: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-2.5 pr-1.5 text-sm font-black shadow-[inset_0_1px_0_rgba(255,255,255,.12)]"
    >
      <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-[var(--event-accent)]">{icon}</span>
      <span className="min-w-10 text-right tabular-nums">{value}</span>
      <span className="grid h-7 w-7 place-items-center rounded-full bg-[#2fca45] text-white shadow-[0_0_12px_rgba(47,202,69,.52)]">
        <Plus size={18} strokeWidth={3.2} />
      </span>
    </Link>
  );
}
