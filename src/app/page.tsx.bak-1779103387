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

      <nav className="ld-nav">
        <Link href="/" className="ld-logo">
          <span className="ld-logoB">BINGO</span><span className="ld-logoO">BOLLA</span>
        </Link>
        <div className="ld-navlinks">
          {["Inicio", "Juegos", "Salas en vivo", "Cómo funciona", "Comunidad", "Soporte"].map((l) => (
            <a key={l} href="#" className="ld-navlink">{l}</a>
          ))}
        </div>
        <div className="ld-navcta">
          <Link href="/login" className="ld-login">Entrar</Link>
          <Link href="/signup" className="ld-signup">Registrarse</Link>
        </div>
      </nav>

      <div className="ld-statbar">
        <div className="ld-sb">🎁 <b>5.000 Gold + 5 Sweeps</b> GRATIS al registro</div>
        <div className="ld-sb">🇺🇸 Modelo sweepstakes <b>100% legal</b></div>
        <div className="ld-sb">💚 Donamos <b>1%</b> a investigación del Alzheimer</div>
        <div className="ld-sb">💳 Pagos vía <b>PayPal</b></div>
      </div>

      <section className="ld-hero">
        <div className="ld-heroL">
          <div className="ld-crown">👑</div>
          <h1 className="ld-h1">
            <span className="ld-h1w">LA NUEVA</span>
            <span className="ld-h1w">OBSESIÓN DEL</span>
            <span className="ld-h1accent">BINGO</span>
          </h1>
          <p className="ld-sub">
            Bingo en vivo de verdad. Sube de nivel, gana premios y descubre
            un mundo de juego que <strong>crece cada semana</strong>.
            Gratis, legal y con corazón.
          </p>
          <div className="ld-cta">
            <Link href="/signup" className="ld-ctaMain">
              REGÍSTRATE GRATIS <span className="ld-ctaArrow">→</span>
            </Link>
            <Link href="/login" className="ld-ctaGhost">▶ VER SALAS</Link>
          </div>
          <div className="ld-trust">
            <span className="ld-tb">🛡️ 18+ Verificado</span>
            <span className="ld-tb">🔒 100% Legal</span>
            <span className="ld-tb">✓ No compra necesaria</span>
            <span className="ld-tb ld-tbPay">💳 PayPal</span>
          </div>
        </div>

        <div className="ld-heroR">
          <div className="ld-ball ld-ball1">90</div>
          <div className="ld-ball ld-ball2">33</div>
          <div className="ld-ball ld-ball3">12</div>
          <div className="ld-ball ld-ball4">7</div>
          <div className="ld-bingoText">¡BINGO!</div>

          <div className="ld-chatcard">
            <div className="ld-ccHd">
              <span>CHAT EN VIVO</span><span className="ld-ccOnline">● en sala</span>
            </div>
            <div className="ld-ccMsg"><span className="ld-ccAv">L</span><div><b>Lucky77</b> ¡Vamos! 🔥</div></div>
            <div className="ld-ccMsg"><span className="ld-ccAv">B</span><div><b>BingoQueen</b> ¡Buena! 💜</div></div>
            <div className="ld-ccMsg"><span className="ld-ccAv">S</span><div><b>BingoStar</b> Esta sala arde! 🙌</div></div>
            <div className="ld-ccMsg"><span className="ld-ccAv">K</span><div><b>KingBolla</b> ¡Una más! 🎉</div></div>
            <div className="ld-ccInput"><span>Únete y saluda...</span><span className="ld-ccSend">→</span></div>
          </div>
        </div>
      </section>

      <section className="ld-welcome">
        <div className="ld-wcGlow" />
        <div className="ld-wcInner">
          <div className="ld-wcBadge">🎁 REGALO DE BIENVENIDA</div>
          <div className="ld-wcMain">
            <span className="ld-wcGold">5.000</span> Gold Coins
            <span className="ld-wcPlus">+</span>
            <span className="ld-wcSweeps">5</span> Sweeps Coins
          </div>
          <div className="ld-wcSub">Gratis al crear tu cuenta · Sin compra necesaria · Empieza a jugar al instante</div>
          <Link href="/signup" className="ld-wcBtn">RECLAMAR MI REGALO →</Link>
        </div>
      </section>

      <section className="ld-pillars">
        <div className="ld-pil"><div className="ld-pilIc">🎮</div><div className="ld-pilT">Gratis para jugar</div><div className="ld-pilD">Coins de bienvenida y sin compra obligatoria, nunca.</div></div>
        <div className="ld-pil"><div className="ld-pilIc">⚖️</div><div className="ld-pilT">Modelo legal</div><div className="ld-pilD">Sweepstakes conforme a la ley de EE.UU.</div></div>
        <div className="ld-pil"><div className="ld-pilIc">🔍</div><div className="ld-pilT">Juego transparente</div><div className="ld-pilD">RNG verificable y reglas claras.</div></div>
        <div className="ld-pil"><div className="ld-pilIc">💚</div><div className="ld-pilT">Con propósito</div><div className="ld-pilD">1% de ingresos al Cure Alzheimer's Fund.</div></div>
      </section>

      <section className="ld-world">
        <div className="ld-worldHd">
          <h2 className="ld-secTitle">🌍 MÁS QUE BINGO</h2>
          <p className="ld-worldSub">El bingo es el corazón. Alrededor construimos un mundo que crece cada semana: niveles, energía, misiones y minijuegos.</p>
        </div>

        <div className="ld-levelcard">
          <div className="ld-lvTop">
            <div className="ld-lvBadge">★</div>
            <div className="ld-lvInfo">
              <div className="ld-lvName">Sistema de niveles</div>
              <div className="ld-lvDesc">Gana EXP jugando bingo, ganando premios y entrando cada día</div>
            </div>
            <div className="ld-lvSoon">PRÓXIMAMENTE</div>
          </div>
          <div className="ld-xpbar"><div className="ld-xpfill" /></div>
          <div className="ld-xpLabels"><span>Nivel 1</span><span>Sube ganando</span><span>Nivel 2</span></div>
        </div>

        <div className="ld-worldGrid">
          <WorldCard emoji="🎱" name="Bingo en vivo" tag="⭐ Disponible ya" desc="Salas 75 y 90 bolas, premios reales, chat en vivo." c="#9a4ad0" live />
          <WorldCard emoji="🎰" name="Slots" tag="⭐ Disponible ya" desc="Tragamonedas Hold & Win con jackpots." c="#ff4d9a" live />
          <WorldCard emoji="⚡" name="Energía y misiones" tag="Próximamente" desc="Completa retos diarios y gana recompensas." c="#ffb02e" />
          <WorldCard emoji="🎡" name="Lucky Wheel" tag="Próximamente" desc="Gira la rueda de la suerte cada día." c="#3ddc6a" />
          <WorldCard emoji="🎟️" name="Rasca y gana" tag="Próximamente" desc="Cartones de rasca con premios al instante." c="#3d7aff" />
          <WorldCard emoji="💎" name="Minijuegos" tag="Próximamente" desc="Puzzles y retos para ganar EXP y coins." c="#c8264f" />
        </div>
        <div className="ld-buildNote">🔨 Construimos algo nuevo cada semana — únete y crece con la plataforma desde el día uno.</div>
      </section>

      <section className="ld-cause">
        <div className="ld-causeHeart">💚</div>
        <h2 className="ld-causeTitle">Jugamos con propósito</h2>
        <p className="ld-causeP">
          Desde el primer día, <strong>el 1% de nuestros ingresos</strong> se dona al
          <strong> Cure Alzheimer's Fund</strong> — una organización con 4 estrellas en Charity Navigator
          que financia investigación para acabar con el Alzheimer.
          Cada partida que juegas aporta a la causa.
        </p>
        <div className="ld-causeBadge">★★★★ Charity Navigator · Cure Alzheimer's Fund</div>
      </section>

      <section className="ld-features">
        <Feature icon="👥" title="Juega en grupo" desc="Salas en vivo con jugadores reales." />
        <Feature icon="🎁" title="Recompensas" desc="Premios, bonos y coins ganables." />
        <Feature icon="⭐" title="Sube de nivel" desc="Gana EXP y desbloquea contenido." />
        <Feature icon="🏆" title="Sé el mejor" desc="Escala el ranking de la comunidad." />
      </section>

      <section className="ld-community">
        <div className="ld-commL">
          <h2 className="ld-commTitle">UNA COMUNIDAD<br /><span className="ld-commGold">QUE CRECE CONTIGO</span></h2>
          <p className="ld-commP">Sé de los primeros. La plataforma se construye día a día y tú creces con ella desde el principio.</p>
          <Link href="/signup" className="ld-commBtn">ÚNETE AHORA 👥</Link>
        </div>
        <div className="ld-testimonial">
          <div className="ld-tIcon">🚀</div>
          <p className="ld-tQuote">Bingo de verdad + un mundo de juego que no para de crecer.</p>
          <div className="ld-tWho">— El equipo de BingoBolla</div>
        </div>
      </section>

      <footer className="ld-footer">
        <div className="ld-fItem">🛡️ <div><b>Pagos seguros</b><span>Vía PayPal</span></div></div>
        <div className="ld-fItem">🎧 <div><b>Soporte</b><span>Estamos aquí</span></div></div>
        <div className="ld-fLogo">B</div>
        <div className="ld-fItem">📱 <div><b>Móvil y escritorio</b><span>Juega donde sea</span></div></div>
        <div className="ld-fItem">🎲 <div><b>RNG transparente</b><span>Justo y verificable</span></div></div>
      </footer>
      <div className="ld-legal">
        BingoBolla · Modelo sweepstakes · 18+ · Juego responsable ·
        No compra necesaria · Donamos 1% de ingresos al Cure Alzheimer's Fund ·
        Disponibilidad sujeta a estado de residencia
      </div>
    </div>
  );
}

