"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Mode = "password" | "magic";

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  const excluded = params.get("excluded") === "1";

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(translateError(error.message));
      return;
    }
    router.push("/lobby");
    router.refresh();
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(translateError(error.message));
      return;
    }
    setMagicSent(true);
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] grain flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 mb-8 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF3D7F] to-[#B388FF] flex items-center justify-center group-hover:scale-105 transition-transform">
            <span className="font-display text-white text-lg">B</span>
          </div>
          <span className="font-display text-2xl">BingoBolla</span>
        </Link>

        <div className="card glass p-6 md:p-8 anim-slide-up">
          <h1 className="font-display text-3xl md:text-4xl mb-2">
            <span className="italic-serif">Bienvenido</span>
          </h1>
          <p className="text-[var(--color-fg-dim)] text-sm mb-6">Inicia sesión para seguir jugando</p>

          {excluded && (
            <div className="mb-6 card p-3 border-[var(--color-magenta)]/30 bg-[var(--color-magenta)]/5">
              <div className="text-sm text-[var(--color-magenta)]">
                Tu auto-exclusión está activa. No podrás iniciar sesión hasta que termine.
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-6 p-1 rounded-lg bg-[var(--color-surface-2)]">
            <button
              onClick={() => { setMode("password"); setError(null); setMagicSent(false); }}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                mode === "password"
                  ? "bg-[var(--color-surface)] text-white"
                  : "text-[var(--color-fg-dim)] hover:text-white"
              }`}
            >
              Contraseña
            </button>
            <button
              onClick={() => { setMode("magic"); setError(null); }}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                mode === "magic"
                  ? "bg-[var(--color-surface)] text-white"
                  : "text-[var(--color-fg-dim)] hover:text-white"
              }`}
            >
              Magic Link
            </button>
          </div>

          {magicSent ? (
            <div className="card p-4 border-[var(--color-emerald)]/40 bg-[var(--color-emerald)]/5 text-center">
              <div className="text-3xl mb-2">✉️</div>
              <div className="font-display text-lg mb-1">Email enviado</div>
              <div className="text-xs text-[var(--color-fg-dim)] mb-3">
                Revisa <strong className="text-white">{email}</strong> y haz click en el enlace.
              </div>
              <button onClick={() => { setMagicSent(false); setEmail(""); }} className="text-xs text-[var(--color-cyan)] hover:underline">
                ¿Otro email?
              </button>
            </div>
          ) : mode === "password" ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
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
                  className="input"
                />
              </label>

              <label className="block">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg-muted)]">Contraseña</span>
                  <Link href="/forgot-password" className="text-[10px] text-[var(--color-cyan)] hover:underline">
                    ¿Olvidaste?
                  </Link>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="input"
                />
              </label>

              {error && <div className="text-sm text-[var(--color-magenta)] py-2">{error}</div>}

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="btn btn-primary w-full disabled:opacity-50"
              >
                {loading ? "Entrando..." : "Iniciar sesión"}
              </button>

              <div className="text-center text-sm text-[var(--color-fg-dim)] pt-2">
                ¿Sin cuenta?{" "}
                <Link href="/signup" className="text-[var(--color-cyan)] hover:underline font-medium">
                  Regístrate
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
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
                  className="input"
                />
              </label>

              <p className="text-xs text-[var(--color-fg-muted)]">
                Te enviaremos un enlace para iniciar sesión sin contraseña.
              </p>

              {error && <div className="text-sm text-[var(--color-magenta)]">{error}</div>}

              <button
                type="submit"
                disabled={loading || !email}
                className="btn btn-primary w-full disabled:opacity-50"
              >
                {loading ? "Enviando..." : "Enviar enlace"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-[var(--color-fg-muted)] mt-6 leading-relaxed">
          Al iniciar sesión aceptas nuestros{" "}
          <Link href="/terms" className="underline hover:text-white">Términos</Link>
          {" "}y{" "}
          <Link href="/privacy" className="underline hover:text-white">Privacidad</Link>.
        </p>
      </div>
    </div>
  );
}

function translateError(msg: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "Email o contraseña incorrectos",
    "Email not confirmed": "Confirma tu email primero",
    "User already registered": "Este email ya está registrado",
    "Email rate limit exceeded": "Demasiados intentos, espera unos minutos",
    "Signups not allowed": "Registro no disponible",
    "Password should be at least 6 characters": "Mínimo 6 caracteres",
  };
  return map[msg] ?? msg;
}
