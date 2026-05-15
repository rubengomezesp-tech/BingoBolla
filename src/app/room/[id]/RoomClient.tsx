"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  COLS_75,
  ballClass,
  ballLetter,
  checkCardStatus,
  type Card as CardType,
} from "@/lib/game/engine";
import {
  isMuted,
  setMuted,
  playBallCalled,
  playOneToGo,
  playWin,
  playPurchase,
  playGameStart,
} from "@/lib/sounds";
import type { Profile, RoomLive } from "@/lib/supabase/types";
import Link from "next/link";

type Ball = { ball_number: number; sequence: number };
type MyCard = { id: string; game_id: string; card_data: CardType; currency: "gold" | "sweeps" };
type ChatMsg = { id: string; player_id: string | null; is_mc: boolean; message: string; created_at: string; username?: string };

const CHAT_SHORTCUTS = ["GL all 🍀", "1TG 🎯", "2TG 👀", "WTG 🎉", "TY 💚", "GG 🤝"];

export default function RoomClient({
  initialRoom,
  initialProfile,
  userId,
}: {
  initialRoom: RoomLive;
  initialProfile: Profile;
  userId: string;
}) {
  const supabase = createClient();
  const [room] = useState(initialRoom);
  const [profile, setProfile] = useState(initialProfile);
  const [currentGameId, setCurrentGameId] = useState<string | null>(initialRoom.current_game_id);
  const [gameStatus, setGameStatus] = useState<RoomLive["game_status"]>(initialRoom.game_status);
  const [gameStartsAt, setGameStartsAt] = useState<string | null>(null);
  const [myCards, setMyCards] = useState<MyCard[]>([]);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [buying, setBuying] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [winFlash, setWinFlash] = useState<{ pattern: string; amount: number } | null>(null);
  const [muted, setMutedState] = useState(isMuted());
  const [countdown, setCountdown] = useState<number | null>(null);
  const [lineWinner, setLineWinner] = useState<string | null>(null);
  const [fullHouseWinner, setFullHouseWinner] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const prevBallsLen = useRef(0);
  const prev1TG = useRef<Set<string>>(new Set());

  const calledSet = useMemo(() => new Set(balls.map((b) => b.ball_number)), [balls]);
  const lastBall = balls.length ? balls[balls.length - 1] : null;

  // Card statuses (1TG / 2TG / won)
  const cardStatuses = useMemo(() => {
    const m: Record<string, ReturnType<typeof checkCardStatus>> = {};
    for (const c of myCards) m[c.id] = checkCardStatus(c.card_data, calledSet);
    return m;
  }, [myCards, calledSet]);

  // ============ INITIAL LOAD ============
  useEffect(() => {
    if (!currentGameId) return;
    (async () => {
      const [{ data: cards }, { data: bs }, { data: msgs }, { data: game }] = await Promise.all([
        supabase.from("cards").select("*").eq("game_id", currentGameId).eq("player_id", userId),
        supabase.from("balls_called").select("*").eq("game_id", currentGameId).order("sequence"),
        supabase.from("chat_messages").select("*, profiles(username)").eq("game_id", currentGameId).order("created_at", { ascending: true }).limit(80),
        supabase.from("games").select("starts_at, line_won_by, full_house_won_by, status").eq("id", currentGameId).single(),
      ]);
      if (cards) setMyCards(cards as any);
      if (bs) setBalls(bs as Ball[]);
      if (msgs) setChat((msgs as any[]).map((m) => ({ ...m, username: m.profiles?.username ?? "MC" })));
      if (game) {
        setGameStartsAt(game.starts_at);
        setGameStatus(game.status);
        if (game.line_won_by) setLineWinner(game.line_won_by);
        if (game.full_house_won_by) setFullHouseWinner(game.full_house_won_by);
      }
    })();
  }, [currentGameId, userId]);

  // ============ REALTIME ============
  useEffect(() => {
    if (!currentGameId) return;
    const channel = supabase
      .channel(`game:${currentGameId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "balls_called", filter: `game_id=eq.${currentGameId}` },
        (p) => setBalls((prev) => prev.some((b) => b.sequence === (p.new as Ball).sequence) ? prev : [...prev, p.new as Ball])
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${currentGameId}` },
        (p) => {
          const g = p.new as any;
          setGameStatus(g.status);
          if (g.starts_at) setGameStartsAt(g.starts_at);
          if (g.line_won_by && g.line_won_by !== lineWinner) setLineWinner(g.line_won_by);
          if (g.full_house_won_by && g.full_house_won_by !== fullHouseWinner) setFullHouseWinner(g.full_house_won_by);
          if (g.status === "playing" && gameStatus !== "playing") playGameStart();
        }
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `game_id=eq.${currentGameId}` },
        async (p) => {
          const m = p.new as any;
          if (m.is_mc) {
            // Already formatted: "<emoji> <name>: <message>"
            setChat((prev) => [...prev, { ...m, username: m.message.split(":")[0] }]);
          } else {
            const { data } = await supabase.from("profiles").select("username").eq("id", m.player_id).single();
            setChat((prev) => [...prev, { ...m, username: (data as any)?.username ?? "?" }]);
          }
        }
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "claims", filter: `game_id=eq.${currentGameId}` },
        (p) => {
          const c = p.new as any;
          if (c.valid && c.player_id === userId) {
            const amount = Number(c.prize_sweeps) > 0 ? Number(c.prize_sweeps) : c.prize_gold;
            setWinFlash({ pattern: c.pattern, amount });
            playWin();
            setTimeout(() => setWinFlash(null), 5000);
            // refresh balance
            supabase.from("profiles").select("*").eq("id", userId).single<Profile>().then(({ data }) => {
              if (data) setProfile(data);
            });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentGameId, userId]);

  // Play ball sound + detect 1TG
  useEffect(() => {
    if (balls.length > prevBallsLen.current) {
      const newBall = balls[balls.length - 1];
      if (newBall) playBallCalled(newBall.ball_number);
    }
    prevBallsLen.current = balls.length;

    // 1TG detection — fires sound when any card transitions to to_line === 1
    const new1TG = new Set<string>();
    for (const c of myCards) {
      const s = cardStatuses[c.id];
      if (s && s.to_line === 1) new1TG.add(c.id);
    }
    for (const id of new1TG) {
      if (!prev1TG.current.has(id)) {
        playOneToGo();
        break;
      }
    }
    prev1TG.current = new1TG;
  }, [balls, myCards, cardStatuses]);

  // ============ COUNTDOWN ============
  useEffect(() => {
    if (!gameStartsAt || gameStatus !== "waiting") {
      setCountdown(null);
      return;
    }
    const target = new Date(gameStartsAt).getTime();
    const tick = () => {
      const ms = target - Date.now();
      setCountdown(Math.max(0, Math.floor(ms / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [gameStartsAt, gameStatus]);

  // ============ CHAT AUTOSCROLL ============
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [chat]);

  // ============ ACTIONS ============
  async function buyTicket(currency: "gold" | "sweeps") {
    setBuying(true);
    const { data, error } = await supabase.rpc("buy_ticket", { p_room_id: room.id, p_currency: currency });
    setBuying(false);
    if (error) {
      setToast({ ok: false, text: errorLabel(error.message) });
      setTimeout(() => setToast(null), 4000);
      return;
    }
    if (data) {
      playPurchase();
      const d = data as any;
      setMyCards((prev) => [...prev, { id: d.card_id, game_id: d.game_id, card_data: d.card_data, currency }]);
      setCurrentGameId(d.game_id);
      const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).single<Profile>();
      if (p) setProfile(p);
    }
  }

  async function sendChat(text?: string) {
    const message = (text ?? chatInput).trim();
    if (!message || !currentGameId) return;
    setChatInput("");
    await supabase.from("chat_messages").insert({
      game_id: currentGameId,
      player_id: userId,
      message: message.slice(0, 200),
    });
  }

  function toggleMute() {
    const v = !muted;
    setMuted(v);
    setMutedState(v);
  }

  // ============ RENDER ============
  return (
    <div className="min-h-screen bg-[var(--color-bg)] grain">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-[var(--color-bg)]/85 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-2">
          <Link href="/lobby" className="text-sm text-[var(--color-fg-dim)] hover:text-white flex items-center gap-1.5">
            ← <span className="hidden sm:inline">Lobby</span>
          </Link>
          <div className="font-display text-lg md:text-xl truncate text-center flex-1">
            {room.name}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="w-8 h-8 rounded-full glass flex items-center justify-center text-sm hover:bg-white/10 transition-colors"
              title={muted ? "Activar sonido" : "Silenciar"}
            >
              {muted ? "🔇" : "🔊"}
            </button>
            <div className="glass rounded-full px-3 py-1.5 font-mono text-xs whitespace-nowrap">🪙 {profile.gold_coins.toLocaleString()}</div>
            <div className="rounded-full px-3 py-1.5 bg-[var(--color-magenta)]/15 border border-[var(--color-magenta)]/30 font-mono text-xs whitespace-nowrap">
              💎 {profile.sweeps_coins.toFixed(2)}
            </div>
          </div>
        </div>
      </header>

      {/* Win celebration */}
      {winFlash && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-[var(--color-bg)]/40 backdrop-blur-sm">
          <div className="text-center anim-scale-in">
            <div className="font-display text-[clamp(5rem,16vw,12rem)] shimmer-gold leading-none drop-shadow-2xl">¡BINGO!</div>
            <div className="font-mono text-xl text-white mt-4">
              {winFlash.pattern.toUpperCase()} · ${winFlash.amount.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 anim-slide-up px-4">
          <div className={`card glass px-5 py-3 font-medium text-sm ${toast.ok ? "border-[var(--color-emerald)]/50 text-[var(--color-emerald)]" : "border-[var(--color-magenta)]/50 text-[var(--color-magenta)]"}`}>
            {toast.text}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 grid lg:grid-cols-[1fr_320px] gap-4 md:gap-6">
        {/* LEFT — game area */}
        <div className="space-y-4">
          {/* Game state header */}
          <div className="card p-4 md:p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {gameStatus === "playing" && (
                    <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-[var(--color-emerald)]/15 text-[var(--color-emerald)] border border-[var(--color-emerald)]/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-emerald)] anim-blink" />
                      JUGANDO
                    </span>
                  )}
                  {gameStatus === "waiting" && (
                    <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-[var(--color-gold)]/15 text-[var(--color-gold)] border border-[var(--color-gold)]/30">
                      EMPIEZA EN {formatCountdown(countdown)}
                    </span>
                  )}
                  {gameStatus === "finished" && (
                    <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-white/5 text-[var(--color-fg-dim)]">
                      RONDA FINALIZADA
                    </span>
                  )}
                  <span className="text-xs font-mono text-[var(--color-fg-muted)]">{balls.length}/75</span>
                </div>
                <div className="font-display text-xl md:text-2xl">
                  {lineWinner && fullHouseWinner ? (
                    <span className="italic-serif text-[var(--color-fg-dim)]">Ambos premios ganados</span>
                  ) : lineWinner ? (
                    <span className="italic-serif">Línea cantada · jugando por el bingo</span>
                  ) : (
                    <span>Próximo premio: <span className="italic-serif">línea</span></span>
                  )}
                </div>
              </div>

              {/* LAST BALL */}
              {lastBall ? (
                <div
                  key={lastBall.sequence}
                  className={`bb-ball ${ballClass(lastBall.ball_number)} w-24 h-24 md:w-28 md:h-28 anim-scale-in anim-pulse-glow flex-shrink-0`}
                >
                  <span className="font-mono text-xs opacity-70 -mb-1">{ballLetter(lastBall.ball_number)}</span>
                  <span className="font-display text-4xl md:text-5xl leading-none">{lastBall.ball_number}</span>
                </div>
              ) : (
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-2 border-dashed border-[var(--color-border)] flex items-center justify-center text-[var(--color-fg-muted)] font-mono text-xs flex-shrink-0">
                  ESPERA
                </div>
              )}
            </div>

            {/* Called strip */}
            <div className="mt-4 md:mt-5 pt-4 md:pt-5 border-t border-[var(--color-border)]">
              <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-2">Últimas 12 bolas</div>
              <div className="flex flex-wrap gap-1.5 min-h-[40px]">
                {balls.slice(-12).reverse().map((b) => (
                  <div key={b.sequence} className={`bb-ball ${ballClass(b.ball_number)} w-9 h-9 md:w-10 md:h-10`}>
                    <span className="font-display text-base">{b.ball_number}</span>
                  </div>
                ))}
                {balls.length === 0 && (
                  <div className="text-sm text-[var(--color-fg-muted)] italic-serif">Esperando el inicio...</div>
                )}
              </div>
            </div>
          </div>

          {/* Buy ticket */}
          {myCards.length < (room.max_cards_per_player ?? 6) && gameStatus !== "playing" && (
            <div className="card p-4 md:p-5 flex items-center justify-between flex-wrap gap-3 border-[var(--color-magenta)]/30">
              <div>
                <div className="font-display text-lg md:text-xl">Comprar cartón</div>
                <div className="text-xs md:text-sm text-[var(--color-fg-dim)]">Tienes {myCards.length} · max {room.max_cards_per_player ?? 6}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => buyTicket("gold")}
                  disabled={buying || profile.gold_coins < room.ticket_gold}
                  className="btn btn-ghost disabled:opacity-40 text-sm"
                >
                  🪙 {room.ticket_gold}
                </button>
                <button
                  onClick={() => buyTicket("sweeps")}
                  disabled={buying || profile.sweeps_coins < room.ticket_sweeps}
                  className="btn btn-primary disabled:opacity-40 text-sm"
                >
                  💎 ${room.ticket_sweeps}
                </button>
              </div>
            </div>
          )}

          {/* CARDS */}
          {myCards.length === 0 ? (
            <div className="card p-10 text-center border-dashed">
              <div className="text-4xl mb-3">🎫</div>
              <div className="font-display text-2xl mb-1">Sin cartones todavía</div>
              <div className="text-[var(--color-fg-dim)] text-sm">Compra uno arriba para entrar en la partida.</div>
            </div>
          ) : (
            <div className={`grid ${myCards.length === 1 ? "" : "md:grid-cols-2"} gap-3 md:gap-4`}>
              {myCards.map((card, idx) => (
                <CardView
                  key={card.id}
                  card={card}
                  status={cardStatuses[card.id]}
                  calledSet={calledSet}
                  index={idx}
                />
              ))}
            </div>
          )}

          {/* Mobile chat (under cards) */}
          <aside className="card overflow-hidden flex flex-col h-[400px] lg:hidden">
            <ChatPanel chat={chat} chatRef={chatRef} chatInput={chatInput} setChatInput={setChatInput} onSend={sendChat} />
          </aside>
        </div>

        {/* DESKTOP CHAT */}
        <aside className="card overflow-hidden flex-col h-[640px] lg:sticky lg:top-20 hidden lg:flex">
          <ChatPanel chat={chat} chatRef={chatRef} chatInput={chatInput} setChatInput={setChatInput} onSend={sendChat} />
        </aside>
      </main>
    </div>
  );
}

