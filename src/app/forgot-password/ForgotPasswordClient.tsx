"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuroraBackground, FloatingBubbles } from "@/components/FloatingBubbles";

export const dynamic = "force-dynamic";

export default function ForgotPasswordClient() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <>
      <AuroraBackground />
      <FloatingBubbles count={10} />

      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-2 mb-8 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF3D7F] to-[#B388FF] flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="font-display text-white text-lg">B</span>
            </div>
            <span className="font-display text-2xl">BingoBolla</span>
          </Link>

          <div className="card glass-premium p-6 md:p-8 anim-slide-up">
            <h1 className="font-display text-3xl md:text-4xl mb-2">
              <span className="italic-serif">Recupera</span> tu cuenta
            </h1>
            <p className="text-[var(--color-fg-dim)] text-sm mb-6">
              Te enviaremos un enlace para restablecer tu contraseña.
            </p>

            {sent ? (
              <div className="card p-5 border-[var(--color-emerald)]/40 bg-[var(--color-emerald)]/5 text-center">
                <div className="text-4xl mb-3">✉️</div>
                <div className="font-display text-xl mb-2">Email enviado</div>
                <div className="text-sm text-[var(--color-fg-dim)]">
                  Revisa <strong className="text-white">{email}</strong>. El enlace expira en 1 hora.
                </div>
                <Link href="/login" className="inline-block mt-4 text-sm text-[var(--color-cyan)] hover:underline">
                  ← Volver al login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-1.5">
                    Email
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="tu@email.com"
                    autoComplete="email"
                    className="input input-glow"
                  />
                </label>

                {error && <div className="text-sm text-[var(--color-magenta)]">{error}</div>}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="btn btn-primary btn-magnetic w-full disabled:opacity-50"
                >
                  {loading ? "Enviando..." : "Enviar enlace de recuperación"}
                </button>

                <div className="text-center text-sm text-[var(--color-fg-dim)] pt-2">
                  <Link href="/login" className="text-[var(--color-cyan)] hover:underline">
                    ← Volver al login
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
