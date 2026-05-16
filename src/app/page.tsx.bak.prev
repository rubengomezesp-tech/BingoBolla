import Link from "next/link";

export default function Home() {
  return (
    <div className="ld-root">
      <style>{LD_CSS}</style>
      <div className="ld-bg" />
      <div className="ld-stars" aria-hidden>
        {Array.from({ length: 50 }).map((_, i) => (
          <span key={i} className="ld-star" style={{
            left: `${(i * 31) % 100}%`, top: `${(i * 43) % 100}%`,
            animationDelay: `${(i % 6) * 0.5}s`,
          }} />
        ))}
      </div>

      {/* ===== Nav ===== */}
      <nav className="ld-nav">
        <Link href="/" className="ld-logo">
          <span className="ld-logoB">BINGO</span><span className="ld-logoO">BOLLA</span>
        </Link>
        <div className="ld-navlinks">
          {["Home", "Games", "Live Rooms", "Promotions", "Bolla Pass", "Winners", "Community", "Support"].map((l) => (
            <a key={l} href="#" className="ld-navlink">{l}</a>
          ))}
        </div>
        <div className="ld-navcta">
          <Link href="/login" className="ld-login">Log in</Link>
          <Link href="/signup" className="ld-signup">Sign up</Link>
        </div>
      </nav>

      {/* ===== Stat bar ===== */}
      <div className="ld-statbar">
        <div className="ld-sb"><span className="ld-sbDot" /><b>24,532</b> JUGADORES ONLINE</div>
        <div className="ld-sb">🏆 <b>$48,290</b> GANADO ESTA SEMANA</div>
        <div className="ld-sb">⚡ SALAS EN VIVO <b>CADA MINUTO</b></div>
        <div className="ld-sb">🇺🇸 DISPONIBLE EN <b>45 ESTADOS</b></div>
      </div>

      {/* ===== Hero ===== */}
      <section className="ld-hero">
        <div className="ld-heroL">
          <div className="ld-crown">👑</div>
          <h1 className="ld-h1">
            <span className="ld-h1w">LA NUEVA</span>
            <span className="ld-h1w">OBSESIÓN DEL</span>
            <span className="ld-h1accent">BINGO</span>
          </h1>
          <p className="ld-sub">
            Bingo en vivo. Jugadores reales. Premios enormes.
            La nueva generación del juego social está aquí.
            <strong> ¡Únete al movimiento!</strong>
          </p>
          <div className="ld-cta">
            <Link href="/signup" className="ld-ctaMain">
              EMPIEZA GRATIS <span className="ld-ctaArrow">→</span>
            </Link>
            <Link href="/login" className="ld-ctaGhost">▶ VER SALAS EN VIVO</Link>
          </div>
          <div className="ld-trust">
            <span className="ld-tb">🛡️ 18+ Verificado</span>
            <span className="ld-tb">🔒 100% Legal</span>
            <span className="ld-tb">✓ Seguro</span>
            <span className="ld-tb ld-tbPay">💳 Pagos vía PayPal</span>
          </div>
        </div>

        <div className="ld-heroR">
          {/* Floating 3D balls */}
          <div className="ld-ball ld-ball1">90</div>
          <div className="ld-ball ld-ball2">33</div>
          <div className="ld-ball ld-ball3">12</div>
          <div className="ld-ball ld-ball4">7</div>
          <div className="ld-bingoText">¡BINGO!</div>

          {/* Live chat card */}
          <div className="ld-chatcard">
            <div className="ld-ccHd">
              <span>LIVE CHAT</span><span className="ld-ccOnline">● 234</span>
            </div>
            <div className="ld-ccMsg"><span className="ld-ccAv">L</span><div><b>Lucky77</b> ¡Vamos! 🔥</div></div>
            <div className="ld-ccMsg"><span className="ld-ccAv">B</span><div><b>BingoQueen</b> ¡Buena! 💜</div></div>
            <div className="ld-ccMsg"><span className="ld-ccAv">S</span><div><b>BingoStar</b> Esta sala arde! 🙌</div></div>
            <div className="ld-ccMsg"><span className="ld-ccAv">K</span><div><b>KingBolla</b> ¡Una más! 🎉</div></div>
            <div className="ld-ccInput"><span>Di algo...</span><span className="ld-ccSend">→</span></div>
          </div>
        </div>
      </section>

      {/* ===== Big stats ===== */}
      <section className="ld-bigstats">
        <div className="ld-bs"><div className="ld-bsV">2M+</div><div className="ld-bsL">PARTIDAS JUGADAS</div></div>
        <div className="ld-bs"><div className="ld-bsV">150K+</div><div className="ld-bsL">GANADORES DIARIOS</div></div>
        <div className="ld-bs"><div className="ld-bsV">1000+</div><div className="ld-bsL">SALAS EN VIVO</div></div>
        <div className="ld-bs"><div className="ld-bsV">$10M+</div><div className="ld-bsL">PAGADO</div></div>
        <div className="ld-jackpot">
          <div className="ld-jpL">🔥 HOT JACKPOT</div>
          <div className="ld-jpV">$250,000</div>
          <Link href="/signup" className="ld-jpBtn">JUGAR PARA GANAR</Link>
        </div>
      </section>

      {/* ===== Games ===== */}
      <section className="ld-games">
        <h2 className="ld-secTitle">👑 EXPLORA NUESTROS JUEGOS</h2>
        <div className="ld-gameGrid">
          <GameCard emoji="🎱" name="LIVE BINGO" players="8,432" c="#9a4ad0" />
          <GameCard emoji="⚔️" name="BINGO BATTLE" players="3,219" c="#3d7aff" />
          <GameCard emoji="🎡" name="LUCKY WHEEL" players="5,887" c="#ffb02e" />
          <GameCard emoji="🎟️" name="SCRATCH & WIN" players="4,102" c="#3ddc6a" />
          <GameCard emoji="💎" name="DAILY PUZZLES" players="2,943" c="#ff4d9a" />
          <div className="ld-event">
            <div className="ld-evNew">¡NUEVO EVENTO!</div>
            <div className="ld-evName">BOLLA BASH</div>
            <div className="ld-evBadge">B</div>
            <div className="ld-evTimer">
              <div className="ld-evT"><b>02</b><span>DÍAS</span></div>
              <div className="ld-evT"><b>16</b><span>HRS</span></div>
              <div className="ld-evT"><b>48</b><span>MIN</span></div>
              <div className="ld-evT"><b>53</b><span>SEG</span></div>
            </div>
            <Link href="/signup" className="ld-evBtn">UNIRME AHORA</Link>
          </div>
        </div>
      </section>

      {/* ===== Features ===== */}
      <section className="ld-features">
        <Feature icon="👥" title="JUEGA EN GRUPO" desc="Miles de jugadores en tiempo real." />
        <Feature icon="🎁" title="GANA PREMIOS" desc="Premios en efectivo, bonos y coleccionables." />
        <Feature icon="⭐" title="SUBE DE NIVEL" desc="Completa misiones y desbloquea ventajas." />
        <Feature icon="🏆" title="SÉ EL MEJOR" desc="Escala el ranking y vuélvete leyenda." />
      </section>

      {/* ===== Community ===== */}
      <section className="ld-community">
        <div className="ld-commL">
          <h2 className="ld-commTitle">COMUNIDAD REAL.<br /><span className="ld-commGold">CONEXIONES REALES.</span></h2>
          <p className="ld-commP">Chatea, haz amigos, únete a escuadrones y disfruta el bingo como nunca.</p>
          <Link href="/signup" className="ld-commBtn">ÚNETE A LA COMUNIDAD 👥</Link>
        </div>
        <div className="ld-testimonial">
          <div className="ld-stars">★★★★★</div>
          <p className="ld-tQuote">"BingoBolla no es solo un juego, ¡es todo un vibe!"</p>
          <div className="ld-tWho">— Jessica M.</div>
        </div>
      </section>

      {/* ===== As seen on ===== */}
      <section className="ld-seen">
        <span className="ld-seenL">VISTO EN</span>
        <span className="ld-seenName">Yahoo!</span>
        <span className="ld-seenName">USA Today</span>
        <span className="ld-seenName">Forbes</span>
        <span className="ld-seenName">FOX</span>
        <span className="ld-seenName">MarketWatch</span>
      </section>

      {/* ===== Footer ===== */}
      <footer className="ld-footer">
        <div className="ld-fItem">🛡️ <div><b>Pagos seguros</b><span>Rápido y confiable</span></div></div>
        <div className="ld-fItem">🎧 <div><b>Soporte 24/7</b><span>Siempre aquí</span></div></div>
        <div className="ld-fLogo">B</div>
        <div className="ld-fItem">📱 <div><b>Móvil y escritorio</b><span>Juega donde sea</span></div></div>
        <div className="ld-fItem">🎲 <div><b>RNG certificado</b><span>Justo y transparente</span></div></div>
      </footer>
      <div className="ld-legal">
        BingoBolla · Modelo sweepstakes 100% legal · 18+ · Juego responsable ·
        No compra necesaria · Donamos 1% a Cure Alzheimer's Fund
      </div>
    </div>
  );
}

