"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, MessageCircle, Share2, Sparkles, UsersRound } from "lucide-react";

export default function InviteClient({ referralUrl, username }: { referralUrl: string; username: string }) {
  const [copied, setCopied] = useState(false);
  const whatsappUrl = useMemo(() => {
    const text = encodeURIComponent(`Estoy jugando BingoBolla Miami Nights. Entra conmigo: ${referralUrl}`);
    return `https://wa.me/?text=${text}`;
  }, [referralUrl]);

  async function copyLink() {
    await navigator.clipboard?.writeText(referralUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareLink() {
    if (navigator.share) {
      await navigator.share({
        title: "BingoBolla",
        text: "Juega BingoBolla conmigo",
        url: referralUrl,
      });
      return;
    }
    await copyLink();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="rounded-[26px] border border-[#b388ff]/35 bg-black/50 p-5 backdrop-blur-md md:p-7">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#d7c5ff]">Tu enlace</div>
            <h2 className="mt-1 text-3xl font-black md:text-4xl">@{username}</h2>
          </div>
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#b388ff]/15 text-[#d7c5ff]">
            <UsersRound size={34} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-4">
          <div className="break-all font-mono text-sm font-bold leading-6 text-white/78">{referralUrl}</div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <button
            onClick={copyLink}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#b388ff] px-4 font-black text-[#14051e] shadow-[0_0_20px_rgba(179,136,255,.45)] transition hover:brightness-110"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? "Copiado" : "Copiar"}
          </button>
          <button
            onClick={shareLink}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.08] px-4 font-black text-white transition hover:bg-white/[0.12]"
          >
            <Share2 size={18} />
            Compartir
          </button>
          <Link
            href={whatsappUrl}
            target="_blank"
            className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-[#00e676]/28 bg-[#00e676]/12 px-4 font-black text-[#b7ffd4] transition hover:bg-[#00e676]/18"
          >
            <MessageCircle size={18} />
            WhatsApp
          </Link>
        </div>
      </section>

      <aside className="rounded-[26px] border border-[#ff3d7f]/32 bg-black/50 p-5 backdrop-blur-md md:p-6">
        <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#ff3d7f]/14 text-[#ff7ab0]">
          <Sparkles size={32} />
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff7ab0]">Siguiente capa</div>
        <div className="mt-2 text-3xl font-black">Racha social</div>
        <p className="mt-3 text-sm font-semibold leading-6 text-white/62">
          La pantalla queda lista para enchufar conteo de invitados, premios por amigo y chat de comunidad en la siguiente migración.
        </p>
        <div className="mt-6 grid grid-cols-3 gap-2">
          <Milestone value="1" label="Amigo" />
          <Milestone value="5" label="Racha" />
          <Milestone value="+100" label="Objetivo" />
        </div>
      </aside>
    </div>
  );
}

function Milestone({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-center">
      <div className="text-xl font-black text-[#ffd93d]">{value}</div>
      <div className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/45">{label}</div>
    </div>
  );
}
