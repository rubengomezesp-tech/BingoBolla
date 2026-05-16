"use client";

import { useState } from "react";
import Link from "next/link";
import type { Profile } from "@/lib/supabase/types";

type CoinPackage = {
  id: string;
  sku: string;
  name: string;
  currency_type: "gold" | "sweeps" | "diamonds";
  gold_coins: number;
  sweeps_coins: number;
  diamonds_amount: number;
  price_usd: number;
  bonus_pct: number;
};

export default function StoreClient({
  profile,
  packages,
}: {
  profile: Profile;
  packages: CoinPackage[];
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy(packageId: string) {
    setLoading(packageId);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_id: packageId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Error iniciando pago");
        setLoading(null);
      }
    } catch (e: any) {
      setError(e.message);
      setLoading(null);
    }
  }

  const goldPackages = packages.filter((p) => p.currency_type === "gold");
  const sweepsPackages = packages.filter((p) => p.currency_type === "sweeps");
  const diamondPackages = packages.filter((p) => p.currency_type === "diamonds");

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10">
      {/* Balance hero */}
      <div className="card glass-premium p-6 md:p-8 mb-8 text-center anim-slide-up">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--color-fg-muted)] mb-3">Tu balance actual</div>
        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
          <div>
            <div className="text-3xl mb-1">🪙</div>
            <div className="font-display text-2xl md:text-3xl text-[var(--color-gold)]">{profile.gold_coins.toLocaleString()}</div>
            <div className="text-[10px] font-mono uppercase text-[var(--color-fg-muted)] mt-1">Gold Coins</div>
          </div>
          <div>
            <div className="text-3xl mb-1">💎</div>
            <div className="font-display text-2xl md:text-3xl text-[var(--color-magenta)]">${profile.sweeps_coins.toFixed(2)}</div>
            <div className="text-[10px] font-mono uppercase text-[var(--color-fg-muted)] mt-1">Sweeps Coins</div>
          </div>
          <div>
            <div className="text-3xl mb-1">✨</div>
            <div className="font-display text-2xl md:text-3xl text-[var(--color-cyan)]">{Number((profile as any).diamonds ?? 0).toFixed(0)}</div>
            <div className="text-[10px] font-mono uppercase text-[var(--color-fg-muted)] mt-1">Diamonds</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="card p-4 mb-6 border-[var(--color-magenta)]/40 bg-[var(--color-magenta)]/5 text-center">
          <div className="text-sm text-[var(--color-magenta)]">{error}</div>
        </div>
      )}

      {/* GOLD COINS */}
      <Section
        title="Gold Coins"
        subtitle="Compra Gold para jugar · Recibe Sweeps de REGALO gratis"
        emoji="🪙"
        color="#FFD93D"
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {goldPackages.map((p, i) => (
            <PackageCard
              key={p.id}
              pkg={p}
              loading={loading === p.id}
              onBuy={() => handleBuy(p.id)}
              amountLabel={`${p.gold_coins.toLocaleString()} 🪙`}
              freeBonus={Number((p as any).sweeps_bonus ?? 0)}
              
              isPopular={i === 1}
              accent="#FFD93D"
            />
          ))}
        </div>
      </Section>

      {/* Sweeps directos eliminados: modelo legal no purchase necessary */}
{/* DIAMONDS */}
      <Section
        title="BingoBolla Diamonds"
        subtitle="Moneda premium · Acceso a salas VIP · Multiplicadores X2"
        emoji="✨"
        color="#00E5FF"
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {diamondPackages.map((p, i) => (
            <PackageCard
              key={p.id}
              pkg={p}
              loading={loading === p.id}
              onBuy={() => handleBuy(p.id)}
              amountLabel={`${Number(p.diamonds_amount).toFixed(0)} 💎`}
              isPopular={i === 2}
              accent="#00E5FF"
              bonus={p.bonus_pct}
            />
          ))}
        </div>
        <div className="mt-3 text-xs text-[var(--color-fg-muted)] text-center">
          1 Diamond = $0.10 al comprar · $0.08 al canjear (KYC requerido, mínimo 100 💎)
        </div>
      </Section>

      <div className="mt-12 text-center text-xs text-[var(--color-fg-muted)] leading-relaxed max-w-2xl mx-auto">
        🔒 Pagos seguros con Stripe · 🎁 Sweeps Coins son promocionales y se obtienen GRATIS (con compras de Gold o jugando) · No purchase necessary · Sweeps no se venden · 🎮 Juego responsable · 21+
        <br />
        <Link href="/account/exclude" className="underline text-[var(--color-cyan)] hover:text-white mt-2 inline-block">
          ¿Necesitas auto-excluirte? →
        </Link>
      </div>
    </main>
  );
}

function Section({ title, subtitle, emoji, color, children }: {
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10 anim-slide-up">
      <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: `${color}20`, border: `1px solid ${color}40` }}
          >
            {emoji}
          </div>
          <div>
            <div className="font-display text-xl md:text-2xl">{title}</div>
            <div className="text-xs text-[var(--color-fg-muted)]">{subtitle}</div>
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

function PackageCard({ pkg, loading, onBuy, amountLabel, isPopular, accent, bonus, freeBonus }: {
  pkg: CoinPackage;
  loading: boolean;
  onBuy: () => void;
  amountLabel: string;
  isPopular: boolean;
  accent: string;
  bonus?: number;
  freeBonus?: number;
}) {
  return (
    <div
      className="card p-5 relative card-lift transition-all"
      style={isPopular ? { borderColor: `${accent}80` } : {}}
    >
      {isPopular && (
        <div
          className="absolute -top-2 -right-2 font-mono text-[10px] px-2 py-1 rounded-md chunky shadow-lg"
          style={{ background: accent, color: "#08080C" }}
        >
          🔥 POPULAR
        </div>
      )}
      {bonus !== undefined && bonus > 0 && (
        <div className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: accent }}>
          +{bonus}% BONUS
        </div>
      )}
      <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-1">
        {pkg.name}
      </div>
      <div className="font-display text-xl md:text-2xl mb-1 shimmer-gold">
        {amountLabel}
      </div>
      {freeBonus !== undefined && freeBonus > 0 && (
        <div className="mb-3 text-xs font-medium px-2 py-1 rounded-md inline-block"
          style={{ background: "#FF3D7F20", color: "#FF3D7F", border: "1px solid #FF3D7F40" }}>
          + {freeBonus} 💎 Sweeps GRATIS de regalo
        </div>
      )}
      <button
        onClick={onBuy}
        disabled={loading}
        className="btn btn-primary btn-magnetic w-full disabled:opacity-50"
        style={{ background: accent, color: "#08080C" }}
      >
        {loading ? "..." : `$${pkg.price_usd}`}
      </button>
    </div>
  );
}
