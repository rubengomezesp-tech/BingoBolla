"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];
const EXCLUDED = ["WA", "ID", "NV", "MI"];

const ERROR_LABELS: Record<string, string> = {
  not_authenticated: "Session expired. Sign in again.",
  unsupported_country: "US only for now.",
  invalid_state: "Invalid state.",
  underage: "You must be 18 or older.",
  state_blocked: "Your state isn't supported (WA, ID, NV, MI).",
};

export default function OnboardingForm({
  suggestedState,
  username,
}: {
  suggestedState: string | null;
  username: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [dob, setDob] = useState("");
  const [state, setState] = useState(suggestedState ?? "FL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBlocked = EXCLUDED.includes(state);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: rpcErr } = await supabase.rpc("submit_onboarding", {
      p_date_of_birth: dob,
      p_state: state,
      p_country: "US",
    });
    if (rpcErr) {
      const key = rpcErr.message.replace(/^.*: /, "").trim();
      setError(ERROR_LABELS[key] ?? rpcErr.message);
      setLoading(false);
      return;
    }
    router.push("/lobby");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-mesh grain flex items-center justify-center p-6 relative">
      <div className="absolute top-16 right-16 bb-ball bb-ball--i w-24 h-24 anim-float opacity-30 hidden md:flex">
        <span className="font-display text-3xl">22</span>
      </div>
      <div className="absolute bottom-20 left-20 bb-ball bb-ball--o w-28 h-28 anim-float opacity-30 hidden md:flex" style={{ animationDelay: "0.7s" }}>
        <span className="font-display text-4xl">71</span>
      </div>

      <div className="relative z-10 w-full max-w-lg anim-slide-up">
        <Link href="/" className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF3D7F] to-[#B388FF] flex items-center justify-center">
            <span className="font-display text-white text-xl">B</span>
          </div>
          <span className="font-display text-2xl">BingoBolla</span>
        </Link>

        <div className="card glass p-8">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-magenta)] mb-2">
            Step 1 of 1
          </div>
          <h1 className="font-display text-4xl mb-2">
            Almost there, <span className="italic-serif">{username}</span>
          </h1>
          <p className="text-[var(--color-fg-dim)] mb-8">
            Quick legal verification (30 seconds). Required by US sweepstakes law.
          </p>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-2">
                Date of birth
              </label>
              <input
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                max={new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().split("T")[0]}
                className="input"
              />
              <div className="text-xs text-[var(--color-fg-muted)] mt-1.5">18+ only</div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-2">
                State of residence
              </label>
              <select
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="input cursor-pointer"
              >
                {US_STATES.map((s) => (
                  <option key={s} value={s} disabled={EXCLUDED.includes(s)} className="bg-[var(--color-surface)]">
                    {s} {EXCLUDED.includes(s) ? "(not available)" : ""}
                  </option>
                ))}
              </select>
              {suggestedState && (
                <div className="text-xs text-[var(--color-fg-muted)] mt-1.5">
                  Detected {suggestedState} from your IP — change if not correct.
                </div>
              )}
            </div>

            {isBlocked && (
              <div className="text-sm text-[var(--color-magenta)] bg-[var(--color-magenta)]/10 border border-[var(--color-magenta)]/30 rounded-xl px-4 py-3">
                ⚠️ Sorry — BingoBolla isn't available in {state} yet. Excluded: WA, ID, NV, MI.
              </div>
            )}

            {error && (
              <div className="text-sm text-[var(--color-magenta)] bg-[var(--color-magenta)]/10 border border-[var(--color-magenta)]/30 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isBlocked || !dob}
              className="btn btn-primary w-full text-base py-4 disabled:opacity-40"
            >
              {loading ? "Verifying..." : "Continue →"}
            </button>
          </form>

          <details className="mt-6 pt-6 border-t border-[var(--color-border)] text-xs text-[var(--color-fg-muted)]">
            <summary className="cursor-pointer hover:text-white">Why do you need this?</summary>
            <p className="mt-2 leading-relaxed">
              US sweepstakes law requires age (18+) and state verification. We don't sell your data.
              For prizes over $500 we'll later ask for photo ID via Persona (industry standard).
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
