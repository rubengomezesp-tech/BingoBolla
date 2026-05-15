"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-mesh grain flex items-center justify-center p-6 relative">
      {/* Floating balls bg */}
      <div className="absolute top-20 left-20 bb-ball bb-ball--b w-24 h-24 anim-float opacity-40 hidden md:flex">
        <span className="font-display text-3xl">7</span>
      </div>
      <div className="absolute bottom-32 right-32 bb-ball bb-ball--g w-32 h-32 anim-float opacity-40 hidden md:flex" style={{ animationDelay: "1s" }}>
        <span className="font-display text-4xl">54</span>
      </div>

      <div className="relative z-10 w-full max-w-md anim-slide-up">
        <Link href="/" className="flex items-center gap-2.5 mb-10 justify-center">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF3D7F] to-[#B388FF] flex items-center justify-center">
            <span className="font-display text-white text-xl">B</span>
          </div>
          <span className="font-display text-2xl">BingoBolla</span>
        </Link>

        <div className="card glass p-8">
          {sent ? (
            <div className="text-center py-6">
              <div className="text-5xl mb-4 anim-scale-in">📬</div>
              <h1 className="font-display text-3xl mb-3">Check your email</h1>
              <p className="text-[var(--color-fg-dim)] mb-6">
                We sent a magic link to<br />
                <span className="text-white font-medium">{email}</span>
              </p>
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                className="text-sm text-[var(--color-fg-muted)] hover:text-white"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h1 className="font-display text-4xl mb-2">Welcome.</h1>
              <p className="text-[var(--color-fg-dim)] mb-8">
                Magic link login. No password to remember.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="input"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="text-sm text-[var(--color-magenta)] bg-[var(--color-magenta)]/10 border border-[var(--color-magenta)]/30 rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full text-base py-4 disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send magic link →"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-[var(--color-fg-muted)] mt-6">
          By continuing you accept our Terms & Privacy Policy. 18+ only.
        </p>
      </div>
    </div>
  );
}
