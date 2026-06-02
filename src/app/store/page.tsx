"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, Bell, Coins, Gem, Gift, Package, Sparkles, Zap } from "lucide-react";
import MobileTabBar from "@/components/MobileTabBar";
import { createClient } from "@/lib/supabase/client";

/* TIENDA · src/app/store/page.tsx · clon ref img7 */
const MASCOT="https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/mascot-miami/mascot-miami.PNG";
const fmt=(n:number)=>n>=1e3?n.toLocaleString():String(n);
const money=(n:number)=>`$${Number(n||0).toFixed(2)}`;
const PACK_COLORS=["#3DE8FF","#FFB323","#A45BFF"];

type BalanceProfile={gold_coins?:number|null;sweeps_coins?:number|null;diamonds?:number|null};
type CoinPackage={
  bonus_pct?:number|null;
  currency_type?:"gold"|"sweeps"|"diamonds"|null;
  diamonds_amount?:number|null;
  gold_coins?:number|null;
  id:string;
  name?:string|null;
  price_usd?:number|null;
  sku?:string|null;
  sweeps_coins?:number|null;
};

function packageAmount(pkg:CoinPackage){
  if(pkg.currency_type==="diamonds") return {amount:fmt(Number(pkg.diamonds_amount??0)),label:"DIAMONDS"};
  if(pkg.currency_type==="sweeps") return {amount:`+${fmt(Number(pkg.sweeps_coins??0))}`,label:"SWEEPS"};
  return {amount:fmt(Number(pkg.gold_coins??0)),label:"GOLD"};
}

