"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, MessageCircle, Share2, Sparkles, Trophy, UsersRound } from "lucide-react";
import type { CommunityReferralStats } from "@/lib/server/community";

export default function InviteClient({
  referralStats,
  referralUrl,
  username,
}: {
  referralStats: CommunityReferralStats;
  referralUrl: string;
  username: string;
}) {
  const [copied, setCopied] = useState(false);
  const progress = Math.min(100, Math.round((referralStats.totalRegistered / referralStats.nextGoal) * 100));
  const whatsappUrl = useMemo(() => {
    const text = encodeURIComponent(`Estoy jugando BingoBolla Miami Nights. Entra conmigo: ${referralUrl}`);
    return `https://wa.me/?text=${text}`;
  }, [referralUrl]);

  async function copyLink() {
    try {
      await navigator.clipboard?.writeText(referralUrl);
    } catch {
      // Clipboard can be blocked by browser permissions; keep the UI usable.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "BingoBolla",
          text: "Juega BingoBolla conmigo",
          url: referralUrl,
        });
        return;
      } catch {
        return;
      }
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
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff7ab0]">Comunidad</div>
        <div className="mt-2 text-3xl font-black">Racha social</div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-3">
          <div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.14em] text-white/50">
            <span>Meta {referralStats.nextGoal}</span>
            <span>{referralStats.totalRegistered}/{referralStats.nextGoal}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#ff3d7f,#ffd93d,#00e5ff)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2">
          <Milestone value={String(referralStats.totalRegistered)} label="Invitados" />
          <Milestone value={String(referralStats.onboarded)} label="Onboarding" />
          <Milestone value={String(referralStats.pendingRewards)} label="Premios" />
        </div>
        <div className="mt-6 space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/48">
            <Trophy size={14} />
            Ultimos registros
          </div>
          {referralStats.recentReferrals.length > 0 ? (
            referralStats.recentReferrals.map((referral, index) => (
              <ReferralRow key={`${referral.username}-${referral.joinedAt || index}`} referral={referral} />
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-sm font-semibold text-white/54">
              {referralStats.persisted
                ? "Cuando alguien entre con tu enlace, aparecerá aquí."
                : "Las métricas se activan al aplicar la migración P4 en Supabase."}
            </div>
          )}
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

function ReferralRow({
  referral,
}: {
  referral: CommunityReferralStats["recentReferrals"][number];
}) {
  const statusLabel = referral.status === "onboarded" ? "Onboarding" : "Registrado";

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-black text-white/84">{referral.username}</div>
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/38">{statusLabel}</div>
      </div>
      <div className="rounded-full border border-[#ffd93d]/20 bg-[#ffd93d]/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#ffe27a]">
        {referral.rewardStatus === "pending" ? "Pend." : referral.rewardStatus}
      </div>
    </div>
  );
}
