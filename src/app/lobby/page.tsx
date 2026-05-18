"use client";
import { useEffect, useState } from "react";

/* BingoBolla — LOBBY  ·  src/app/lobby/page.tsx
   Pantalla principal tras login (ref mockup 1) */

export default function Lobby() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(true), []);

  const ROOMS = [
    { n:"BINGO FIESTA", c:"#FF4D9A", players:75,  jp:"25,000" },
    { n:"BINGO 90",     c:"#3DE8FF", players:132, jp:"50,000" },
    { n:"POWER BINGO",  c:"#FFB323", players:54,  jp:"15,000" },
  ];
  const MISSIONS = [
    { t:"Juega 3 partidas", p:1, m:3, r:500 },
    { t:"Gana 2 bingos",    p:1, m:2, r:750 },
    { t:"Usa 3 Power Ups",  p:0, m:3, r:500 },
  ];
  const NAV = [
    { i:"🏠", t:"INICIO", href:"/lobby", active:true },
    { i:"🛒", t:"TIENDA", href:"/tienda", badge:1 },
    { i:"🗺️", t:"MAPA",   href:"/mundo" },
    { i:"👥", t:"AMIGOS", href:"/amigos", badge:5 },
    { i:"🎁", t:"COFRES", href:"/cofres", badge:2 },
  ];

  return (
    <div className="bb">
      <div className="bb-bg" aria-hidden><i className="g1"/><i className="g2"/></div>

      {/* Header */}
      <header className="hd">
        <a href="/lobby" className="logo"><b>BINGO</b><em>BOLLA</em></a>
        <div className="wallet">
          <div className="pill gold">🪙 <span>125,500</span><b>+</b></div>
          <div className="pill pink">💎 <span>2,450</span><b>+</b></div>
          <div className="pill cyan">⚡ <span>5</span><b>+</b></div>
        </div>
        <div className="hd-r">
          <button className="ic">🎁<span className="dot">3</span></button>
          <button className="ic">☰</button>
        </div>
      </header>

      {/* Perfil */}
      <div className="prof">
        <div className="av">🦸‍♀️<span className="lvl">23</span></div>
        <div className="pinfo">
          <div className="pname">BingoStar</div>
          <div className="xpbar"><i style={{width:"78%"}}/></div>
          <div className="xptxt">XP 12,350 / 15,000</div>
        </div>
      </div>

      <main className={`wrap ${on?"on":""}`}>
        {/* Evento */}
        <section className="event">
          <div className="ev-l">
            <span className="ev-tag">EVENTO ESPECIAL</span>
            <h2>FIESTA TROPICAL</h2>
            <span className="ev-tm">⏱ Termina en: 2d 18h</span>
          </div>
          <div className="ev-r">🌴🎉</div>
        </section>

        {/* CTA principal */}
        <a href="/mundo" className="bigcta">
          <span className="bc-eye">★ ¿LISTO PARA GANAR? ★</span>
          <span className="bc-t">JUGAR BINGO</span>
          <span className="bc-s">Elige tu sala y gana</span>
        </a>

        {/* Salas */}
        <section className="sec">
          <div className="sec-h"><h3>SALAS EN VIVO</h3><a href="/mundo">Ver todas</a></div>
          <div className="rooms">
            {ROOMS.map(r=>(
              <div key={r.n} className="room" style={{["--c" as string]:r.c}}>
                <span className="live">● LIVE</span>
                <h4>{r.n}</h4>
                <div className="rinfo">👤 {r.players} jugadores</div>
                <div className="jp">Premio mayor<br/><b>🪙 {r.jp}</b></div>
                <a href="/mundo" className="btn vio">JUGAR</a>
              </div>
            ))}
          </div>
        </section>

        {/* Oferta + cofre */}
        <section className="duo">
          <div className="card offer">
            <div>
              <h4>OFERTA ESPECIAL</h4>
              <p>Paquete de Inicio</p>
              <a href="/tienda" className="btn gold sm">VER OFERTAS</a>
            </div>
            <div className="bigico">💰</div>
          </div>
          <div className="card chest">
            <div>
              <h4>COFRE GRATIS</h4>
              <p>Siguiente en: <b>02:45:30</b></p>
            </div>
            <div className="bigico">🎁</div>
          </div>
        </section>

        {/* Misiones */}
        <section className="sec">
          <div className="sec-h"><h3>MISIONES DIARIAS <span className="badge">2</span></h3></div>
          <div className="miss">
            {MISSIONS.map(m=>(
              <div key={m.t} className="mcard">
                <div className="mtop">🎯 <b>{m.t}</b></div>
                <div className="mbar"><i style={{width:`${(m.p/m.m)*100}%`}}/></div>
                <div className="mfoot"><span>{m.p}/{m.m}</span><span className="rew">🪙 {m.r}</span></div>
              </div>
            ))}
          </div>
        </section>

        {/* Amigos */}
        <section className="friends">
          <div>
            <h3>JUEGA CON AMIGOS</h3>
            <p>Crea tu squad y disfruten juntos cada partida</p>
            <a href="/amigos" className="btn vio sm">+ INVITAR AMIGOS</a>
          </div>
          <div className="bigico">🧑‍🤝‍🧑</div>
        </section>
      </main>

      {/* Bottom nav */}
      <nav className="bnav">
        {NAV.map(n=>(
          <a key={n.t} href={n.href} className={`bn ${n.active?"act":""}`}>
            <span className="bn-i">{n.i}{n.badge&&<i className="bn-d">{n.badge}</i>}</span>
            <span className="bn-t">{n.t}</span>
          </a>
        ))}
      </nav>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Hanken+Grotesk:wght@400;500;600&display=swap');
        .bb{--bg2:#0C0418;--gold:#FFB323;--gold2:#FFD55E;--vio:#7B2FF7;--vio2:#A45BFF;
          --pink:#FF4D9A;--cyan:#3DE8FF;--live:#FF3B5C;--ink:#fff;--mut:rgba(255,255,255,.6);
          position:relative;min-height:100vh;background:var(--bg2);color:var(--ink);
          font-family:'Hanken Grotesk',sans-serif;padding-bottom:90px;overflow-x:hidden}
        .bb *{box-sizing:border-box;margin:0;padding:0}.bb a{color:inherit;text-decoration:none}
        .bb-bg{position:fixed;inset:0;z-index:0;
          background:radial-gradient(130% 80% at 50% 0%,#3a1260,#1B0A33 50%,var(--bg2) 82%)}
        .bb-bg i{position:absolute;border-radius:50%;filter:blur(80px);opacity:.35}
        .g1{width:420px;height:420px;background:var(--vio);top:-100px;left:-80px}
        .g2{width:380px;height:380px;background:var(--pink);top:40%;right:-120px;opacity:.25}
        .hd{position:relative;z-index:5;display:flex;align-items:center;
          justify-content:space-between;gap:12px;padding:16px 16px 10px;flex-wrap:wrap}
        .logo{font-family:'Fredoka',sans-serif;font-weight:700;font-size:22px;line-height:1}
        .logo b{color:#fff}.logo em{color:var(--gold);font-style:normal;
          text-shadow:0 0 14px rgba(255,179,35,.6)}
        .wallet{display:flex;gap:8px;flex-wrap:wrap}
        .pill{display:flex;align-items:center;gap:6px;font-family:'Fredoka',sans-serif;
          font-weight:600;font-size:13px;padding:7px 10px;border-radius:999px;
          background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.12)}
        .pill b{width:18px;height:18px;border-radius:50%;display:grid;place-items:center;
          font-size:13px;background:rgba(255,255,255,.15);margin-left:2px}
        .pill.gold{box-shadow:0 0 14px rgba(255,179,35,.25)}
        .pill.pink{box-shadow:0 0 14px rgba(255,77,154,.25)}
        .pill.cyan{box-shadow:0 0 14px rgba(61,232,255,.25)}
        .hd-r{display:flex;gap:8px}
        .ic{position:relative;width:40px;height:40px;border-radius:12px;border:none;
          background:rgba(255,255,255,.08);color:#fff;font-size:17px;cursor:pointer}
        .dot{position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;
          background:var(--live);font-size:10px;font-weight:700;display:grid;place-items:center}
        .prof{position:relative;z-index:5;display:flex;align-items:center;gap:12px;
          margin:6px 16px 0;padding:12px 14px;border-radius:16px;
          background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}
        .av{position:relative;width:50px;height:50px;border-radius:50%;
          background:linear-gradient(135deg,var(--vio2),var(--pink));
          display:grid;place-items:center;font-size:24px}
        .lvl{position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);
          background:var(--gold);color:#3a1e00;font-family:'Fredoka',sans-serif;
          font-weight:700;font-size:11px;padding:1px 7px;border-radius:8px}
        .pinfo{flex:1}.pname{font-family:'Fredoka',sans-serif;font-weight:600;font-size:16px}
        .xpbar{height:7px;border-radius:4px;background:rgba(255,255,255,.12);
          margin:6px 0 4px;overflow:hidden}
        .xpbar i{display:block;height:100%;border-radius:4px;
          background:linear-gradient(90deg,var(--cyan),var(--vio2))}
        .xptxt{font-size:11px;color:var(--mut)}
        .wrap{position:relative;z-index:5;max-width:560px;margin:0 auto;
          padding:16px;opacity:0;transform:translateY(20px);transition:.8s}
        .wrap.on{opacity:1;transform:none}
        .event{display:flex;align-items:center;justify-content:space-between;
          padding:20px 22px;border-radius:20px;margin-bottom:16px;
          background:linear-gradient(110deg,#b8530a,#7a1f6b);
          border:1px solid rgba(255,179,35,.3)}
        .ev-tag{font-family:'Fredoka',sans-serif;font-size:11px;font-weight:600;
          letter-spacing:2px;color:rgba(255,255,255,.8)}
        .event h2{font-family:'Fredoka',sans-serif;font-weight:700;font-size:30px;
          color:var(--gold2);margin:4px 0 8px;text-shadow:0 2px 12px rgba(0,0,0,.5)}
        .ev-tm{font-size:12px;background:rgba(0,0,0,.35);padding:4px 10px;
          border-radius:999px}
        .ev-r{font-size:48px}
        .bigcta{display:flex;flex-direction:column;align-items:center;gap:4px;
          padding:24px;border-radius:22px;margin-bottom:18px;text-align:center;
          background:linear-gradient(180deg,var(--gold2),var(--gold));color:#3a1e00;
          box-shadow:0 10px 30px rgba(255,179,35,.45),inset 0 1px 0 rgba(255,255,255,.6);
          transition:.2s}
        .bigcta:hover{transform:translateY(-2px)}
        .bc-eye{font-family:'Fredoka',sans-serif;font-size:12px;font-weight:600;
          letter-spacing:1px;opacity:.75}
        .bc-t{font-family:'Fredoka',sans-serif;font-weight:700;font-size:34px;line-height:1}
        .bc-s{font-size:13px;font-weight:600;opacity:.8}
        .sec{margin-bottom:18px}
        .sec-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
        .sec-h h3{font-family:'Fredoka',sans-serif;font-weight:600;font-size:15px;
          letter-spacing:1px}
        .sec-h a{font-size:12px;color:var(--mut)}
        .badge{background:var(--live);color:#fff;font-size:11px;font-weight:700;
          padding:1px 7px;border-radius:8px;margin-left:4px}
        .rooms{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .room{position:relative;padding:18px 16px;border-radius:18px;text-align:center;
          background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.02));
          border:1px solid rgba(255,255,255,.08);border-top:3px solid var(--c)}
        .room:first-child{grid-column:1/-1}
        .live{position:absolute;top:12px;right:12px;font-size:9px;font-weight:700;
          background:var(--live);padding:2px 7px;border-radius:7px;letter-spacing:1px}
        .room h4{font-family:'Fredoka',sans-serif;font-size:20px;color:var(--c);
          margin:4px 0 10px;text-shadow:0 0 16px color-mix(in srgb,var(--c) 45%,transparent)}
        .rinfo{font-size:12px;color:var(--mut);margin-bottom:10px}
        .jp{font-size:12px;color:var(--mut);margin-bottom:14px;line-height:1.5}
        .jp b{font-family:'Fredoka',sans-serif;font-size:20px;color:var(--gold)}
        .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;
          font-family:'Fredoka',sans-serif;font-weight:600;font-size:14px;
          padding:12px 22px;border-radius:13px;cursor:pointer;transition:.2s}
        .btn.sm{padding:10px 18px;font-size:13px}
        .btn.vio{background:linear-gradient(180deg,var(--vio2),var(--vio));color:#fff;
          width:100%;box-shadow:0 6px 18px rgba(123,47,247,.5),
          inset 0 1px 0 rgba(255,255,255,.3)}
        .btn.gold{background:linear-gradient(180deg,var(--gold2),var(--gold));color:#3a1e00;
          box-shadow:0 6px 18px rgba(255,179,35,.4),inset 0 1px 0 rgba(255,255,255,.6)}
        .btn:hover{transform:translateY(-2px)}
        .duo{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px}
        .card{display:flex;align-items:center;justify-content:space-between;gap:10px;
          padding:18px;border-radius:18px;
          background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}
        .card h4{font-family:'Fredoka',sans-serif;font-size:14px;letter-spacing:.5px}
        .card p{font-size:12px;color:var(--mut);margin:4px 0 12px}
        .card p b{color:var(--gold)}
        .bigico{font-size:42px}
        .miss{display:flex;flex-direction:column;gap:10px}
        .mcard{padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.07)}
        .mtop{font-size:14px;margin-bottom:8px}.mtop b{font-family:'Fredoka',sans-serif}
        .mbar{height:6px;border-radius:4px;background:rgba(255,255,255,.12);overflow:hidden}
        .mbar i{display:block;height:100%;background:linear-gradient(90deg,var(--gold2),var(--gold))}
        .mfoot{display:flex;justify-content:space-between;font-size:12px;
          color:var(--mut);margin-top:7px}
        .rew{font-family:'Fredoka',sans-serif;color:var(--gold);font-weight:600}
        .friends{display:flex;align-items:center;justify-content:space-between;gap:12px;
          padding:22px;border-radius:20px;
          background:linear-gradient(110deg,#5a1a8a,#7a1f6b);
          border:1px solid rgba(255,255,255,.1)}
        .friends h3{font-family:'Fredoka',sans-serif;font-weight:700;font-size:18px}
        .friends p{font-size:13px;color:rgba(255,255,255,.75);margin:6px 0 14px}
        .bnav{position:fixed;bottom:0;left:0;right:0;z-index:20;display:flex;
          justify-content:space-around;padding:10px 8px env(safe-area-inset-bottom,10px);
          background:rgba(12,4,24,.96);backdrop-filter:blur(12px);
          border-top:1px solid rgba(255,255,255,.1)}
        .bn{display:flex;flex-direction:column;align-items:center;gap:3px;
          padding:6px 14px;border-radius:14px;transition:.2s}
        .bn.act{background:linear-gradient(180deg,var(--vio2),var(--vio));
          box-shadow:0 4px 14px rgba(123,47,247,.5)}
        .bn-i{position:relative;font-size:20px}
        .bn-d{position:absolute;top:-6px;right:-8px;width:16px;height:16px;border-radius:50%;
          background:var(--live);font-size:9px;font-weight:700;display:grid;
          place-items:center;font-style:normal}
        .bn-t{font-family:'Fredoka',sans-serif;font-size:10px;font-weight:600;
          color:var(--mut)}
        .bn.act .bn-t{color:#fff}
        @media(max-width:600px){.event h2{font-size:24px}.bc-t{font-size:28px}}
      `}</style>
    </div>
  );
}
