"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DailyBonus() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [claimed, setClaimed] = useState<{ gold: number; sweeps: number } | null>(null);

  async function claim() {
    setLoading(true);
    const { data, error } = await supabase.rpc("claim_daily_bonus");
    setLoading(false);
    if (error) return;
    setClaimed(data as any);
    setTimeout(() => router.refresh(), 1500);
  }

  if (claimed) {
    return (
      <div className="card glass px-5 py-3 anim-scale-in">
        <div className="font-mono text-xs text-[var(--color-emerald)] uppercase tracking-wider mb-1">
          ✓ Reclamado
        </div>
        <div className="font-display text-lg">
          +{claimed.gold} 🪙 +${claimed.sweeps.toFixed(2)} 💎
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={claim}
      disabled={loading}
      className="btn btn-gold text-sm group disabled:opacity-50"
    >
      🎁 Bonus diario · 500 🪙 + $0.50 💎
    </button>
  );
}
