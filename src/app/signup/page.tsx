"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [over21, setOver21] = useState(false);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 8) {
      setError("Contraseña mínimo 8 caracteres");
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      setError("Usuario: 3-20 caracteres, solo letras minúsculas, números y _");
      return;
    }
    if (!over21 || !terms) {
      setError("Debes confirmar mayoría de edad y aceptar términos");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { username },
      },
    });
    setLoading(false);

    if (error) {
      setError(translateError(error.message));
      return;
    }

    if (data.user?.identities?.length === 0) {
      setError("Este email ya está registrado. Inicia sesión.");
      return;
    }

    // If session immediately returned (email confirmation disabled in Supabase)
    if (data.session) {
      router.push("/onboarding");
      router.refresh();
      return;
    }

    setSent(true);
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
            <span className="italic-serif">Crea tu cuenta</span>
          </h1>
          <p className="text-[var(--color-fg-dim)] text-sm mb-6">Empieza a jugar en segundos</p>

          {sent ? (
            <div className="card p-5 border-[var(--color-emerald)]/40 bg-[var(--color-emerald)]/5 text-center">
              <div className="text-4xl mb-2">✉️</div>
              <div className="font-display text-xl mb-2">¡Casi listo!</div>
              <div className="text-sm text-[var(--color-fg-dim)]">
                Te enviamos un email a <strong className="text-white">{email}</strong>. Confirma tu cuenta para entrar.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-3.5">
              <label className="block">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-1.5">
                  Nombre de usuario
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  required
                  minLength={3}
                  maxLength={20}
                  placeholder="rubengomezesp"
                  autoComplete="username"
                  className="input"
                />
              </label>

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
                <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-1.5">
                  Contraseña (mín. 8)
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="input"
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
                  className="input"
                />
              </label>

              <label className="flex items-start gap-2 text-xs text-[var(--color-fg-dim)] cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={over21}
                  onChange={(e) => setOver21(e.target.checked)}
                  className="mt-0.5 flex-shrink-0"
                />
                <span>Confirmo que tengo <strong className="text-white">21 años o más</strong> y soy residente legal de USA.</span>
              </label>

              <label className="flex items-start gap-2 text-xs text-[var(--color-fg-dim)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  className="mt-0.5 flex-shrink-0"
                />
                <span>
                  Acepto los <Link href="/terms" className="underline text-white">Términos</Link>{" "}
                  y la <Link href="/privacy" className="underline text-white">Privacidad</Link>.
                </span>
              </label>

              {error && <div className="text-sm text-[var(--color-magenta)] py-1">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full disabled:opacity-50 mt-2"
              >
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </button>

              <div className="text-center text-sm text-[var(--color-fg-dim)] pt-2">
                ¿Ya tienes cuenta?{" "}
                <Link href="/login" className="text-[var(--color-cyan)] hover:underline font-medium">
                  Inicia sesión
                </Link>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-[var(--color-fg-muted)] mt-6 leading-relaxed">
          🔞 Sólo +21. Si tienes problemas con el juego: 1-800-GAMBLER
        </p>
      </div>
    </div>
  );
}

function translateError(msg: string): string {
  const map: Record<string, string> = {
    "User already registered": "Este email ya está registrado",
    "Password should be at least 6 characters": "Contraseña muy corta (mín. 8)",
    "Email rate limit exceeded": "Demasiados intentos, espera unos minutos",
    "Signups not allowed for otp": "Registro temporalmente deshabilitado",
    "Database error saving new user": "Error guardando. Intenta de nuevo.",
  };
  return map[msg] ?? msg;
}
