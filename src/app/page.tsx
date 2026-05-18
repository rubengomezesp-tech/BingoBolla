"use client";
import { useEffect, useState } from "react";

/* BingoBolla — HOME público  ·  src/app/page.tsx
   Estética: morado/oro glossy game-style (ref mockups) */

export default function Home() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(true), []);

  const ROOMS = [
    { n:"BINGO FIESTA", c:"#FF4D9A", players:75,  jp:"25,000" },
    { n:"BINGO 90",     c:"#3DE8FF", players:132, jp:"50,000" },
    { n:"POWER BINGO",  c:"#FFB323", players:54,  jp:"15,000" },
  ];
  const FEAT = [
    { i:"🎰", t:"Salas en vivo", d:"Bingo 90 en tiempo real con jugadores de todo el mundo." },
    { i:"🧩", t:"Minijuegos", d:"Ball Match, Neural Cascade y más retos para ganar." },
    { i:"🗺️", t:"Mundo Miami", d:"20 niveles de neón. Sube y desbloquea recompensas." },
    { i:"🎁", t:"Cofres diarios", d:"Premios gratis cada día. Sin comprar nada nunca." },
  ];

  return (
    <div className="bb">
      <div className="bb-bg" aria-hidden><i className="g1"/><i className="g2"/><i className="g3"/></div>

      <header className="nav">
        <a href="/" className="logo"><b>BINGO</b><em>BOLLA</em></a>
        <nav className="nlinks">
          <a href="#salas">Salas</a><a href="#feat">Juegos</a><a href="/mundos">Mundos</a>
        </nav>
        <a href="/login" className="btn ghost">Entrar</a>
      </header>

      <main className={`hero ${on?"on":""}`}>
        <span className="eye">★ SOCIAL BINGO · MIAMI NIGHTS ★</span>
        <h1>Bingo. Premios.<br/><span>Pura fiesta.</span></h1>
        <p className="sub">Salas en vivo, minijuegos arcade y un mundo de Miami Beach
          que se ilumina con cada victoria. Juega gratis, gana de verdad.</p>
        <div className="cta">
          <a href="/login" className="btn gold">JUGAR GRATIS →</a>
          <a href="/mundos" className="btn ghost">Ver mundos</a>
        </div>
        <div className="trust">
          <span>✓ Sin compra necesaria</span><span>✓ Sweepstakes legal</span><span>✓ +18</span>
        </div>
        <div className="balls" aria-hidden>
          {["B7","I22","N41","G58","O73"].map((b,i)=>
            <div key={b} className={`ball x${i}`}><span>{b}</span></div>)}
        </div>
      </main>

      <section id="salas" className="sec">
        <h2>Salas en vivo</h2>
        <div className="rooms">
          {ROOMS.map(r=>(
            <div key={r.n} className="room" style={{["--c" as string]:r.c}}>
              <span className="live">● LIVE</span>
              <h3>{r.n}</h3>
              <div className="rinfo">👤 {r.players} jugadores</div>
              <div className="jp">Premio mayor<br/><b>🪙 {r.jp}</b></div>
              <a href="/login" className="btn vio">JUGAR</a>
            </div>
          ))}
        </div>
      </section>

      <section id="feat" className="sec">
        <h2>Todo en un solo lugar</h2>
        <div className="feat">
          {FEAT.map(f=>(
            <div key={f.t} className="fcard">
              <div className="fico">{f.i}</div>
              <h3>{f.t}</h3><p>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="band">
        <h2>¿Listo para ganar?</h2>
        <p className="sub">Crea tu cuenta gratis y recibe monedas de bienvenida.</p>
        <a href="/login" className="btn gold lg">EMPEZAR AHORA →</a>
      </section>

      <footer className="foot">
        <a href="/" className="logo sm"><b>BINGO</b><em>BOLLA</em></a>
        <p className="legal">BingoBolla opera bajo un modelo de sweepstakes. No es necesario
          comprar para jugar ni ganar. Las Gold Coins no tienen valor monetario.
          Solo mayores de 18 años. Juega de forma responsable.</p>
        <p className="copy">© {new Date().getFullYear()} BingoBolla · Miami, FL</p>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Hanken+Grotesk:wght@400;500;600&display=swap');
        .bb{--bg1:#1B0A33;--bg2:#0C0418;--gold:#FFB323;--gold2:#FFD55E;
          --vio:#7B2FF7;--vio2:#A45BFF;--pink:#FF4D9A;--cyan:#3DE8FF;--live:#FF3B5C;
          --ink:#fff;--mut:rgba(255,255,255,.62);
          position:relative;min-height:100vh;background:var(--bg2);color:var(--ink);
          font-family:'Hanken Grotesk',sans-serif;overflow-x:hidden;}
        .bb *{box-sizing:border-box;margin:0;padding:0}.bb a{color:inherit;text-decoration:none}
        .bb-bg{position:fixed;inset:0;z-index:0;
          background:radial-gradient(130% 90% at 50% 0%,#3a1260 0%,#1B0A33 45%,var(--bg2) 80%)}
        .bb-bg i{position:absolute;border-radius:50%;filter:blur(80px);opacity:.4}
        .g1{width:480px;height:480px;background:var(--vio);top:-120px;left:-100px}
        .g2{width:420px;height:420px;background:var(--pink);top:30%;right:-140px;opacity:.28}
        .g3{width:520px;height:520px;background:#5a1a8a;bottom:-180px;left:30%;opacity:.3}
        .nav{position:relative;z-index:5;max-width:1180px;margin:0 auto;
          padding:24px 26px;display:flex;align-items:center;justify-content:space-between}
        .logo{font-family:'Fredoka',sans-serif;font-weight:700;font-size:26px;line-height:1}
        .logo b{color:#fff}.logo em{color:var(--gold);font-style:normal;
          text-shadow:0 0 16px rgba(255,179,35,.6)}
        .logo.sm{font-size:20px}
        .nlinks{display:flex;gap:28px;font-weight:500;font-size:14px}
        .nlinks a{color:var(--mut)}.nlinks a:hover{color:var(--gold)}
        .btn{display:inline-flex;align-items:center;gap:6px;padding:13px 26px;
          border-radius:14px;font-family:'Fredoka',sans-serif;font-weight:600;
          font-size:14px;cursor:pointer;transition:.2s}
        .btn.lg{padding:18px 38px;font-size:17px}
        .btn.gold{background:linear-gradient(180deg,var(--gold2),var(--gold));
          color:#3a1e00;box-shadow:0 8px 26px rgba(255,179,35,.45),
          inset 0 1px 0 rgba(255,255,255,.6)}
        .btn.gold:hover{transform:translateY(-2px);box-shadow:0 12px 34px rgba(255,179,35,.6)}
        .btn.vio{background:linear-gradient(180deg,var(--vio2),var(--vio));color:#fff;
          width:100%;justify-content:center;
          box-shadow:0 6px 20px rgba(123,47,247,.5),inset 0 1px 0 rgba(255,255,255,.3)}
        .btn.vio:hover{transform:translateY(-2px)}
        .btn.ghost{border:1.5px solid rgba(255,255,255,.2);color:#fff;
          background:rgba(255,255,255,.05)}
        .btn.ghost:hover{border-color:var(--gold);color:var(--gold)}
        .hero{position:relative;z-index:5;max-width:920px;margin:0 auto;
          padding:60px 26px 90px;text-align:center;opacity:0;transform:translateY(24px);
          transition:.9s}
        .hero.on{opacity:1;transform:none}
        .eye{font-family:'Fredoka',sans-serif;font-size:13px;font-weight:600;
          letter-spacing:2px;color:var(--gold)}
        .hero h1{font-family:'Fredoka',sans-serif;font-weight:700;
          font-size:clamp(40px,7vw,76px);line-height:1.05;margin:18px 0}
        .hero h1 span{color:var(--gold);text-shadow:0 0 28px rgba(255,179,35,.55)}
        .sub{max-width:560px;margin:0 auto;color:var(--mut);font-size:17px;line-height:1.6}
        .cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin:34px 0 22px}
        .trust{display:flex;gap:20px;justify-content:center;flex-wrap:wrap;
          font-size:13px;color:rgba(255,255,255,.45)}
        .balls{position:relative;height:90px;margin-top:30px}
        .ball{position:absolute;width:62px;height:62px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-family:'Fredoka',sans-serif;font-weight:700;font-size:15px;color:#3a1e00;
          background:radial-gradient(circle at 32% 28%,#fff,var(--gold2) 35%,var(--gold) 72%);
          box-shadow:0 12px 28px rgba(0,0,0,.5);animation:fl 5s ease-in-out infinite}
        .ball.x0{left:8%;top:10px}
        .ball.x1{left:28%;top:-10px;background:radial-gradient(circle at 32% 28%,#fff,#7af0ff 35%,var(--cyan) 72%);animation-delay:.6s}
        .ball.x2{left:48%;top:14px;background:radial-gradient(circle at 32% 28%,#fff,#ff9ccb 35%,var(--pink) 72%);animation-delay:1.2s}
        .ball.x3{left:68%;top:-6px;animation-delay:.9s}
        .ball.x4{left:86%;top:12px;background:radial-gradient(circle at 32% 28%,#fff,#c69bff 35%,var(--vio) 72%);animation-delay:1.5s}
        @keyframes fl{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
        .sec{position:relative;z-index:5;max-width:1080px;margin:0 auto;padding:60px 26px}
        .sec h2,.band h2{font-family:'Fredoka',sans-serif;font-weight:700;
          font-size:clamp(26px,4vw,40px);text-align:center;margin-bottom:40px}
        .rooms{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
        .room{position:relative;padding:26px 22px;border-radius:20px;text-align:center;
          background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02));
          border:1px solid rgba(255,255,255,.08);border-top:3px solid var(--c)}
        .live{position:absolute;top:14px;right:14px;font-size:10px;font-weight:700;
          color:#fff;background:var(--live);padding:3px 9px;border-radius:8px;
          letter-spacing:1px}
        .room h3{font-family:'Fredoka',sans-serif;font-size:24px;color:var(--c);
          margin:8px 0 14px;text-shadow:0 0 18px color-mix(in srgb,var(--c) 45%,transparent)}
        .rinfo{font-size:13px;color:var(--mut);margin-bottom:14px}
        .jp{font-size:13px;color:var(--mut);margin-bottom:18px;line-height:1.5}
        .jp b{font-family:'Fredoka',sans-serif;font-size:22px;color:var(--gold)}
        .feat{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
        .fcard{padding:28px 22px;border-radius:18px;background:rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.07);transition:.2s}
        .fcard:hover{transform:translateY(-5px);border-color:rgba(255,179,35,.3)}
        .fico{font-size:34px;margin-bottom:12px}
        .fcard h3{font-family:'Fredoka',sans-serif;font-size:18px;margin-bottom:8px}
        .fcard p{color:var(--mut);font-size:14px;line-height:1.55}
        .band{position:relative;z-index:5;max-width:760px;margin:30px auto;
          padding:60px 30px;text-align:center;border-radius:28px;
          background:radial-gradient(120% 140% at 50% 0%,rgba(255,179,35,.15),transparent 62%),
          rgba(255,255,255,.03);border:1px solid rgba(255,179,35,.3)}
        .band .sub{margin-bottom:30px}
        .foot{position:relative;z-index:5;max-width:1080px;margin:40px auto 0;
          padding:46px 26px 56px;border-top:1px solid rgba(255,255,255,.08);text-align:center}
        .legal{font-size:12px;line-height:1.7;color:rgba(255,255,255,.4);
          max-width:720px;margin:18px auto 14px}
        .copy{font-size:12px;color:rgba(255,255,255,.32)}
        @media(max-width:820px){.nlinks{display:none}
          .rooms,.feat{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}
