"use client";

import Link from "next/link";

// ============ CARD DE SLOTS PARA EL LOBBY ============
// Colócala en src/app/lobby/page.tsx después de la sección de salas de bingo
export function SlotsAccessCard() {
  return (
    <Link
      href="/slots"
      className="block relative overflow-hidden rounded-2xl border border-[var(--color-magenta)]/30 group mt-8"
      style={{
        background: "linear-gradient(135deg, rgba(255,61,127,0.12), rgba(0,229,255,0.08))",
      }}
    >
      {/* Glow blobs */}
      <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-[#FF3D7F] opacity-20 blur-3xl group-hover:opacity-30 transition-opacity" />
      <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-[#00E5FF] opacity-15 blur-3xl group-hover:opacity-25 transition-opacity" />

      <div className="relative p-6 md:p-8 flex items-center justify-between gap-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--color-magenta)]">
              ● NUEVO
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--color-magenta)]/20 text-[var(--color-magenta)]">
              3 MÁQUINAS
            </span>
          </div>
          <div className="font-display text-2xl md:text-4xl mb-1">Slots</div>
          <div className="text-sm text-[var(--color-fg-dim)]">
            Neon 777 · Aztec Gold · Diamond Royale · RTP hasta 96%
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex -space-x-3 text-4xl md:text-5xl">
            <span className="drop-shadow-lg">🎰</span>
            <span className="drop-shadow-lg">🗿</span>
            <span className="drop-shadow-lg">💎</span>
          </div>
          <div className="px-5 py-3 rounded-xl font-medium text-sm text-white"
            style={{ background: "linear-gradient(135deg, #FF3D7F, #00E5FF)" }}>
            Jugar →
          </div>
        </div>
      </div>
    </Link>
  );
}

// ============ FOOTER CON ACCESO ADMIN OCULTO ============
// El © es un Link discreto a /admin (solo el admin real puede entrar,
// el resto es redirigido por el server component de /admin)
export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] mt-16">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 text-center text-xs text-[var(--color-fg-muted)] space-y-2">
        <div>
          🎮 Juego responsable · 21+ · RNG verificable · Disponible en estados habilitados
        </div>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/account/exclude" className="hover:text-white transition-colors">Auto-exclusión</Link>
          <Link href="/account/limits" className="hover:text-white transition-colors">Límites</Link>
          <span>·</span>
          {/* Acceso admin oculto: el © enlaza a /admin */}
          <Link href="/admin" className="hover:text-[var(--color-fg-muted)] transition-colors select-none">
            © {new Date().getFullYear()} BingoBolla
          </Link>
        </div>
      </div>
    </footer>
  );
}
