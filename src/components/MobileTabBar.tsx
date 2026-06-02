"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gift,
  Globe2,
  Home,
  ShoppingBag,
  Ticket,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";

type TabKey = "lobby" | "worlds" | "events" | "ranking" | "cofres" | "store";

type TabItem = {
  badge?: number;
  href: string;
  icon: LucideIcon;
  key: TabKey;
  label: string;
};

const TABS: TabItem[] = [
  { href: "/lobby", icon: Home, key: "lobby", label: "Lobby" },
  { href: "/mundos", icon: Globe2, key: "worlds", label: "Mundos" },
  { href: "/eventos", icon: Ticket, key: "events", label: "Eventos", badge: 3 },
  { href: "/ranking", icon: Trophy, key: "ranking", label: "Ranking" },
  { href: "/cofres", icon: Gift, key: "cofres", label: "Cofres", badge: 2 },
  { href: "/store", icon: ShoppingBag, key: "store", label: "Tienda" },
];

function keyFromPath(pathname: string | null): TabKey | null {
  if (!pathname) return null;
  if (pathname === "/" || pathname.startsWith("/lobby")) return "lobby";
  if (pathname.startsWith("/mundo")) return "worlds";
  if (pathname.startsWith("/eventos")) return "events";
  if (pathname.startsWith("/ranking")) return "ranking";
  if (pathname.startsWith("/cofres")) return "cofres";
  if (pathname.startsWith("/store") || pathname.startsWith("/tienda")) return "store";
  return null;
}

export default function MobileTabBar({
  activeKey,
  className = "",
  mobileOnly = false,
}: {
  activeKey?: TabKey;
  className?: string;
  mobileOnly?: boolean;
}) {
  const pathname = usePathname();
  const active = activeKey ?? keyFromPath(pathname);

  return (
    <nav
      aria-label="Navegación principal"
      className={`bb-tabbar ${mobileOnly ? "bb-tabbarMobileOnly" : ""} ${className}`.trim()}
      style={{ "--bb-tabs": TABS.length } as CSSProperties}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const selected = active === tab.key;
        return (
          <Link
            aria-current={selected ? "page" : undefined}
            className={`bb-tab ${selected ? "is-active" : ""}`}
            href={tab.href}
            key={tab.key}
          >
            <span className="bb-tabIcon">
              <Icon size={21} strokeWidth={2.5} aria-hidden="true" />
              {tab.badge ? <i>{tab.badge}</i> : null}
            </span>
            <span className="bb-tabLabel">{tab.label}</span>
          </Link>
        );
      })}

      <style>{`
        .bb-tabbar{
          position:fixed;left:50%;bottom:0;z-index:90;transform:translateX(-50%);
          width:min(100%,640px);display:grid;grid-template-columns:repeat(var(--bb-tabs),minmax(0,1fr));
          gap:4px;padding:8px 8px calc(8px + env(safe-area-inset-bottom,0px));
          background:linear-gradient(180deg,rgba(6,3,14,0),rgba(7,3,16,.94) 24%,rgba(10,4,20,.98));
          border-top:1px solid rgba(255,255,255,.1);backdrop-filter:blur(16px) saturate(140%);
          box-shadow:0 -12px 30px rgba(0,0,0,.42);font-family:var(--font-sans,Geist,system-ui,sans-serif);
        }
        .bb-tab{
          min-width:0;min-height:54px;border-radius:15px;display:flex;flex-direction:column;
          align-items:center;justify-content:center;gap:3px;color:rgba(238,232,255,.62);
          text-decoration:none;touch-action:manipulation;position:relative;overflow:hidden;
          transition:background .18s ease,color .18s ease,box-shadow .18s ease,transform .18s ease;
        }
        .bb-tab:before{
          content:"";position:absolute;inset:0;border-radius:inherit;opacity:0;
          background:radial-gradient(circle at 50% 0%,rgba(255,217,61,.24),transparent 58%);
          transition:opacity .18s ease;pointer-events:none;
        }
        .bb-tab:hover,.bb-tab:focus-visible{color:#fff;background:rgba(255,255,255,.06);}
        .bb-tab:focus-visible{outline:3px solid rgba(0,229,255,.82);outline-offset:-2px;}
        .bb-tab:active{transform:translateY(1px);}
        .bb-tab.is-active{
          color:#fff;background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.06));
          box-shadow:inset 0 0 0 1px rgba(255,255,255,.12),0 0 18px rgba(255,61,127,.18);
        }
        .bb-tab.is-active:before{opacity:1;}
        .bb-tabIcon{position:relative;display:grid;place-items:center;width:24px;height:24px;}
        .bb-tab.is-active .bb-tabIcon{color:#ffd93d;filter:drop-shadow(0 0 9px rgba(255,217,61,.56));}
        .bb-tabIcon i{
          position:absolute;right:-10px;top:-9px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;
          display:grid;place-items:center;background:#ff3d7f;color:#fff;border:1.5px solid rgba(255,255,255,.9);
          font-size:10px;font-weight:900;font-style:normal;line-height:1;box-shadow:0 0 12px rgba(255,61,127,.55);
        }
        .bb-tabLabel{
          max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
          font-size:10px;font-weight:850;line-height:1;letter-spacing:0;
        }
        @media(max-width:360px){
          .bb-tabbar{gap:2px;padding-left:5px;padding-right:5px;}
          .bb-tab{min-height:50px;border-radius:13px;}
          .bb-tabLabel{font-size:9px;}
          .bb-tabIcon svg{width:19px;height:19px;}
        }
        @media(min-width:621px){
          .bb-tabbarMobileOnly{display:none;}
        }
        @media(prefers-reduced-motion:reduce){
          .bb-tab,.bb-tab:before{transition:none!important;}
        }
      `}</style>
    </nav>
  );
}
