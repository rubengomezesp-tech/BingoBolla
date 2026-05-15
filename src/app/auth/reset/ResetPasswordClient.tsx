"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuroraBackground, FloatingBubbles } from "@/components/FloatingBubbles";

export default function ResetPasswordClient() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event from URL hash params
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setReady(true);
        setChecking(false);
      } else if (event === "INITIAL_SESSION") {
        // Check if we have a session at all (token in URL may already be processed)
        if (session) {
          setReady(true);
        } else {
          setError("Enlace inválido o expirado. Pide uno nuevo.");
        }
        setChecking(false);
      }
    });

    // Fallback: check session after 1.5s in case event already fired
    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) setReady(true);
      else if (!error) setError("Enlace inválido o expirado. Pide uno nuevo.");
      setChecking(false);
    }, 1500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 8) {
      setError("Mínimo 8 caracteres");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/lobby");
    router.refresh();
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
              <span className="italic-serif">Nueva</span> contraseña
            </h1>
            <p className="text-[var(--color-fg-dim)] text-sm mb-6">
              Crea una nueva contraseña segura.
            </p>

            {checking ? (
              <div className="text-center py-8">
                <div className="loader-orbit mx-auto mb-3" />
                <div className="text-sm text-[var(--color-fg-dim)]">Validando enlace...</div>
              </div>
            ) : !ready ? (
              <div className="card p-5 border-[var(--color-magenta)]/40 bg-[var(--color-magenta)]/5 text-center">
                <div className="text-3xl mb-2">⚠️</div>
                <div className="text-sm text-[var(--color-magenta)] mb-3">
                  {error ?? "Enlace inválido o expirado"}
                </div>
                <Link href="/forgot-password" className="inline-block text-sm text-[var(--color-cyan)] hover:underline">
                  Pedir nuevo enlace →
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-1.5">
                    Nueva contraseña
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="input input-glow"
                  />
                </label>

                <label className="block">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-1.5">
                    Confirmar contraseña
                  </div>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="input input-glow"
                  />
                </label>

                {error && <div className="text-sm text-[var(--color-magenta)]">{error}</div>}

                <button
                  type="submit"
                  disabled={loading || !password || !confirm}
                  className="btn btn-primary btn-magnetic w-full disabled:opacity-50"
                >
                  {loading ? "Guardando..." : "Cambiar contraseña"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
