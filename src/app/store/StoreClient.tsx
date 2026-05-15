"use client";

import { useState } from "react";
import Link from "next/link";
import type { Profile } from "@/lib/supabase/types";

type Package = {
  id: string;
  sku: string;
  name: string;
  price_cents: number;
  gold_coins: number;
  sweeps_coins_bonus: number;
  popular: boolean;
  best_value: boolean;
};

export default function StoreClient({ profile, packages }: { profile: Profile; packages: Package[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isExcluded = profile.state === "WA" || profile.state === "ID" || profile.state === "NV" || profile.state === "MI";

  async function buy(packageId: string) {
    setLoadingId(packageId);
    setError(null);
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "checkout_failed");
      window.location.href = j.url;
    } catch (e: any) {
      setError(e.message);
      setLoadingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-bb-cream">
      <header className="bg-bb-ink text-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/lobby" className="flex items-center gap-2 text-sm chunky">
            ← Lobby
          </Link>
          <div className="display-font chunky text-xl">Tienda</div>
          <div className="flex items-center gap-2 text-sm">
            <div className="bg-white/10 rounded-full px-3 py-1 chunky">🪙 {profile.gold_coins.toLocaleString()}</div>
            <div className="bg-bb-magenta/20 rounded-full px-3 py-1 chunky">💎 {profile.sweeps_coins.toFixed(2)}</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <div className="text-sm font-black text-bb-magenta uppercase tracking-wider mb-2">💰 Comprar Coins</div>
          <h1 className="display-font chunky text-5xl text-bb-ink mb-3">Más juego, más diversión</h1>
          <p className="text-bb-ink/60 font-bold max-w-2xl mx-auto">
            Compra <strong className="text-bb-yellow">🪙 Gold Coins</strong> para jugar. Recibe gratis{" "}
            <strong className="text-bb-magenta">💎 Sweeps Coins</strong> como regalo — canjeables por dinero real.
          </p>
          {isExcluded && (
            <div className="mt-4 inline-block bg-bb-yellow/30 border-2 border-bb-yellow rounded-2xl px-5 py-3 font-bold text-bb-ink text-sm">
              ⚠️ Tu estado ({profile.state}) no permite Sweeps Coins. Recibirás solo Gold Coins.
            </div>
          )}
        </div>

        {error && (
          <div className="bg-bb-magenta/10 border-2 border-bb-magenta rounded-2xl p-4 mb-6 text-bb-magenta font-bold">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {packages.map((pkg) => {
            const goldFmt = pkg.gold_coins.toLocaleString();
            const sweeps = isExcluded ? 0 : pkg.sweeps_coins_bonus;
            const isLoading = loadingId === pkg.id;
            return (
              <div
                key={pkg.id}
                className={`relative bg-white rounded-3xl p-6 border-4 chunky-shadow ${
                  pkg.popular ? "border-bb-magenta" : pkg.best_value ? "border-bb-yellow" : "border-bb-ink/10"
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-bb-magenta text-white text-xs chunky px-4 py-1 rounded-full">
                    🔥 MÁS POPULAR
                  </div>
                )}
                {pkg.best_value && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-bb-yellow text-bb-ink text-xs chunky px-4 py-1 rounded-full">
                    ⭐ MEJOR VALOR
                  </div>
                )}

                <div className="text-center">
                  <div className="display-font chunky text-2xl text-bb-ink mb-1">{pkg.name}</div>
                  <div className="display-font chunky text-5xl text-bb-magenta mb-4">
                    ${(pkg.price_cents / 100).toFixed(2)}
                  </div>

                  <div className="bg-bb-cream rounded-2xl p-4 mb-4 space-y-2">
                    <div className="flex items-center justify-center gap-2 chunky text-bb-ink text-xl">
                      <span>🪙</span>
                      <span>{goldFmt}</span>
                      <span className="text-sm font-bold text-bb-ink/50">Gold</span>
                    </div>
                    {sweeps > 0 ? (
                      <div className="flex items-center justify-center gap-2 chunky text-bb-magenta">
                        <span>💎</span>
                        <span>+{sweeps.toFixed(2)}</span>
                        <span className="text-sm font-bold opacity-70">Sweeps gratis</span>
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-bb-ink/40">Sweeps no disponibles en {profile.state}</div>
                    )}
                  </div>

                  <button
                    onClick={() => buy(pkg.id)}
                    disabled={isLoading}
                    className="w-full py-3 rounded-2xl bg-bb-magenta text-white chunky chunky-shadow disabled:opacity-50"
                  >
                    {isLoading ? "Procesando..." : "Comprar →"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center text-xs font-bold text-bb-ink/40 max-w-2xl mx-auto leading-relaxed">
          NO PURCHASE NECESSARY. Sweeps Coins are awarded as a free gift with the purchase of Gold Coins.
          You can also request free Sweeps Coins by mail (AMOE). See Official Rules for details.
        </div>
      </main>
    </div>
  );
}