// ============ CARD VIEW WITH 1TG / 2TG ============
function CardView({
  card,
  status,
  calledSet,
  index,
}: {
  card: MyCard;
  status: ReturnType<typeof checkCardStatus> | undefined;
  calledSet: Set<number>;
  index: number;
}) {
  const toLine = status?.to_line ?? 99;
  const toFull = status?.to_full_house ?? 99;
  const won = status?.full_house;

  const tag = (() => {
    if (won) return { text: "¡BINGO!", color: "from-[#FFD93D] to-[#FF3D7F]" };
    if (status?.line) return { text: "Línea ✓", color: "from-[#00E676] to-[#00E5FF]" };
    if (toLine === 1) return { text: "1TG · falta 1", color: "from-[#FF3D7F] to-[#FFD93D]", anim: true };
    if (toLine === 2) return { text: "2TG · faltan 2", color: "from-[#B388FF] to-[#FF3D7F]" };
    return null;
  })();

  const headerCls: Record<string, string> = { B: "bb-ball--b", I: "bb-ball--i", N: "bb-ball--n", G: "bb-ball--g", O: "bb-ball--o" };

  return (
    <div className={`card p-4 relative ${won ? "border-[var(--color-gold)]/50" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-lg">Cartón #{index + 1}</div>
        {tag && (
          <div className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-gradient-to-r ${tag.color} text-white ${tag.anim ? "anim-pulse-glow" : ""}`}>
            {tag.text}
          </div>
        )}
      </div>

      {/* Header */}
      <div className="grid grid-cols-5 gap-1.5 mb-1.5">
        {COLS_75.map((l) => (
          <div key={l} className={`bb-ball ${headerCls[l]} aspect-square text-xl md:text-2xl`}>
            <span className="font-display">{l}</span>
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-5 gap-1.5">
        {card.card_data.flatMap((row, r) =>
          row.map((val, c) => {
            const isMarked = val === "FREE" || (typeof val === "number" && calledSet.has(val));
            return (
              <div
                key={`${r}-${c}`}
                className={`aspect-square rounded-lg flex items-center justify-center font-display text-base md:text-lg transition-all ${
                  isMarked
                    ? "bg-gradient-to-br from-[#FF3D7F] to-[#B388FF] text-white shadow-lg shadow-[var(--color-magenta-glow)]"
                    : "bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-fg)]"
                }`}
              >
                {val === "FREE" ? <span className="text-[9px] font-mono uppercase">FREE</span> : val}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-mono text-[var(--color-fg-muted)]">
          {status?.marked_count ?? 0}/{status?.total ?? 24} marcadas
        </span>
        <span className="font-mono text-[var(--color-fg-muted)]">
          {card.currency === "sweeps" ? "💎 Sweeps" : "🪙 Gold"}
        </span>
      </div>
    </div>
  );
}

// ============ CHAT PANEL ============
function ChatPanel({
  chat,
  chatRef,
  chatInput,
  setChatInput,
  onSend,
}: {
  chat: ChatMsg[];
  chatRef: React.RefObject<HTMLDivElement | null>;
  chatInput: string;
  setChatInput: (v: string) => void;
  onSend: (text?: string) => void;
}) {
  return (
    <>
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <div className="font-medium text-sm flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-emerald)] anim-blink" />
          Chat
        </div>
        <div className="font-mono text-xs text-[var(--color-fg-muted)]">{chat.length}</div>
      </div>
      <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {chat.length === 0 ? (
          <div className="text-center text-[var(--color-fg-muted)] text-sm py-8 italic-serif">
            Sé el primero en saludar 👋
          </div>
        ) : (
          chat.map((m) => (
            <div key={m.id} className="flex items-start gap-2 text-sm">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                m.is_mc ? "bg-[var(--color-magenta)]" : "bg-gradient-to-br from-[#00E5FF] to-[#B388FF]"
              } text-white`}>
                {m.is_mc ? "M" : (m.username?.[0]?.toUpperCase() ?? "?")}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-[11px] font-medium mb-0.5 ${m.is_mc ? "text-[var(--color-magenta)]" : "text-[var(--color-cyan)]"}`}>
                  {m.is_mc ? "🎤 " + (m.username?.replace(/^[^A-Za-z]+/, "") ?? "MC") : m.username}
                </div>
                <div className="text-[var(--color-fg-dim)] break-words leading-snug">{m.message}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Shortcuts */}
      <div className="px-3 py-2 border-t border-[var(--color-border)] flex flex-wrap gap-1.5">
        {CHAT_SHORTCUTS.map((s) => (
          <button
            key={s}
            onClick={() => onSend(s)}
            className="text-[11px] font-mono px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[var(--color-fg-dim)] hover:text-white transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); onSend(); }}
        className="p-3 border-t border-[var(--color-border)] flex gap-2"
      >
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Escribe..."
          maxLength={200}
          className="input text-sm py-2"
        />
        <button type="submit" className="btn btn-primary px-3 text-sm">→</button>
      </form>
    </>
  );
}

// ============ HELPERS ============
function formatCountdown(s: number | null) {
  if (s == null) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function errorLabel(msg: string): string {
  const map: Record<string, string> = {
    insufficient_funds: "Te faltan monedas. Visita la tienda.",
    kyc_required: "Completa la verificación primero.",
    state_excluded: "Tu estado no permite usar Sweeps Coins.",
    max_cards_reached: "Máximo de cartones alcanzado.",
    game_not_active: "La partida ya no está activa.",
    account_banned: "Cuenta suspendida.",
  };
  for (const k of Object.keys(map)) if (msg.includes(k)) return map[k];
  return msg;
}
