"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Session = {
  id: string;
  device_label: string | null;
  ip: string | null;
  user_agent: string | null;
  started_at: string;
  last_seen_at: string;
};

export default function SessionsList({ sessions }: { sessions: Session[] }) {
  const router = useRouter();
  const supabase = createClient();

  async function signOutEverywhere() {
    if (!confirm("Cerrarás sesión en TODOS los dispositivos. ¿Continuar?")) return;
    await supabase.auth.signOut({ scope: "global" });
    router.push("/login");
  }

  return (
    <div className="space-y-3 anim-slide-up">
      {sessions.length === 0 ? (
        <div className="card p-6 text-center text-[var(--color-fg-dim)]">
          Sin sesiones registradas.
        </div>
      ) : (
        sessions.map((s) => (
          <div key={s.id} className="card p-4 flex items-center gap-3">
            <div className="text-2xl">{deviceIcon(s.user_agent ?? "")}</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{deviceName(s.user_agent ?? "")}</div>
              <div className="text-xs text-[var(--color-fg-muted)] truncate font-mono">
                {s.ip ?? "—"} · iniciada {new Date(s.started_at).toLocaleString()}
              </div>
            </div>
          </div>
        ))
      )}

      <button
        onClick={signOutEverywhere}
        className="btn btn-ghost w-full mt-6"
      >
        Cerrar todas las sesiones
      </button>
    </div>
  );
}

function deviceIcon(ua: string): string {
  if (/iPhone|iPad|iOS/i.test(ua)) return "📱";
  if (/Android/i.test(ua)) return "📱";
  if (/Mac/i.test(ua)) return "💻";
  if (/Windows/i.test(ua)) return "🖥️";
  return "🌐";
}

function deviceName(ua: string): string {
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  return "Navegador";
}
