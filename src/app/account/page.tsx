"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/* CUENTA · src/app/account/page.tsx · clon ref img6 */
const A="https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/world-assets/";
const MASCOT=A+"mascot-miami/mascot-miami.PNG";
const fmt=(n:number)=>n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e3?n.toLocaleString():String(n);

export default function Account(){
  const sb=createClient();
  const [u,setU]=useState<any>(null);
  const [p,setP]=useState<any>(null);

  useEffect(()=>{(async()=>{
    const safe=async(x:any)=>{try{return await Promise.resolve(x)}catch{return{data:null}}};
    const ur=await safe(sb.auth.getUser());
    const usr=ur?.data?.user; setU(usr);
    if(usr){const pr=await safe(sb.from("profiles").select("*").eq("id",usr.id).single());
      if(pr?.data)setP(pr.data);}
  })()},[]);

  const name=p?.display_name||u?.user_metadata?.display_name||u?.email?.split("@")[0]||"Jugador";
  const email=u?.email||"—";
  const initial=(name[0]||"R").toUpperCase();
  const gold=p?.gold_coins??0, sweeps=p?.sweeps_coins??0;

  const STATS=[
    {i:"🎮",t:"PARTIDAS",v:p?.games_played??0,c:"#A45BFF"},
    {i:"🏆",t:"VICTORIAS",v:p?.wins??0,c:"#FFB323"},
    {i:"🅱️",t:"BINGOS",v:p?.bingos??0,c:"#FF4D9A"},
    {i:"🔥",t:"MEJOR RACHA",v:p?.best_streak??0,c:"#FF6B2B"},
  ];
  const NAV=[{i:"🏠",t:"INICIO",h:"/"},{i:"🌐",t:"MUNDOS",h:"/mundo"},
    {i:"🎫",t:"EVENTOS",h:"/eventos",b:3},{i:"🏆",t:"RANKING",h:"/ranking"},
    {i:"🎁",t:"COFRES",h:"/cofres",b:2}];

  return(
    <div className="bb">
      <div className="bg" aria-hidden><i className="g1"/><i className="g2"/></div>

      <header className="hd">
        <a href="/" className="back">← Lobby</a>
        <div className="logo"><b>BINGO</b><em>BOLLA</em></div>
        <div className="hd-r">
          <button className="bell">🔔<i>3</i></button>
          <div className="ava sm">{initial}</div>
        </div>
      </header>

      <main className="wrap">
        <h1 className="title">Mi cuenta</h1>

        <section className="profile">
          <img className="masc" src={MASCOT} alt="" onError={e=>{(e.target as HTMLImageElement).style.display="none"}}/>
          <div className="ava big">{initial}<button className="cam">📷</button></div>
          <div className="pmeta">
            <div className="pname">{name}</div>
            <div className="pmail">{email}</div>
            <div className="pbadges">
              <span className="vf">🛡 VERIFICADO</span>
              <span className="loc">📍 FL</span>
            </div>
          </div>
          <div className="bal">
            <div><small>GOLD</small><div className="bv gold">🪙 {fmt(gold)}</div></div>
            <div><small>SWEEPS</small><div className="bv sw">💎 ${fmt(sweeps)}</div></div>
          </div>
        </section>

        <h2 className="sh">📊 ESTADÍSTICAS</h2>
        <div className="stats">
          {STATS.map(s=>(
            <div key={s.t} className="scard">
              <div className="sico" style={{["--c" as string]:s.c}}>{s.i}</div>
              <div><div className="st-t">{s.t}</div><div className="st-v">{s.v}</div></div>
            </div>))}
        </div>

        <h2 className="sh">🛡 AJUSTES Y SEGURIDAD</h2>
        <a href="/limites" className="setcard">
          <div className="sic blue">⚖️</div>
          <div className="sct"><b>Límites de juego</b><span>Sin límites configurados</span></div>
          <span className="arr">→</span>
        </a>
        <a href="/auto-exclusion" className="setcard">
          <div className="sic red">🚫</div>
          <div className="sct"><b>Auto-exclusión</b><span>Tómate un descanso</span></div>
          <span className="arr">→</span>
        </a>
        <button className="logout" onClick={async()=>{await sb.auth.signOut();window.location.href="/login"}}>
          Cerrar sesión
        </button>
      </main>

      <nav className="bnav">
        {NAV.map(n=>(
          <a key={n.t} href={n.h} className="bn">
            <span className="bn-i">{n.i}{n.b&&<i>{n.b}</i>}</span>
            <span className="bn-t">{n.t}</span>
          </a>))}
      </nav>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Hanken+Grotesk:wght@400;500;600&display=swap');
        .bb{--bg:#0A0414;--gold:#FFB323;--gold2:#FFD55E;--vio:#7B2FF7;--vio2:#A45BFF;
          --pink:#FF4D9A;--cyan:#3DE8FF;--live:#FF3B5C;--mut:rgba(255,255,255,.5);
          position:relative;min-height:100vh;background:var(--bg);color:#fff;
          font-family:'Hanken Grotesk',sans-serif;padding-bottom:90px;overflow-x:hidden}
        .bb *{box-sizing:border-box;margin:0;padding:0}.bb a{color:inherit;text-decoration:none}
        .bg{position:fixed;inset:0;z-index:0;
          background:radial-gradient(120% 60% at 50% 0%,#2e0f52,#170830 45%,var(--bg) 80%)}
        .bg i{position:absolute;border-radius:50%;filter:blur(80px);opacity:.3}
        .g1{width:380px;height:380px;background:var(--vio);top:-100px;right:-80px}
        .g2{width:340px;height:340px;background:var(--pink);top:35%;left:-100px;opacity:.22}
        .hd{position:relative;z-index:5;display:flex;align-items:center;
          justify-content:space-between;padding:16px 18px;
          border-bottom:1px solid rgba(255,255,255,.08)}
        .back{font-size:15px;color:var(--vio2);font-weight:600}
        .logo{font-family:'Fredoka';font-weight:700;font-size:22px}
        .logo b{color:#fff}.logo em{color:var(--gold);font-style:normal;
          text-shadow:0 0 14px rgba(255,179,35,.6)}
        .hd-r{display:flex;align-items:center;gap:10px}
        .bell{position:relative;background:none;border:none;font-size:18px;cursor:pointer}
        .bell i{position:absolute;top:-6px;right:-6px;width:16px;height:16px;border-radius:50%;
          background:var(--live);font-size:9px;font-weight:700;display:grid;
          place-items:center;font-style:normal}
        .ava{border-radius:50%;display:grid;place-items:center;font-family:'Fredoka';
          font-weight:700;background:linear-gradient(135deg,#ff9a6b,var(--pink))}
        .ava.sm{width:34px;height:34px;font-size:15px}
        .wrap{position:relative;z-index:5;max-width:560px;margin:0 auto;padding:18px}
        .title{font-family:'Fredoka';font-weight:700;font-size:30px;margin-bottom:16px}
        .profile{position:relative;padding:22px;border-radius:22px;margin-bottom:24px;
          background:linear-gradient(180deg,rgba(60,28,100,.4),rgba(30,14,52,.5));
          border:1px solid rgba(167,91,255,.3);overflow:hidden}
        .masc{position:absolute;top:6px;right:-6px;width:130px;height:130px;
          object-fit:contain;opacity:.95;
          filter:drop-shadow(0 6px 16px rgba(123,47,247,.5))}
        .ava.big{width:84px;height:84px;font-size:38px;position:relative;
          box-shadow:0 8px 24px rgba(255,77,154,.4)}
        .cam{position:absolute;bottom:-2px;right:-2px;width:26px;height:26px;
          border-radius:50%;border:none;background:var(--vio);font-size:12px;cursor:pointer}
        .pmeta{margin-top:14px}
        .pname{font-family:'Fredoka';font-weight:700;font-size:26px}
        .pmail{font-size:14px;color:var(--mut);margin:2px 0 12px}
        .pbadges{display:flex;gap:8px}
        .vf{font-size:11px;font-weight:700;color:#3ddc78;padding:5px 11px;border-radius:9px;
          background:rgba(61,220,120,.12);border:1px solid rgba(61,220,120,.4)}
        .loc{font-size:11px;font-weight:600;color:var(--mut);padding:5px 11px;
          border-radius:9px;background:rgba(255,255,255,.06);
          border:1px solid rgba(255,255,255,.1)}
        .bal{display:flex;gap:40px;margin-top:18px;padding-top:18px;
          border-top:1px solid rgba(255,255,255,.1)}
        .bal small{font-size:11px;color:var(--mut);letter-spacing:1px}
        .bv{font-family:'Fredoka';font-weight:700;font-size:24px;margin-top:4px}
        .bv.gold{color:#fff}.bv.sw{color:var(--cyan)}
        .sh{font-family:'Fredoka';font-weight:600;font-size:14px;letter-spacing:1px;
          color:var(--mut);margin:24px 0 14px}
        .stats{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .scard{display:flex;align-items:center;gap:14px;padding:18px;border-radius:16px;
          background:rgba(255,255,255,.04);border:1px solid rgba(167,91,255,.2)}
        .sico{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;
          font-size:20px;background:color-mix(in srgb,var(--c) 18%,transparent);
          border:1px solid color-mix(in srgb,var(--c) 40%,transparent)}
        .st-t{font-size:12px;color:var(--mut);font-weight:600}
        .st-v{font-family:'Fredoka';font-weight:700;font-size:22px}
        .setcard{display:flex;align-items:center;gap:14px;padding:16px;border-radius:16px;
          margin-bottom:12px;background:rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.08);transition:.2s}
        .setcard:hover{border-color:rgba(167,91,255,.4)}
        .sic{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;
          font-size:19px}
        .sic.blue{background:rgba(61,232,255,.12);border:1px solid rgba(61,232,255,.35)}
        .sic.red{background:rgba(255,59,92,.12);border:1px solid rgba(255,59,92,.35)}
        .sct{flex:1}.sct b{font-family:'Fredoka';font-size:16px;display:block}
        .sct span{font-size:13px;color:var(--mut)}
        .arr{color:var(--mut);font-size:18px}
        .logout{width:100%;margin-top:20px;padding:14px;border-radius:14px;
          background:rgba(255,59,92,.1);border:1px solid rgba(255,59,92,.3);
          color:#ff9eb0;font-family:'Fredoka';font-weight:600;font-size:15px;cursor:pointer}
        .bnav{position:fixed;bottom:0;left:0;right:0;z-index:20;display:flex;
          justify-content:space-around;padding:10px 8px env(safe-area-inset-bottom,10px);
          background:rgba(10,4,20,.97);backdrop-filter:blur(12px);
          border-top:1px solid rgba(255,255,255,.1)}
        .bn{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 12px}
        .bn-i{position:relative;font-size:19px}
        .bn-i i{position:absolute;top:-6px;right:-9px;width:15px;height:15px;border-radius:50%;
          background:var(--live);font-size:9px;font-weight:700;display:grid;
          place-items:center;font-style:normal}
        .bn-t{font-family:'Fredoka';font-size:10px;font-weight:600;color:var(--mut)}
        @media(max-width:480px){.stats{grid-template-columns:1fr}.masc{opacity:.5}}
      `}</style>
    </div>
  );
}
