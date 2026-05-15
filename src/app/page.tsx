import Link from "next/link";

const ROOMS = [
  { name: "Lucky 75", variant: "Bingo 75", prize: 2400, players: 187, ticket: 0.10, accent: "magenta", emoji: "🎯" },
  { name: "Cinco Stars", variant: "House exclusive", prize: 5000, players: 234, ticket: 0.25, accent: "violet", emoji: "✨", hot: true },
  { name: "Jackpot Jamboree", variant: "Big pot", prize: 12000, players: 412, ticket: 0.50, accent: "gold", emoji: "🎰" },
];

const WINNERS = [
  { name: "Maria T.", state: "FL", amount: 1247, game: "Cinco Stars" },
  { name: "Jamal K.", state: "TX", amount: 894, game: "Lucky 75" },
  { name: "Linda R.", state: "PA", amount: 2103, game: "Jackpot" },
  { name: "Carlos M.", state: "NY", amount: 567, game: "London 90" },
  { name: "Ashley B.", state: "GA", amount: 1820, game: "Cinco Stars" },
  { name: "Devon W.", state: "OH", amount: 745, game: "Speedy Lite" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-mesh grain relative overflow-hidden">
      {/* Nav */}
      <nav className="relative z-30 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#FF3D7F] to-[#B388FF] flex items-center justify-center">
              <span className="font-display text-white text-xl">B</span>
            </div>
            <div className="absolute -inset-1 bg-gradient-to-br from-[#FF3D7F] to-[#B388FF] rounded-2xl blur-md opacity-50 -z-10" />
          </div>
          <span className="font-display text-2xl tracking-tight">BingoBolla</span>
        </Link>

        <div className="hidden md:flex items-center gap-1 glass rounded-full px-2 py-1.5 text-sm">
          {["Rooms", "Winners", "How it works", "Help"].map((l) => (
            <a key={l} href={`#${l.toLowerCase()}`} className="px-3 py-1.5 rounded-full hover:bg-white/5 text-[var(--color-fg-dim)] hover:text-white transition-colors">
              {l}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/login" className="text-sm font-medium px-4 py-2 text-[var(--color-fg-dim)] hover:text-white">
            Log in
          </Link>
          <Link href="/login" className="btn btn-primary text-sm">
            Sign up
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-12 md:pt-20 pb-20">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
          <div className="anim-slide-up">
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-emerald)] anim-blink" />
              <span className="font-mono text-xs text-[var(--color-fg-dim)]">2,847 ONLINE</span>
              <span className="text-[var(--color-fg-muted)]">·</span>
              <span className="text-[var(--color-fg-dim)]">$48,290 won this week</span>
            </div>

            <h1 className="font-display text-[clamp(3.5rem,9vw,8rem)] mb-6">
              Bingo,
              <br />
              <span className="italic-serif bg-gradient-to-br from-[#FF3D7F] via-[#FFD93D] to-[#00E5FF] bg-clip-text text-transparent">
                reimagined
              </span>
              <br />
              for America.
            </h1>

            <p className="text-lg md:text-xl text-[var(--color-fg-dim)] max-w-xl mb-10 leading-relaxed">
              Real bingo. Real community. Real prizes. Free to play in 45 states —
              powered by a sweepstakes model that's <span className="text-white font-medium">100% legal</span>.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/login" className="btn btn-primary text-base px-7 py-4 anim-pulse-glow">
                Start playing →
              </Link>
              <a href="#how" className="btn btn-ghost text-base px-7 py-4">
                How sweepstakes work
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-10 text-sm text-[var(--color-fg-muted)]">
              <span className="flex items-center gap-1.5"><span className="text-[var(--color-emerald)]">✓</span> 18+ verified</span>
              <span className="flex items-center gap-1.5"><span className="text-[var(--color-emerald)]">✓</span> Certified RNG</span>
              <span className="flex items-center gap-1.5"><span className="text-[var(--color-emerald)]">✓</span> Free to play</span>
              <span className="flex items-center gap-1.5"><span className="text-[var(--color-emerald)]">✓</span> PayPal cashout</span>
            </div>
          </div>

          {/* Floating balls cluster */}
          <div className="relative h-[500px] hidden lg:block">
            <div className="bb-ball bb-ball--b absolute top-12 left-12 w-28 h-28 anim-float" style={{ animationDelay: "0s" }}>
              <span className="font-mono text-xs opacity-80 -mb-1">B</span>
              <span className="font-display text-4xl">7</span>
            </div>
            <div className="bb-ball bb-ball--i absolute top-0 right-16 w-32 h-32 anim-float" style={{ animationDelay: "0.7s" }}>
              <span className="font-mono text-xs opacity-80 -mb-1">I</span>
              <span className="font-display text-4xl">22</span>
            </div>
            <div className="bb-ball bb-ball--n absolute top-44 right-0 w-24 h-24 anim-float" style={{ animationDelay: "1.4s" }}>
              <span className="font-mono text-xs opacity-80 -mb-1">N</span>
              <span className="font-display text-3xl">38</span>
            </div>
            <div className="bb-ball bb-ball--g absolute bottom-20 left-32 w-36 h-36 anim-float" style={{ animationDelay: "0.3s" }}>
              <span className="font-mono text-sm opacity-80 -mb-1">G</span>
              <span className="font-display text-5xl">54</span>
            </div>
            <div className="bb-ball bb-ball--o absolute bottom-4 right-20 w-28 h-28 anim-float" style={{ animationDelay: "1s" }}>
              <span className="font-mono text-xs opacity-80 -mb-1">O</span>
              <span className="font-display text-4xl">71</span>
            </div>
          </div>
        </div>
      </section>

      {/* WINNERS TICKER */}
      <section className="relative z-10 border-y border-[var(--color-border)] py-4 overflow-hidden bg-[var(--color-bg-elev)]">
        <div className="ticker-track">
          {[...WINNERS, ...WINNERS].map((w, i) => (
            <div key={i} className="flex items-center gap-3 text-sm whitespace-nowrap">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF3D7F] to-[#FFD93D] flex items-center justify-center text-xs font-bold">
                {w.name[0]}
              </div>
              <span className="text-[var(--color-fg-dim)]">{w.name} <span className="text-[var(--color-fg-muted)]">· {w.state}</span></span>
              <span className="shimmer-gold font-mono font-bold">${w.amount.toLocaleString()}</span>
              <span className="text-[var(--color-fg-muted)]">in {w.game}</span>
              <span className="text-[var(--color-fg-muted)]">•</span>
            </div>
          ))}
        </div>
      </section>

      {/* LIVE ROOMS */}
      <section id="rooms" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-magenta)] mb-3">
              ● LIVE NOW
            </div>
            <h2 className="font-display text-5xl md:text-6xl">
              Three rooms,<br />
              <span className="italic-serif text-[var(--color-fg-dim)]">infinite ways to win.</span>
            </h2>
          </div>
          <Link href="/login" className="btn btn-ghost">
            See all rooms →
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-5 stagger">
          {ROOMS.map((room, i) => {
            const accentColor = {
              magenta: "#FF3D7F",
              violet: "#B388FF",
              gold: "#FFD93D",
            }[room.accent];
            return (
              <Link
                key={i}
                href="/login"
                className="room-card p-6 anim-slide-up group"
                style={{ ['--accent' as any]: accentColor }}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="text-4xl">{room.emoji}</div>
                  {room.hot && (
                    <span className="font-mono text-xs px-2 py-1 rounded-md bg-[var(--color-magenta)]/15 text-[var(--color-magenta)] border border-[var(--color-magenta)]/30">
                      HOT
                    </span>
                  )}
                </div>

                <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-1">
                  {room.variant}
                </div>
                <div className="font-display text-3xl mb-6">{room.name}</div>

                <div className="grid grid-cols-2 gap-4 mb-6 pt-6 border-t border-[var(--color-border)]">
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-1">
                      Prize pool
                    </div>
                    <div className="font-display text-3xl shimmer-gold">${room.prize.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-1">
                      Ticket
                    </div>
                    <div className="font-display text-3xl">${room.ticket.toFixed(2)}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm text-[var(--color-fg-dim)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-emerald)] anim-blink" />
                    {room.players} playing
                  </div>
                  <div className="text-sm font-medium text-[var(--color-fg-dim)] group-hover:text-white transition-colors">
                    Join →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-cyan)] mb-3">
            100% LEGAL · 45 STATES
          </div>
          <h2 className="font-display text-5xl md:text-6xl mb-4">
            How you win <span className="italic-serif">real cash</span>.
          </h2>
          <p className="text-lg text-[var(--color-fg-dim)] max-w-xl mx-auto">
            A sweepstakes model used by Chumba, LuckyLand, Stake.us. We just make it more fun.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { n: "01", title: "Sign up free", desc: "Get 2,000 Gold Coins + 2 Sweeps Coins on us. Email only — no card.", accent: "magenta" },
            { n: "02", title: "Play bingo", desc: "Use Gold for fun. Use Sweeps to compete for real cash prizes.", accent: "cyan" },
            { n: "03", title: "Cash out", desc: "50+ Sweeps Coins → PayPal or bank transfer. Minimum $50 redemption.", accent: "gold" },
          ].map((s, i) => (
            <div key={i} className="card p-8 card-hover anim-slide-up">
              <div className="font-display text-7xl mb-6" style={{
                background: `linear-gradient(135deg, ${s.accent === "magenta" ? "#FF3D7F" : s.accent === "cyan" ? "#00E5FF" : "#FFD93D"}, transparent 80%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                {s.n}
              </div>
              <h3 className="font-display text-2xl mb-3">{s.title}</h3>
              <p className="text-[var(--color-fg-dim)] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* JACKPOT */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="card glass relative overflow-hidden p-12 md:p-16 text-center">
          <div className="absolute inset-0 bg-mesh-soft opacity-50" />
          <div className="absolute top-8 left-8 bb-ball bb-ball--b w-16 h-16 anim-float opacity-60">
            <span className="font-display text-2xl">7</span>
          </div>
          <div className="absolute bottom-12 right-12 bb-ball bb-ball--g w-20 h-20 anim-float opacity-60" style={{ animationDelay: "1s" }}>
            <span className="font-display text-3xl">54</span>
          </div>

          <div className="relative">
            <div className="inline-block font-mono text-xs uppercase tracking-[0.2em] bg-white/10 px-4 py-2 rounded-full mb-8">
              🎰 Weekly Jackpot
            </div>
            <div className="font-display text-[clamp(4rem,12vw,9rem)] shimmer-gold leading-none">
              $24,890
            </div>
            <p className="text-xl text-[var(--color-fg-dim)] mt-6 mb-8">
              Draws Sunday at <span className="text-white font-medium font-mono">9:00 PM ET</span>
            </p>
            <Link href="/login" className="btn btn-gold inline-flex text-base px-8 py-4">
              I want in →
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-[var(--color-border)] mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row gap-8 justify-between mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF3D7F] to-[#B388FF] flex items-center justify-center">
                  <span className="font-display text-white">B</span>
                </div>
                <span className="font-display text-xl">BingoBolla</span>
              </div>
              <p className="text-sm text-[var(--color-fg-muted)] max-w-xs">
                Bingo, reimagined. Made with care in Miami. 18+ only.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-12 text-sm">
              {[
                { title: "Play", items: ["Bingo 75", "Bingo 90", "Speed Lite", "Cinco"] },
                { title: "Company", items: ["How it works", "Official Rules", "AMOE", "Press"] },
                { title: "Help", items: ["Support 24/7", "Responsible gaming", "Contact"] },
              ].map((col) => (
                <div key={col.title}>
                  <div className="font-mono text-xs uppercase tracking-wider text-[var(--color-fg-muted)] mb-3">
                    {col.title}
                  </div>
                  <div className="space-y-2">
                    {col.items.map((item) => (
                      <a key={item} href="#" className="block text-[var(--color-fg-dim)] hover:text-white transition-colors">
                        {item}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-[var(--color-border)] text-xs text-[var(--color-fg-muted)] flex flex-col md:flex-row justify-between gap-3">
            <div>© 2026 BingoBolla. No purchase necessary. Void where prohibited. Excluded: WA, ID, NV, MI.</div>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white">Terms</a>
              <a href="#" className="hover:text-white">Privacy</a>
              <a href="#" className="hover:text-white">Responsible Gaming</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