function GameCard({ emoji, name, players, c }: { emoji: string; name: string; players: string; c: string }) {
  return (
    <Link href="/signup" className="ld-gc" style={{ "--gc": c } as any}>
      <div className="ld-gcArt">{emoji}</div>
      <div className="ld-gcName">{name}</div>
      <div className="ld-gcPlayers">🟢 {players}</div>
    </Link>
  );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="ld-feat">
      <div className="ld-featIc">{icon}</div>
      <div className="ld-featT">{title}</div>
      <div className="ld-featD">{desc}</div>
    </div>
  );
}

const LD_CSS = `
.ld-root{position:relative;min-height:100vh;overflow-x:hidden;color:#fff;
  font-family:'Fredoka',ui-rounded,system-ui,sans-serif;
  background:#0a0418;}
.ld-bg{position:fixed;inset:0;pointer-events:none;
  background:
    radial-gradient(60% 50% at 25% 15%,rgba(150,60,220,.35),transparent),
    radial-gradient(50% 45% at 80% 20%,rgba(255,60,160,.28),transparent),
    radial-gradient(55% 50% at 50% 90%,rgba(255,170,40,.15),transparent),
    linear-gradient(180deg,#1a0a3e 0%,#12062e 40%,#0a0418 100%);}
.ld-stars{position:fixed;inset:0;pointer-events:none;}
.ld-star{position:absolute;width:2px;height:2px;border-radius:50%;background:#fff;
  opacity:.4;animation:ldTw 4s infinite;}
@keyframes ldTw{0%,100%{opacity:.15}50%{opacity:.85}}

.ld-nav{position:relative;z-index:20;display:flex;align-items:center;
  justify-content:space-between;padding:18px 28px;max-width:1280px;margin:0 auto;
  flex-wrap:wrap;gap:14px;}
.ld-logo{text-decoration:none;font-weight:800;font-size:26px;line-height:.85;
  display:flex;flex-direction:column;}
.ld-logoB{background:linear-gradient(180deg,#fff,#e8d0ff);
  -webkit-background-clip:text;background-clip:text;color:transparent;}
.ld-logoO{background:linear-gradient(180deg,#ffe07a,#e0901a);
  -webkit-background-clip:text;background-clip:text;color:transparent;}
.ld-navlinks{display:flex;gap:4px;flex-wrap:wrap;}
.ld-navlink{text-decoration:none;color:#c7a8e8;font-size:14px;font-weight:600;
  padding:8px 13px;border-radius:9px;transition:all .15s;}
.ld-navlink:hover{color:#fff;background:rgba(255,255,255,.06);}
.ld-navcta{display:flex;align-items:center;gap:10px;}
.ld-login{text-decoration:none;color:#fff;font-weight:700;font-size:14px;
  padding:9px 18px;border-radius:12px;border:1px solid rgba(255,255,255,.2);}
.ld-signup{text-decoration:none;color:#fff;font-weight:800;font-size:14px;
  padding:10px 22px;border-radius:12px;
  background:linear-gradient(135deg,#ff4d9a,#c8264f);
  box-shadow:0 6px 20px rgba(255,80,160,.5);}

.ld-statbar{position:relative;z-index:10;display:flex;flex-wrap:wrap;
  justify-content:center;gap:8px 28px;padding:12px 20px;max-width:1280px;
  margin:0 auto;border-top:1px solid rgba(170,120,255,.15);
  border-bottom:1px solid rgba(170,120,255,.15);font-size:12px;color:#b9a0e0;}
.ld-sb{display:flex;align-items:center;gap:6px;}
.ld-sb b{color:#fff;font-weight:800;}
.ld-sbDot{width:8px;height:8px;border-radius:50%;background:#3ddc6a;
  box-shadow:0 0 8px #3ddc6a;animation:ldTw 1.5s infinite;}

.ld-hero{position:relative;z-index:10;display:grid;
  grid-template-columns:1fr;gap:30px;max-width:1280px;margin:0 auto;
  padding:40px 28px 50px;}
.ld-crown{font-size:46px;filter:drop-shadow(0 4px 10px rgba(255,180,40,.6));
  margin-bottom:-6px;animation:ldBob 3s ease-in-out infinite;}
@keyframes ldBob{0%,100%{transform:translateY(0) rotate(-5deg)}
  50%{transform:translateY(-8px) rotate(5deg)}}
.ld-h1{font-weight:800;line-height:.92;margin-bottom:18px;}
.ld-h1w{display:block;font-size:clamp(40px,9vw,76px);
  color:#fff;text-shadow:0 4px 16px rgba(0,0,0,.5);letter-spacing:-1px;}
.ld-h1accent{display:block;font-size:clamp(46px,11vw,92px);
  font-style:italic;letter-spacing:-1px;
  background:linear-gradient(120deg,#ff4d9a,#ff8a3d 40%,#ffd23d);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 4px 14px rgba(255,120,60,.5));}
.ld-sub{font-size:17px;color:#d8c8f0;line-height:1.5;max-width:440px;
  margin-bottom:24px;}
.ld-sub strong{color:#ffd23d;}
.ld-cta{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;}
.ld-ctaMain{text-decoration:none;display:flex;align-items:center;gap:10px;
  padding:16px 30px;border-radius:40px;font-weight:800;font-size:17px;color:#fff;
  background:linear-gradient(135deg,#ff4d9a,#c8264f);
  box-shadow:0 8px 28px rgba(255,80,160,.55),inset 0 1px 0 rgba(255,255,255,.3);
  transition:transform .15s;}
.ld-ctaMain:hover{transform:translateY(-3px);}
.ld-ctaArrow{display:inline-flex;width:24px;height:24px;border-radius:50%;
  background:rgba(255,255,255,.25);align-items:center;justify-content:center;
  font-size:14px;}
.ld-ctaGhost{text-decoration:none;display:flex;align-items:center;
  padding:16px 26px;border-radius:40px;font-weight:700;font-size:15px;color:#fff;
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);}
.ld-trust{display:flex;flex-wrap:wrap;gap:10px;}
.ld-tb{font-size:12px;color:#b9a0e0;background:rgba(255,255,255,.05);
  padding:7px 13px;border-radius:9px;border:1px solid rgba(170,120,255,.18);}
.ld-tbPay{color:#5ab0ff;}

.ld-heroR{position:relative;min-height:340px;}
.ld-ball{position:absolute;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-weight:800;color:#fff;
  box-shadow:0 12px 30px rgba(0,0,0,.5),inset 0 -6px 14px rgba(0,0,0,.3),
  inset 0 6px 12px rgba(255,255,255,.25);animation:ldFloat 5s ease-in-out infinite;}
.ld-ball1{width:120px;height:120px;font-size:42px;left:28%;top:0;
  background:radial-gradient(circle at 35% 28%,#c98aff,#7a2ad0 60%,#4a1a8a);}
.ld-ball2{width:84px;height:84px;font-size:30px;right:8%;top:120px;
  background:radial-gradient(circle at 35% 28%,#ff9de0,#e0344f 60%,#a01030);
  animation-delay:.6s;}
.ld-ball3{width:78px;height:78px;font-size:28px;left:14%;top:170px;
  background:radial-gradient(circle at 35% 28%,#8ab8ff,#2a5ad0 60%,#1a3a8a);
  animation-delay:1.1s;}
.ld-ball4{width:70px;height:70px;font-size:26px;right:24%;top:255px;
  background:radial-gradient(circle at 35% 28%,#ffd98a,#e0a01a 60%,#a06010);
  animation-delay:1.6s;}
@keyframes ldFloat{0%,100%{transform:translateY(0) rotate(-6deg)}
  50%{transform:translateY(-18px) rotate(6deg)}}
.ld-bingoText{position:absolute;right:0;top:30px;font-weight:800;font-size:34px;
  font-style:italic;color:#ff4d9a;text-shadow:0 0 20px rgba(255,80,160,.7);
  transform:rotate(-8deg);animation:ldTw 2s infinite;}
.ld-chatcard{position:absolute;right:0;bottom:0;width:220px;
  border-radius:16px;padding:12px;
  background:linear-gradient(180deg,rgba(28,14,56,.95),rgba(16,8,36,.97));
  border:1px solid rgba(170,120,255,.3);backdrop-filter:blur(10px);
  box-shadow:0 12px 30px rgba(0,0,0,.5);}
.ld-ccHd{display:flex;justify-content:space-between;font-size:11px;
  font-weight:800;color:#c7a8e8;margin-bottom:9px;}
.ld-ccOnline{color:#3ddc6a;}
.ld-ccMsg{display:flex;gap:7px;align-items:center;font-size:11px;
  color:#e8d8f0;margin-bottom:7px;}
.ld-ccMsg b{color:#ff8ad0;}
.ld-ccAv{width:20px;height:20px;border-radius:50%;flex-shrink:0;
  background:linear-gradient(135deg,#7a3ad0,#ff5a8a);display:flex;
  align-items:center;justify-content:center;font-size:10px;font-weight:800;}
.ld-ccInput{display:flex;justify-content:space-between;align-items:center;
  margin-top:9px;padding:7px 10px;border-radius:10px;background:rgba(0,0,0,.3);
  font-size:11px;color:#7a6ba8;}
.ld-ccSend{width:20px;height:20px;border-radius:50%;
  background:linear-gradient(135deg,#ff4d9a,#c8264f);display:flex;
  align-items:center;justify-content:center;color:#fff;font-weight:800;}

.ld-bigstats{position:relative;z-index:10;display:flex;flex-wrap:wrap;
  gap:12px;max-width:1280px;margin:0 auto;padding:0 28px 40px;
  align-items:stretch;}
.ld-bs{flex:1;min-width:130px;border-radius:14px;padding:16px;text-align:center;
  background:linear-gradient(180deg,rgba(40,22,75,.7),rgba(22,12,46,.8));
  border:1px solid rgba(170,120,255,.2);}
.ld-bsV{font-weight:800;font-size:26px;
  background:linear-gradient(180deg,#fff,#ffd23d);-webkit-background-clip:text;
  background-clip:text;color:transparent;}
.ld-bsL{font-size:10px;letter-spacing:.06em;color:#b9a0e0;margin-top:4px;}
.ld-jackpot{flex:1.4;min-width:220px;border-radius:16px;padding:16px 22px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:linear-gradient(135deg,#5a3a08,#3a1a6e);
  border:1px solid rgba(255,200,80,.4);
  box-shadow:0 0 30px rgba(255,170,40,.2);}
.ld-jpL{font-size:12px;letter-spacing:.1em;color:#ffd8a0;font-weight:700;}
.ld-jpV{font-weight:800;font-size:38px;color:#ffd23d;
  text-shadow:0 0 22px rgba(255,200,60,.6);margin:4px 0 10px;}
.ld-jpBtn{text-decoration:none;padding:10px 22px;border-radius:10px;
  font-weight:800;font-size:13px;color:#3a1a00;
  background:linear-gradient(180deg,#ffd23d,#e0901a);}

.ld-games{position:relative;z-index:10;max-width:1280px;margin:0 auto;
  padding:20px 28px 40px;}
.ld-secTitle{font-weight:800;font-size:24px;margin-bottom:20px;}
.ld-gameGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
  gap:14px;}
.ld-gc{text-decoration:none;border-radius:18px;padding:18px;text-align:center;
  background:linear-gradient(180deg,rgba(40,22,75,.8),rgba(20,10,40,.9));
  border:1px solid rgba(170,120,255,.2);transition:transform .2s,box-shadow .2s;
  display:block;}
.ld-gc:hover{transform:translateY(-6px);
  box-shadow:0 16px 36px rgba(0,0,0,.5),0 0 24px var(--gc);}
.ld-gcArt{height:90px;border-radius:14px;display:flex;align-items:center;
  justify-content:center;font-size:48px;margin-bottom:12px;
  background:radial-gradient(circle,color-mix(in srgb,var(--gc) 30%,transparent),
  rgba(0,0,0,.3));}
.ld-gcName{font-weight:800;font-size:15px;}
.ld-gcPlayers{font-size:11px;color:#9ddc9a;margin-top:6px;}
.ld-event{grid-column:span 1;border-radius:18px;padding:18px;text-align:center;
  background:linear-gradient(165deg,#7a1a5a,#3a0e6e);
  border:1px solid rgba(255,120,200,.4);
  box-shadow:0 0 26px rgba(255,80,180,.25);
  display:flex;flex-direction:column;align-items:center;gap:8px;}
.ld-evNew{font-size:11px;font-weight:800;color:#ffd23d;letter-spacing:.06em;}
.ld-evName{font-weight:800;font-size:20px;
  background:linear-gradient(180deg,#ffe07a,#e0901a);-webkit-background-clip:text;
  background-clip:text;color:transparent;}
.ld-evBadge{width:52px;height:52px;border-radius:50%;
  background:radial-gradient(circle at 35% 30%,#ff7ad0,#7a2ad0);display:flex;
  align-items:center;justify-content:center;font-weight:800;font-size:24px;
  box-shadow:0 0 22px rgba(255,120,220,.6);}
.ld-evTimer{display:flex;gap:6px;}
.ld-evT{background:rgba(0,0,0,.3);border-radius:8px;padding:6px 8px;min-width:38px;}
.ld-evT b{display:block;font-size:16px;font-weight:800;}
.ld-evT span{font-size:8px;color:#c7a8e8;}
.ld-evBtn{text-decoration:none;padding:9px 20px;border-radius:10px;
  font-weight:800;font-size:13px;color:#fff;
  background:linear-gradient(135deg,#ff4d9a,#c8264f);}

.ld-features{position:relative;z-index:10;display:grid;
  grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;
  max-width:1280px;margin:0 auto;padding:0 28px 40px;}
.ld-feat{border-radius:14px;padding:18px;text-align:center;
  background:linear-gradient(180deg,rgba(40,22,75,.6),rgba(22,12,46,.7));
  border:1px solid rgba(170,120,255,.18);}
.ld-featIc{font-size:32px;margin-bottom:8px;}
.ld-featT{font-weight:800;font-size:15px;}
.ld-featD{font-size:12px;color:#b9a0e0;margin-top:5px;line-height:1.4;}

.ld-community{position:relative;z-index:10;display:grid;
  grid-template-columns:1fr;gap:20px;max-width:1280px;margin:0 auto;
  padding:0 28px 40px;}
.ld-commTitle{font-weight:800;font-size:30px;line-height:1.1;}
.ld-commGold{background:linear-gradient(180deg,#ffe07a,#e0901a);
  -webkit-background-clip:text;background-clip:text;color:transparent;}
.ld-commP{font-size:15px;color:#d8c8f0;margin:14px 0 18px;}
.ld-commBtn{text-decoration:none;display:inline-block;padding:13px 26px;
  border-radius:30px;font-weight:800;font-size:14px;color:#fff;
  background:linear-gradient(135deg,#9a4ad0,#6a2aa8);}
.ld-testimonial{border-radius:18px;padding:24px;
  background:linear-gradient(135deg,rgba(60,32,110,.7),rgba(28,14,56,.8));
  border:1px solid rgba(255,200,80,.25);}
.ld-stars{color:#ffd23d;font-size:20px;letter-spacing:3px;}
.ld-tQuote{font-size:18px;font-weight:600;margin:12px 0;line-height:1.4;}
.ld-tWho{font-size:13px;color:#b9a0e0;}

.ld-seen{position:relative;z-index:10;display:flex;flex-wrap:wrap;
  align-items:center;justify-content:center;gap:14px 30px;max-width:1280px;
  margin:0 auto;padding:24px 28px;border-top:1px solid rgba(170,120,255,.15);
  border-bottom:1px solid rgba(170,120,255,.15);}
.ld-seenL{font-size:11px;letter-spacing:.15em;color:#9a7ac8;}
.ld-seenName{font-size:18px;font-weight:800;color:#8a6cb8;font-style:italic;}

.ld-footer{position:relative;z-index:10;display:flex;flex-wrap:wrap;
  align-items:center;justify-content:center;gap:18px 36px;max-width:1280px;
  margin:0 auto;padding:30px 28px 16px;}
.ld-fItem{display:flex;align-items:center;gap:10px;font-size:13px;}
.ld-fItem b{display:block;font-weight:700;}
.ld-fItem span{font-size:11px;color:#9a7ac8;}
.ld-fLogo{width:48px;height:48px;border-radius:50%;
  background:radial-gradient(circle at 35% 30%,#ff7ad0,#7a2ad0);display:flex;
  align-items:center;justify-content:center;font-weight:800;font-size:22px;
  box-shadow:0 0 20px rgba(255,120,220,.5);}
.ld-legal{position:relative;z-index:10;text-align:center;font-size:11px;
  color:#7a6ba8;padding:16px 28px 30px;max-width:760px;margin:0 auto;
  line-height:1.6;}

@media(min-width:900px){
  .ld-hero{grid-template-columns:1.1fr 1fr;align-items:center;
    padding:50px 28px 60px;}
  .ld-heroR{min-height:440px;}
  .ld-ball1{width:150px;height:150px;font-size:52px;}
  .ld-community{grid-template-columns:1.2fr 1fr;align-items:center;}
  .ld-h1w{font-size:72px;}
  .ld-h1accent{font-size:88px;}
}
`;
