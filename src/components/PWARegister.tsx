"use client";
import { useEffect, useState } from "react";
import { initAudio } from "@/lib/sound";
import { unlockAudio } from "@/lib/sounds";

/**
 * Tipo del evento `beforeinstallprompt` (no incluido en lib.dom estándar).
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

const PROMPT_DISMISSED_KEY = "bb_pwa_prompt_dismissed_at";
// Reaparecer el prompt cada 14 días si el usuario lo cerró.
const PROMPT_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
const PROMPT_DELAY_MS = 9000;

export default function PWARegister() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  // 1) Registrar service worker
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations?.()
        .then((registrations) => registrations.forEach((registration) => registration.unregister()))
        .catch(() => {});
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  // 2) Desbloquear AudioContext SOLO tras gesto del usuario
  useEffect(() => {
    const unlock = () => {
      initAudio();
      unlockAudio();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  // 3) Capturar evento de instalación PWA
  useEffect(() => {
    let promptTimer: number | null = null;

    const revealPrompt = () => {
      if (promptTimer) window.clearTimeout(promptTimer);
      promptTimer = window.setTimeout(() => setShowPrompt(true), PROMPT_DELAY_MS);
    };

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      try {
        const dismissedAt = Number(localStorage.getItem(PROMPT_DISMISSED_KEY) ?? 0);
        if (Date.now() - dismissedAt > PROMPT_COOLDOWN_MS) {
          revealPrompt();
        }
      } catch {
        revealPrompt();
      }
    };
    const onInstalled = () => {
      if (promptTimer) window.clearTimeout(promptTimer);
      setShowPrompt(false);
      setInstallEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      if (promptTimer) window.clearTimeout(promptTimer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    try { localStorage.setItem(PROMPT_DISMISSED_KEY, String(Date.now())); } catch {}
    setShowPrompt(false);
  };

  if (!showPrompt || !installEvent) return null;

  return (
    <div
      data-testid="pwa-install-banner"
      style={{
        position: "fixed",
        left: "auto",
        right: 16,
        top: 88,
        bottom: "auto",
        zIndex: 9999,
        width: "calc(100% - 32px)",
        maxWidth: 380,
        margin: 0,
        padding: "12px 12px",
        borderRadius: 8,
        border: "1px solid rgba(255,77,255,.5)",
        background: "linear-gradient(135deg,rgba(46,12,96,.96),rgba(22,7,55,.96))",
        boxShadow: "0 8px 16px rgba(0,0,0,.45)",
        color: "#fff",
        fontFamily: "'Hanken Grotesk',system-ui,sans-serif",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div style={{ flex: 1, lineHeight: 1.3 }}>
        <strong style={{ display: "block", fontSize: 15, color: "#ffd23d" }}>
          Instala BingoBolla
        </strong>
        <span style={{ fontSize: 13, opacity: 0.92 }}>
          Acceso directo, modo offline y notificaciones de premios.
        </span>
      </div>
      <button
        data-testid="pwa-install-dismiss"
        onClick={handleDismiss}
        style={{
          background: "transparent",
          border: "1px solid rgba(255,255,255,.25)",
          color: "#fff",
          borderRadius: 8,
          padding: "7px 10px",
          fontWeight: 700,
          fontSize: 12,
          cursor: "pointer",
        }}
        aria-label="Cerrar"
      >
        ✕
      </button>
      <button
        data-testid="pwa-install-button"
        onClick={handleInstall}
        style={{
          background: "linear-gradient(180deg,#b535ff,#7215d6)",
          border: "1px solid rgba(255,255,255,.35)",
          color: "#fff",
          borderRadius: 8,
          padding: "10px 16px",
          fontWeight: 900,
          fontSize: 14,
          cursor: "pointer",
          boxShadow: "0 0 14px rgba(255,77,255,.4)",
        }}
      >
        INSTALAR
      </button>
    </div>
  );
}