function WorldCard({ emoji, name, tag, desc, c, live }: { emoji: string; name: string; tag: string; desc: string; c: string; live?: boolean }) {
  return (
    <Link href="/signup" className={`ld-wld ${live ? "ld-wldLive" : ""}`} style={{ "--wc": c } as any}>
      <div className="ld-wldArt">{emoji}</div>
      <div className="ld-wldName">{name}</div>
      <div className={`ld-wldTag ${live ? "ld-wldTagLive" : ""}`}>{tag}</div>
      <div className="ld-wldDesc">{desc}</div>
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
  font-family:'Fredoka',ui-rounded,system-ui,sans-serif;background:#0a0418;}
.ld-bg{position:fixed;inset:0;pointer-events:none;
  background:radial-gradient(60% 50% at 25% 15%,rgba(150,60,220,.35),transparent),
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
  justify-content:center;gap:8px 24px;padding:12px 20px;max-width:1280px;
  margin:0 auto;border-top:1px solid rgba(170,120,255,.15);
  border-bottom:1px solid rgba(170,120,255,.15);font-size:12px;color:#b9a0e0;}
.ld-sb{display:flex;align-items:center;gap:6px;}
.ld-sb b{color:#fff;font-weight:800;}
.ld-hero{position:relative;z-index:10;display:grid;grid-template-columns:1fr;
  gap:30px;max-width:1280px;margin:0 auto;padding:40px 28px 40px;}
.ld-crown{font-size:46px;filter:drop-shadow(0 4px 10px rgba(255,180,40,.6));
  margin-bottom:-6px;animation:ldBob 3s ease-in-out infinite;}
@keyframes ldBob{0%,100%{transform:translateY(0) rotate(-5deg)}
  50%{transform:translateY(-8px) rotate(5deg)}}
.ld-h1{font-weight:800;line-height:.92;margin-bottom:18px;}
.ld-h1w{display:block;font-size:clamp(40px,9vw,76px);color:#fff;
  text-shadow:0 4px 16px rgba(0,0,0,.5);letter-spacing:-1px;}
.ld-h1accent{display:block;font-size:clamp(46px,11vw,92px);font-style:italic;
  letter-spacing:-1px;background:linear-gradient(120deg,#ff4d9a,#ff8a3d 40%,#ffd23d);
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
.ld-chatcard{position:absolute;right:0;bottom:0;width:220px;border-radius:16px;
  padding:12px;background:linear-gradient(180deg,rgba(28,14,56,.95),rgba(16,8,36,.97));
  border:1px solid rgba(170,120,255,.3);backdrop-filter:blur(10px);
  box-shadow:0 12px 30px rgba(0,0,0,.5);}
.ld-ccHd{display:flex;justify-content:space-between;font-size:11px;
  font-weight:800;color:#c7a8e8;margin-bottom:9px;}
.ld-ccOnline{color:#3ddc6a;}
.ld-ccMsg{display:flex;gap:7px;align-items:center;font-size:11px;color:#e8d8f0;
  margin-bottom:7px;}
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
.ld-welcome{position:relative;z-index:10;max-width:1100px;margin:0 auto 40px;
  padding:0 28px;}
.ld-wcGlow{position:absolute;inset:0 28px;border-radius:24px;
  background:radial-gradient(circle at 50% 50%,rgba(255,170,40,.3),transparent 70%);
  filter:blur(30px);}
.ld-wcInner{position:relative;border-radius:24px;padding:32px 24px;
  text-align:center;
  background:linear-gradient(135deg,rgba(90,58,8,.6),rgba(58,26,110,.7));
  border:1px solid rgba(255,200,80,.4);
  box-shadow:0 0 40px rgba(255,170,40,.2);}
.ld-wcBadge{display:inline-block;font-size:12px;font-weight:800;
  letter-spacing:.1em;color:#ffd8a0;background:rgba(0,0,0,.25);
  padding:6px 16px;border-radius:20px;margin-bottom:14px;}
.ld-wcMain{font-weight:800;font-size:clamp(26px,6vw,44px);
  display:flex;align-items:center;justify-content:center;gap:10px;
  flex-wrap:wrap;}
.ld-wcGold{color:#ffd23d;text-shadow:0 0 20px rgba(255,200,60,.6);}
.ld-wcSweeps{color:#ff8ad0;text-shadow:0 0 20px rgba(255,120,200,.6);}
.ld-wcPlus{color:#fff;opacity:.6;}
.ld-wcSub{font-size:14px;color:#e8d0c0;margin:12px 0 20px;}
.ld-wcBtn{display:inline-block;text-decoration:none;padding:15px 36px;
  border-radius:30px;font-weight:800;font-size:16px;color:#3a1a00;
  background:linear-gradient(180deg,#ffd23d,#e0901a);
  box-shadow:0 8px 24px rgba(255,170,40,.5);}
.ld-pillars{position:relative;z-index:10;display:grid;
  grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;
  max-width:1280px;margin:0 auto;padding:0 28px 50px;}
.ld-pil{border-radius:16px;padding:22px;text-align:center;
  background:linear-gradient(180deg,rgba(40,22,75,.7),rgba(22,12,46,.8));
  border:1px solid rgba(170,120,255,.2);}
.ld-pilIc{font-size:34px;margin-bottom:10px;}
.ld-pilT{font-weight:800;font-size:16px;}
.ld-pilD{font-size:12px;color:#b9a0e0;margin-top:6px;line-height:1.4;}
.ld-world{position:relative;z-index:10;max-width:1280px;margin:0 auto;
  padding:0 28px 40px;}
.ld-worldHd{text-align:center;margin-bottom:24px;}
.ld-secTitle{font-weight:800;font-size:28px;}
.ld-worldSub{font-size:15px;color:#b9a0e0;max-width:560px;margin:10px auto 0;
  line-height:1.5;}
.ld-levelcard{border-radius:18px;padding:20px;margin-bottom:20px;
  background:linear-gradient(135deg,rgba(60,32,110,.7),rgba(28,14,56,.85));
  border:1px solid rgba(170,120,255,.3);}
.ld-lvTop{display:flex;align-items:center;gap:14px;margin-bottom:16px;}
.ld-lvBadge{width:46px;height:46px;border-radius:14px;flex-shrink:0;
  background:radial-gradient(circle at 35% 30%,#ffd98a,#e0901a);display:flex;
  align-items:center;justify-content:center;font-size:22px;font-weight:800;
  color:#3a1a00;box-shadow:0 0 18px rgba(255,180,40,.5);}
.ld-lvInfo{flex:1;min-width:0;}
.ld-lvName{font-weight:800;font-size:16px;}
.ld-lvDesc{font-size:12px;color:#b9a0e0;margin-top:2px;}
.ld-lvSoon{font-size:10px;font-weight:800;color:#ffd23d;
  background:rgba(255,200,60,.15);padding:5px 10px;border-radius:8px;
  white-space:nowrap;}
.ld-xpbar{height:14px;border-radius:8px;background:rgba(0,0,0,.35);
  overflow:hidden;border:1px solid rgba(170,120,255,.2);}
.ld-xpfill{height:100%;width:62%;border-radius:8px;
  background:linear-gradient(90deg,#9a4ad0,#ff4d9a,#ffd23d);
  box-shadow:0 0 12px rgba(255,120,200,.6);
  animation:ldXp 3s ease-in-out infinite;}
@keyframes ldXp{0%,100%{width:55%}50%{width:72%}}
.ld-xpLabels{display:flex;justify-content:space-between;font-size:10px;
  color:#9a7ac8;margin-top:6px;}
.ld-worldGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));
  gap:14px;}
.ld-wld{text-decoration:none;border-radius:18px;padding:18px;text-align:center;
  background:linear-gradient(180deg,rgba(40,22,75,.8),rgba(20,10,40,.9));
  border:1px solid rgba(170,120,255,.2);transition:transform .2s,box-shadow .2s;
  display:block;}
.ld-wld:hover{transform:translateY(-6px);
  box-shadow:0 16px 36px rgba(0,0,0,.5),0 0 24px var(--wc);}
.ld-wldLive{border-color:rgba(60,220,106,.35);}
.ld-wldArt{height:80px;border-radius:14px;display:flex;align-items:center;
  justify-content:center;font-size:44px;margin-bottom:12px;
  background:radial-gradient(circle,color-mix(in srgb,var(--wc) 30%,transparent),
  rgba(0,0,0,.3));}
.ld-wldName{font-weight:800;font-size:15px;}
.ld-wldTag{font-size:10px;font-weight:700;color:#b9a0e0;margin:6px 0;
  padding:3px 8px;border-radius:6px;background:rgba(255,255,255,.05);
  display:inline-block;}
.ld-wldTagLive{color:#5ddc8a;background:rgba(60,220,106,.15);}
.ld-wldDesc{font-size:11px;color:#9a7ac8;line-height:1.4;}
.ld-buildNote{text-align:center;margin-top:20px;font-size:13px;color:#c7a8e8;
  background:rgba(170,120,255,.08);padding:14px;border-radius:12px;
  border:1px solid rgba(170,120,255,.18);}
.ld-cause{position:relative;z-index:10;max-width:760px;margin:0 auto 50px;
  padding:36px 28px;text-align:center;border-radius:24px;
  background:linear-gradient(135deg,rgba(20,80,50,.4),rgba(28,14,56,.7));
  border:1px solid rgba(60,220,140,.3);}
.ld-causeHeart{font-size:48px;animation:ldBob 3s ease-in-out infinite;}
.ld-causeTitle{font-weight:800;font-size:26px;margin:10px 0 14px;
  background:linear-gradient(180deg,#7dffb0,#3ddc6a);-webkit-background-clip:text;
  background-clip:text;color:transparent;}
.ld-causeP{font-size:15px;color:#d8e8d8;line-height:1.6;}
.ld-causeP strong{color:#7dffb0;}
.ld-causeBadge{display:inline-block;margin-top:18px;font-size:12px;
  font-weight:700;color:#ffd23d;background:rgba(255,200,60,.12);
  padding:8px 18px;border-radius:20px;border:1px solid rgba(255,200,60,.3);}
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
.ld-testimonial{border-radius:18px;padding:24px;text-align:center;
  background:linear-gradient(135deg,rgba(60,32,110,.7),rgba(28,14,56,.8));
  border:1px solid rgba(255,200,80,.25);}
.ld-tIcon{font-size:34px;margin-bottom:8px;}
.ld-tQuote{font-size:17px;font-weight:600;margin:10px 0;line-height:1.4;}
.ld-tWho{font-size:13px;color:#b9a0e0;}
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
    padding:50px 28px 50px;}
  .ld-heroR{min-height:440px;}
  .ld-ball1{width:150px;height:150px;font-size:52px;}
  .ld-community{grid-template-columns:1.2fr 1fr;align-items:center;}
  .ld-h1w{font-size:72px;}
  .ld-h1accent{font-size:88px;}
}
`;
