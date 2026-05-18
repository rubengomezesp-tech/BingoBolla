"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/* TIENDA · src/app/store/page.tsx · clon ref img7
   VISUAL — conecta tu checkout en onBuy() (no toco tu lógica Stripe) */
const MASCOT="https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/mascot-miami/mascot-miami.PNG";
const fmt=(n:number)=>n>=1e3?n.toLocaleString():String(n);

export default function Store(){
  const sb=createClient();
  const [p,setP]=useState<any>(null);
  useEffect(()=>{(async()=>{
    const safe=async(x:any)=>{try{return await Promise.resolve(x)}catch{return{data:null}}};
    const ur=await safe(sb.auth.getUser());
    if(ur?.data?.user){const pr=await safe(
      sb.from("profiles").select("gold_coins,sweeps_coins,diamonds").eq("id",ur.data.user.id).single());
      if(pr?.data)setP(pr.data);}
  })()},[]);

  // TODO: conectar a tu checkout Stripe existente
  const onBuy=(packId:string)=>{ window.location.href=`/store/checkout?pack=${packId}`; };

  const gold=p?.gold_coins??101235, sw=p?.sweeps_coins??999945, dia=p?.diamonds??100000;

  const PACKS=[
    {id:"starter",t:"STARTER PACK",s:"MEJOR PARA EMPEZAR",g:"5,000",sw:"+5",ex:"+10% EXTRA",pr:"$4.99",c:"#3DE8FF"},
    {id:"plus",t:"PLUS PACK",s:"MÁS JUEGO, MÁS PREMIOS",g:"15,000",sw:"+15",ex:"+20% EXTRA",pr:"$9.99",c:"#FFB323",hot:true},
    {id:"pro",t:"PRO PACK",s:"PARA JUGADORES VIP",g:"50,000",sw:"+30",ex:"+30% EXTRA",pr:"$19.99",c:"#A45BFF",best:true},
  ];
  const OFFERS=[
    {t:"COFRE SORPRESA",d:"Hasta 5,000 Gold + 5 Sweep",px:"💎 20",c:"#3DE8FF"},
    {t:"PAQUETE DE ORO",d:"3,000 Gold Coins",px:"💎 10",c:"#FFB323"},
    {t:"PAQUETE DE SWEEPS",d:"+10 Sweeps Coins",px:"💎 25",c:"#3DE8FF"},
    {t:"ENERGÍA EXTRA",d:"+50 Energía",px:"💎 15",c:"#A45BFF"},
  ];
  const CUSTOM=[["🧑","AVATARES"],["😎","EMOJIS"],["🐶","MASCOTAS"],
    ["🎴","TEMAS"],["🖼️","MARCOS"],["✨","EFECTOS"]];
  const NAV=[{i:"🏠",t:"INICIO",h:"/"},{i:"🌐",t:"MUNDOS",h:"/mundos"},
    {i:"🎫",t:"EVENTOS",h:"/eventos",b:3},{i:"🏆",t:"RANKING",h:"/ranking"},
    {i:"🎁",t:"COFRES",h:"/cofres",b:2},{i:"🛒",t:"TIENDA",h:"/store",act:true}];

  return(
    <div className="bb">
      <div className="bg" aria-hidden><i className="g1"/><i className="g2"/></div>

      <header className="hd">
        <a href="/" className="back">← Lobby</a>
        <div className="logo"><b>BINGO</b><em>BOLLA</em></div>
        <button className="bell">🔔<i>3</i></button>
      </header>

      <main className="wrap">
        <section className="hero">
          <div>
            <h1 className="ht"><span>TIENDA</span><br/><em>BINGOBOLLA</em></h1>
            <p>Compra, juega y gana increíbles premios.</p>
          </div>
          <img className="masc" src={MASCOT} alt="" onError={e=>{(e.target as HTMLImageElement).style.display="none"}}/>
        </section>

        <section className="balance">
          <div className="bt">TU BALANCE ACTUAL</div>
          <div className="brow">
            <div><div className="bi">🪙</div><div className="bv g">{fmt(gold)}</div><small>GOLD COINS</small></div>
            <div><div className="bi">💎</div><div className="bv s">${fmt(sw)}</div><small>SWEEPS COINS</small></div>
            <div><div className="bi">✨</div><div className="bv d">{fmt(dia)}</div><small>DIAMONDS</small></div>
          </div>
        </section>

        <div className="sh"><h2>📦 PAQUETES DE MONEDAS Y SWEEPS</h2><a href="#">Ver todos ›</a></div>
        <div className="packs">
          {PACKS.map(k=>(
            <div key={k.id} className={`pack ${k.hot?"hot":""} ${k.best?"best":""}`}
              style={{["--c" as string]:k.c}}>
              {k.hot&&<span className="rib hot">🔥 MÁS POPULAR</span>}
              {k.best&&<span className="rib best">👑 MEJOR VALOR</span>}
              <h3>{k.t}</h3><div className="psub">{k.s}</div>
              <div className="chest">🎁</div>
              <div className="pamt"><span>🪙 {k.g}<small>GOLD</small></span>
                <span>💎 {k.sw}<small>SWEEPS</small></span></div>
              <div className="pex">{k.ex}</div>
              <button className="pbuy" onClick={()=>onBuy(k.id)}>{k.pr}</button>
            </div>))}
        </div>

        <div className="sh"><h2>⚡ OFERTAS DEL DÍA</h2>
          <span className="tmr">Nuevas en: 12h 45m ⏱</span></div>
        <div className="offers">
          {OFFERS.map(o=>(
            <div key={o.t} className="off" style={{["--c" as string]:o.c}}>
              <div className="oi">🎁</div>
              <b>{o.t}</b><p>{o.d}</p>
              <button className="obuy" onClick={()=>onBuy(o.t)}>{o.px}</button>
            </div>))}
        </div>

        <div className="sh"><h2>⭐ PERSONALIZA TU EXPERIENCIA</h2><a href="#">Ver todo ›</a></div>
        <div className="custom">
          {CUSTOM.map(([i,t])=>(
            <a key={t} href="#" className="cu"><div className="cui">{i}</div><span>{t}</span></a>))}
        </div>

        <section className="special">
          <div className="spi">🧰</div>
          <div className="spm"><b>OFERTA ESPECIAL</b>
            <span>¡Un paquete único con grandes recompensas!</span>
            <div className="spt">⏱ 2d 18h 32m</div></div>
          <button className="spbuy" onClick={()=>onBuy("special")}>VER OFERTA</button>
        </section>
      </main>

      <nav className="bnav">
        {NAV.map(n=>(
          <a key={n.t} href={n.h} className={`bn ${n.act?"act":""}`}>
            <span className="bn-i">{n.i}{n.b&&<i>{n.b}</i>}</span>
            <span className="bn-t">{n.t}</span></a>))}
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
        .g1{width:380px;height:380px;background:var(--vio);top:-100px;left:-80px}
        .g2{width:340px;height:340px;background:var(--pink);top:40%;right:-100px;opacity:.22}
        .hd{position:relative;z-index:5;display:flex;align-items:center;
          justify-content:space-between;padding:16px 18px;
          border-bottom:1px solid rgba(255,255,255,.08)}
        .back{font-size:15px;color:var(--vio2);font-weight:600}
        .logo{font-family:'Fredoka';font-weight:700;font-size:22px}
        .logo b{color:#fff}.logo em{color:var(--gold);font-style:normal;
          text-shadow:0 0 14px rgba(255,179,35,.6)}
        .bell{position:relative;background:none;border:none;font-size:18px;cursor:pointer;color:#fff}
        .bell i{position:absolute;top:-6px;right:-6px;width:16px;height:16px;border-radius:50%;
          background:var(--live);font-size:9px;font-weight:700;display:grid;
          place-items:center;font-style:normal}
        .wrap{position:relative;z-index:5;max-width:600px;margin:0 auto;padding:18px}
        .hero{display:flex;align-items:center;justify-content:space-between;
          margin-bottom:18px}
        .ht{font-family:'Fredoka';font-weight:700;font-size:34px;line-height:1.05}
        .ht span{color:#fff;text-shadow:0 0 18px rgba(167,91,255,.5)}
        .ht em{color:var(--gold);font-style:normal;
          text-shadow:0 0 18px rgba(255,179,35,.55)}
        .hero p{font-size:14px;color:var(--mut);margin-top:8px;max-width:220px}
        .masc{width:130px;height:130px;object-fit:contain;
          filter:drop-shadow(0 6px 16px rgba(123,47,247,.5))}
        .balance{padding:20px;border-radius:20px;margin-bottom:24px;
          background:rgba(255,255,255,.04);border:1px solid rgba(167,91,255,.25)}
        .bt{text-align:center;font-size:12px;letter-spacing:3px;color:var(--mut);
          margin-bottom:16px}
        .brow{display:flex;justify-content:space-around;text-align:center}
        .bi{font-size:26px;margin-bottom:6px}
        .bv{font-family:'Fredoka';font-weight:700;font-size:22px}
        .bv.g{color:var(--gold)}.bv.s{color:var(--pink)}.bv.d{color:var(--cyan)}
        .brow small{font-size:10px;color:var(--mut);letter-spacing:1px}
        .sh{display:flex;align-items:center;justify-content:space-between;
          margin:24px 0 14px}
        .sh h2{font-family:'Fredoka';font-weight:600;font-size:15px;letter-spacing:.5px}
        .sh a,.tmr{font-size:12px;color:var(--mut)}
        .packs{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .pack{position:relative;padding:20px 14px;border-radius:18px;text-align:center;
          background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02));
          border:1.5px solid color-mix(in srgb,var(--c) 40%,transparent)}
        .pack.hot{border-color:var(--gold);box-shadow:0 0 26px rgba(255,179,35,.25)}
        .pack.best{border-color:var(--vio2);box-shadow:0 0 26px rgba(167,91,255,.25)}
        .rib{position:absolute;top:-11px;left:50%;transform:translateX(-50%);
          font-size:10px;font-weight:800;padding:3px 12px;border-radius:8px;
          white-space:nowrap}
        .rib.hot{background:var(--live);color:#fff}
        .rib.best{background:linear-gradient(90deg,var(--vio2),var(--pink));color:#fff}
        .pack h3{font-family:'Fredoka';font-weight:700;font-size:15px;color:var(--c);
          margin-top:6px}
        .psub{font-size:9px;color:var(--mut);letter-spacing:.5px;margin:4px 0 10px}
        .chest{font-size:46px;margin:6px 0}
        .pamt{display:flex;flex-direction:column;gap:4px;font-family:'Fredoka';
          font-weight:600;font-size:14px;margin-bottom:8px}
        .pamt small{font-size:8px;color:var(--mut);margin-left:4px;font-weight:400}
        .pex{font-size:10px;font-weight:700;color:var(--vio2);
          background:rgba(123,47,247,.15);padding:3px;border-radius:7px;margin-bottom:12px}
        .pbuy{width:100%;padding:11px;border:none;border-radius:11px;cursor:pointer;
          font-family:'Fredoka';font-weight:700;font-size:14px;color:#3a1e00;
          background:linear-gradient(180deg,var(--gold2),var(--gold));
          box-shadow:0 6px 16px rgba(255,179,35,.4)}
        .pbuy:hover{transform:translateY(-2px)}
        .offers{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .off{padding:14px 10px;border-radius:14px;text-align:center;
          background:rgba(255,255,255,.04);
          border:1px solid color-mix(in srgb,var(--c) 35%,transparent)}
        .oi{font-size:30px;margin-bottom:6px}
        .off b{font-family:'Fredoka';font-size:11px;display:block}
        .off p{font-size:10px;color:var(--mut);margin:4px 0 10px;min-height:26px}
        .obuy{width:100%;padding:8px;border:none;border-radius:9px;cursor:pointer;
          font-family:'Fredoka';font-weight:700;font-size:12px;color:#3a1e00;
          background:linear-gradient(180deg,var(--gold2),var(--gold))}
        .custom{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
        .cu{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 4px;
          border-radius:14px;background:rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.08)}
        .cui{font-size:24px}
        .cu span{font-family:'Fredoka';font-size:10px;font-weight:600;color:var(--mut)}
        .special{display:flex;align-items:center;gap:14px;margin-top:24px;padding:18px;
          border-radius:18px;background:linear-gradient(110deg,#5a1a8a,#7a1f6b);
          border:1px solid rgba(255,179,35,.3)}
        .spi{font-size:40px}
        .spm{flex:1}.spm b{font-family:'Fredoka';font-size:15px;color:var(--gold2)}
        .spm span{display:block;font-size:12px;color:rgba(255,255,255,.8);margin:3px 0 6px}
        .spt{font-size:11px;color:var(--mut)}
        .spbuy{padding:12px 18px;border:none;border-radius:12px;cursor:pointer;
          font-family:'Fredoka';font-weight:700;font-size:13px;color:#3a1e00;
          background:linear-gradient(180deg,var(--gold2),var(--gold))}
        .bnav{position:fixed;bottom:0;left:0;right:0;z-index:20;display:flex;
          justify-content:space-around;padding:10px 6px env(safe-area-inset-bottom,10px);
          background:rgba(10,4,20,.97);backdrop-filter:blur(12px);
          border-top:1px solid rgba(255,255,255,.1)}
        .bn{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 10px;
          border-radius:13px}
        .bn.act{background:linear-gradient(180deg,var(--vio2),var(--vio));
          box-shadow:0 4px 14px rgba(123,47,247,.5)}
        .bn-i{position:relative;font-size:18px}
        .bn-i i{position:absolute;top:-6px;right:-9px;width:15px;height:15px;border-radius:50%;
          background:var(--live);font-size:9px;font-weight:700;display:grid;
          place-items:center;font-style:normal}
        .bn-t{font-family:'Fredoka';font-size:9px;font-weight:600;color:var(--mut)}
        .bn.act .bn-t{color:#fff}
        @media(max-width:560px){.packs{grid-template-columns:1fr}
          .offers{grid-template-columns:1fr 1fr}.custom{grid-template-columns:repeat(3,1fr)}}
      `}</style>
    </div>
  );
}