export default function Store(){
  const [p,setP]=useState<BalanceProfile|null>(null);
  const [packages,setPackages]=useState<CoinPackage[]>([]);
  const [buying,setBuying]=useState<string|null>(null);
  const [checkoutError,setCheckoutError]=useState<string|null>(null);
  useEffect(()=>{
    let mounted=true;
    const sb=createClient();
    const safe=async(x:any)=>{try{return await Promise.resolve(x)}catch{return{data:null}}};
    void (async()=>{
      const [ur,pkg]=await Promise.all([
        safe(sb.auth.getUser()),
        safe(sb.from("coin_packages").select("id,sku,name,currency_type,gold_coins,sweeps_coins,diamonds_amount,price_usd,bonus_pct,sort_order").eq("active",true).order("sort_order",{ascending:true})),
      ]);
      if(!mounted)return;
      if(Array.isArray(pkg?.data))setPackages(pkg.data as CoinPackage[]);
      if(ur?.data?.user){const pr=await safe(
        sb.from("profiles").select("gold_coins,sweeps_coins,diamonds").eq("id",ur.data.user.id).single());
        if(mounted&&pr?.data)setP(pr.data);}
    })();
    return()=>{mounted=false};
  },[]);

  const onBuy=async(packId:string)=>{
    if(buying)return;
    setBuying(packId);
    setCheckoutError(null);
    try{
      const res=await fetch("/api/checkout",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({package_id:packId}),
      });
      const data=await res.json().catch(()=>null);
      if(!res.ok||typeof data?.url!=="string"){
        setCheckoutError(String(data?.error??"No se pudo iniciar el checkout."));
        return;
      }
      window.location.assign(data.url);
    }catch{
      setCheckoutError("No se pudo conectar con el checkout.");
    }finally{
      setBuying(null);
    }
  };

  const gold=p?.gold_coins??0, sw=p?.sweeps_coins??0, dia=p?.diamonds??0;

  const PACKS=packages
    .filter((pkg)=>pkg.currency_type==="gold"||pkg.currency_type==="diamonds")
    .slice(0,3)
    .map((pkg,index)=>{
      const main=packageAmount(pkg);
      const sweeps=Number(pkg.sweeps_coins??0);
      const bonus=Number(pkg.bonus_pct??0);
      return {
        id:pkg.id,
        t:String(pkg.name??pkg.sku??"Pack").toUpperCase(),
        s:index===0?"MEJOR PARA EMPEZAR":index===1?"MÁS JUEGO, MÁS PREMIOS":"PARA JUGADORES VIP",
        g:main.amount,
        gLabel:main.label,
        sw:sweeps>0?`+${fmt(sweeps)}`:"BONUS",
        swLabel:sweeps>0?"SC GRATIS":"PREMIUM",
        ex:bonus>0?`+${bonus}% EXTRA`:"CHECKOUT SEGURO",
        pr:money(Number(pkg.price_usd??0)),
        c:PACK_COLORS[index]??"#3DE8FF",
        hot:index===1,
        best:index===2,
      };
    });
  const OFFERS=[
    {t:"COFRE SORPRESA",d:"Hasta 5,000 Gold + 5 Sweep",px:"💎 20",c:"#3DE8FF"},
    {t:"PAQUETE DE ORO",d:"3,000 Gold Coins",px:"💎 10",c:"#FFB323"},
    {t:"PAQUETE DE SWEEPS",d:"+10 Sweeps Coins",px:"💎 25",c:"#3DE8FF"},
    {t:"ENERGÍA EXTRA",d:"+50 Energía",px:"💎 15",c:"#A45BFF"},
  ];
  const CUSTOM=[["🧑","AVATARES"],["😎","EMOJIS"],["🐶","MASCOTAS"],
    ["🎴","TEMAS"],["🖼️","MARCOS"],["✨","EFECTOS"]];
  return(
    <div className="bb">
      <div className="bg" aria-hidden><i className="g1"/><i className="g2"/></div>

      <header className="hd">
        <a href="/" className="back"><ArrowLeft size={16} aria-hidden="true"/>Lobby</a>
        <div className="logo"><b>BINGO</b><em>BOLLA</em></div>
        <button className="bell" type="button" aria-label="Avisos de tienda"><Bell size={19} aria-hidden="true"/><i>3</i></button>
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
            <div><div className="bi"><Coins size={25}/></div><div className="bv g">{fmt(gold)}</div><small>GOLD COINS</small></div>
            <div><div className="bi"><Sparkles size={25}/></div><div className="bv s">{fmt(sw)}</div><small>SWEEPS COINS</small></div>
            <div><div className="bi"><Gem size={25}/></div><div className="bv d">{fmt(dia)}</div><small>DIAMONDS</small></div>
          </div>
        </section>

        {checkoutError?<div className="err">{checkoutError}</div>:null}

        <div className="sh"><h2><Package size={17}/> PAQUETES DE MONEDAS Y SWEEPS</h2><a href="/tienda">Ver todos ›</a></div>
        <div className="packs">
          {PACKS.length>0?PACKS.map(k=>(
            <div key={k.id} className={`pack ${k.hot?"hot":""} ${k.best?"best":""}`}
              style={{["--c" as string]:k.c}}>
              {k.hot&&<span className="rib hot">MÁS POPULAR</span>}
              {k.best&&<span className="rib best">MEJOR VALOR</span>}
              <h3>{k.t}</h3><div className="psub">{k.s}</div>
              <div className="chest"><Gift size={44}/></div>
              <div className="pamt"><span>{k.g}<small>{k.gLabel}</small></span>
                <span>{k.sw}<small>{k.swLabel}</small></span></div>
              <div className="pex">{k.ex}</div>
              <button className="pbuy" type="button" onClick={()=>onBuy(k.id)} disabled={buying!==null}>
                {buying===k.id?"Abriendo...":k.pr}
              </button>
            </div>)):<div className="pack empty"><h3>Paquetes sincronizando</h3><div className="psub">Checkout activo cuando Supabase responda</div></div>}
        </div>

        <div className="sh"><h2><Zap size={17}/> OFERTAS DEL DÍA</h2>
          <span className="tmr">Nuevas en: 12h 45m ⏱</span></div>
        <div className="offers">
          {OFFERS.map(o=>(
            <div key={o.t} className="off" style={{["--c" as string]:o.c}}>
              <div className="oi"><Gift size={29}/></div>
              <b>{o.t}</b><p>{o.d}</p>
              <button className="obuy" type="button" disabled>{o.px}</button>
            </div>))}
        </div>

        <div className="sh"><h2>⭐ PERSONALIZA TU EXPERIENCIA</h2><a href="#">Ver todo ›</a></div>
        <div className="custom">
          {CUSTOM.map(([i,t])=>(
            <a key={t} href="#" className="cu"><div className="cui">{i}</div><span>{t}</span></a>))}
        </div>

        <section className="special">
          <div className="spi">🧰</div>
          <div className="spm"><b>BOLLA MASTER</b>
            <span>Gira, protege y construye tu mundo Miami.</span>
            <div className="spt">Nuevo loop social de recompensas</div></div>
          <a className="spbuy" href="/bolla-master">JUGAR</a>
        </section>
      </main>

      <MobileTabBar activeKey="store" />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Hanken+Grotesk:wght@400;500;600&display=swap');
        .bb{--bg:#0A0414;--gold:#FFB323;--gold2:#FFD55E;--vio:#7B2FF7;--vio2:#A45BFF;
          --pink:#FF4D9A;--cyan:#3DE8FF;--live:#FF3B5C;--mut:rgba(255,255,255,.5);
          position:relative;min-height:100dvh;background:var(--bg);color:#fff;
          font-family:'Hanken Grotesk',sans-serif;padding-bottom:calc(118px + env(safe-area-inset-bottom,0px));overflow-x:hidden}
        .bb *{box-sizing:border-box;margin:0;padding:0}.bb a{color:inherit;text-decoration:none}
        .bg{position:fixed;inset:0;z-index:0;
          background:radial-gradient(120% 60% at 50% 0%,#2e0f52,#170830 45%,var(--bg) 80%)}
        .bg i{position:absolute;border-radius:50%;filter:blur(80px);opacity:.3}
        .g1{width:380px;height:380px;background:var(--vio);top:-100px;left:-80px}
        .g2{width:340px;height:340px;background:var(--pink);top:40%;right:-100px;opacity:.22}
        .hd{position:relative;z-index:5;display:flex;align-items:center;
          justify-content:space-between;padding:16px 18px;
          border-bottom:1px solid rgba(255,255,255,.08)}
        .back{display:inline-flex;align-items:center;gap:6px;font-size:15px;color:var(--vio2);font-weight:600}
        .logo{font-family:'Fredoka';font-weight:700;font-size:22px}
        .logo b{color:#fff}.logo em{color:var(--gold);font-style:normal;
          text-shadow:0 0 14px rgba(255,179,35,.6)}
        .bell{position:relative;width:36px;height:36px;display:grid;place-items:center;background:none;border:none;font-size:18px;cursor:pointer;color:#fff}
        .bell i{position:absolute;top:-6px;right:-6px;width:16px;height:16px;border-radius:50%;
          background:var(--live);font-size:9px;font-weight:700;display:grid;
          place-items:center;font-style:normal}
        .wrap{position:relative;z-index:5;max-width:600px;margin:0 auto;padding:18px clamp(14px,4vw,20px) calc(32px + env(safe-area-inset-bottom,0px))}
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
        .brow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;text-align:center}
        .brow>div{min-width:0}
        .bi{display:grid;place-items:center;font-size:26px;margin-bottom:6px;color:var(--gold)}
        .brow>div:nth-child(2) .bi{color:var(--pink)}.brow>div:nth-child(3) .bi{color:var(--cyan)}
        .bv{font-family:'Fredoka';font-weight:700;font-size:clamp(18px,5.4vw,22px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .bv.g{color:var(--gold)}.bv.s{color:var(--pink)}.bv.d{color:var(--cyan)}
        .brow small{font-size:10px;color:var(--mut);letter-spacing:1px}
        .err{margin:-8px 0 18px;border:1px solid rgba(255,77,154,.35);border-radius:14px;background:rgba(255,77,154,.1);padding:11px 13px;color:#ffd9e8;font-size:13px;font-weight:700}
        .sh{display:flex;align-items:center;justify-content:space-between;
          margin:24px 0 14px}
        .sh h2{display:inline-flex;align-items:center;gap:7px;font-family:'Fredoka';font-weight:600;font-size:15px;letter-spacing:.5px}
        .sh a,.tmr{font-size:12px;color:var(--mut)}
        .packs{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .pack{position:relative;padding:20px 14px;border-radius:18px;text-align:center;
          background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02));
          border:1.5px solid color-mix(in srgb,var(--c) 40%,transparent)}
        .pack.empty{grid-column:1/-1;border-color:rgba(255,255,255,.12);color:var(--mut)}
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
        .chest{display:grid;place-items:center;color:var(--c);font-size:46px;margin:6px 0}
        .pamt{display:flex;flex-direction:column;gap:4px;font-family:'Fredoka';
          font-weight:600;font-size:14px;margin-bottom:8px}
        .pamt small{font-size:8px;color:var(--mut);margin-left:4px;font-weight:400}
        .pex{font-size:10px;font-weight:700;color:var(--vio2);
          background:rgba(123,47,247,.15);padding:3px;border-radius:7px;margin-bottom:12px}
        .pbuy{width:100%;padding:11px;border:none;border-radius:11px;cursor:pointer;
          font-family:'Fredoka';font-weight:700;font-size:14px;color:#3a1e00;
          background:linear-gradient(180deg,var(--gold2),var(--gold));
          box-shadow:0 6px 16px rgba(255,179,35,.4)}
        .pbuy:hover:not(:disabled){transform:translateY(-2px)}
        .pbuy:disabled,.obuy:disabled{cursor:not-allowed;opacity:.55;filter:saturate(.75)}
        .offers{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .off{padding:14px 10px;border-radius:14px;text-align:center;
          background:rgba(255,255,255,.04);
          border:1px solid color-mix(in srgb,var(--c) 35%,transparent)}
        .oi{display:grid;place-items:center;color:var(--c);font-size:30px;margin-bottom:6px}
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
        @media(max-width:560px){.packs{grid-template-columns:1fr}
          .offers{grid-template-columns:1fr 1fr}.custom{grid-template-columns:repeat(3,1fr)}}
        @media(max-width:380px){
          .brow{grid-template-columns:1fr}
          .hero{align-items:flex-start}
          .masc{width:104px;height:104px}
        }
      `}</style>
    </div>
  );
}
