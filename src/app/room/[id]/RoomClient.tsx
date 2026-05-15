"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { COLS, type Card as CardType } from "@/lib/game/cards";
import type { Profile, RoomLive } from "@/lib/supabase/types";
import Link from "next/link";

type Ball = { ball_number: number; sequence: number };
type MyCard = { id: string; game_id: string; card_data: CardType; currency: "gold" | "sweeps" };
type ChatMsg = { id: string; player_id: string | null; is_mc: boolean; message: string; created_at: string; username?: string };

const ballClass = (n: number) =>
  n <= 15 ? "bb-ball--b" : n <= 30 ? "bb-ball--i" : n <= 45 ? "bb-ball--n" : n <= 60 ? "bb-ball--g" : "bb-ball--o";
const ballLetter = (n: number) =>
  n <= 15 ? "B" : n <= 30 ? "I" : n <= 45 ? "N" : n <= 60 ? "G" : "O";

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
  const [myCards, setMyCards] = useState<MyCard[]>([]);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [marked, setMarked] = useState<Record<string, Set<number>>>({});
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [buying, setBuying] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [winFlash, setWinFlash] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const lastBall = balls.length ? balls[balls.length - 1] : null;

  useEffect(() => {
    if (!currentGameId) return;
    (async () => {
      const [{ data: cards }, { data: bs }, { data: msgs }] = await Promise.all([
        supabase.from("cards").select("*").eq("game_id", currentGameId).eq("player_id", userId),
        supabase.from("balls_called").select("*").eq("game_id", currentGameId).order("sequence"),
        supabase
          .from("chat_messages")
          .select("*, profiles(username)")
          .eq("game_id", currentGameId)
          .order("created_at", { ascending: true })
          .limit(50),
      ]);
      if (cards) setMyCards(cards as any);
      if (bs) setBalls(bs as Ball[]);
      if (msgs) {
        setChat((msgs as any[]).map((m) => ({ ...m, username: m.profiles?.username ?? "MC" })));
      }
    })();
  }, [currentGameId, userId]);

  useEffect(() => {
    if (!currentGameId) return;
    const channel = supabase
      .channel(`game:${currentGameId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "balls_called", filter: `game_id=eq.${currentGameId}` },
        (p) => setBalls((prev) => prev.some((b) => b.sequence === (p.new as Ball).sequence) ? prev : [...prev, p.new as Ball])
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${currentGameId}` },
        (p) => setGameStatus((p.new as any).status)
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `game_id=eq.${currentGameId}` },
        async (p) => {
          const m = p.new as any;
          const { data } = m.player_id
            ? await supabase.from("profiles").select("username").eq("id", m.player_id).single()
            : { data: { username: "MC" } };
          setChat((prev) => [...prev, { ...m, username: (data as any)?.username ?? "MC" }]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentGameId]);

  useEffect(() => {
    const calledSet = new Set(balls.map((b) => b.ball_number));
    const next: Record<string, Set<number>> = {};
    for (const card of myCards) {
      const s = new Set<number>();
      for (const row of card.card_data) {
        for (const cell of row) {
          if (typeof cell === "number" && calledSet.has(cell)) s.add(cell);
        }
      }
      next[card.id] = s;
    }
    setMarked(next);
  }, [balls, myCards]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [chat]);

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
      const d = data as any;
      setMyCards((prev) => [...prev, { id: d.card_id, game_id: d.game_id, card_data: d.card_data, currency }]);
      setCurrentGameId(d.game_id);
      const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).single<Profile>();
      if (p) setProfile(p);
    }
  }

  async function claimBingo(cardId: string, pattern: string) {
    const { data, error } = await supabase.rpc("claim_bingo", { p_card_id: cardId, p_pattern: pattern });
    if (error) {
      setToast({ ok: false, text: "Not bingo yet 👀" });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    const d = data as any;
    setWinFlash(true);
    setToast({ ok: true, text: `🎉 BINGO! +${d.prize_gold} 🪙 +$${d.prize_sweeps} 💎` });
    const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).single<Profile>();
    if (p) setProfile(p);
    setTimeout(() => setWinFlash(false), 5000);
  }

  async function sendChat() {
    if (!chatInput.trim() || !currentGameId) return;
    const msg = chatInput.slice(0, 200);
    setChatInput("");
    await supabase.from("chat_messages").insert({ game_id: currentGameId, player_id: userId, message: msg });
  }

  const winPattern = room.win_pattern === "line" ? "line" : "full_house";
  const winPatternLabel = winPattern === "line" ? "any line" : "full house";

  return (
    <div className="min-h-screen bg-[var(--color-bg)] grain">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-[var(--color-bg)]/80 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-3">
          <Link href="/lobby" className="flex items-center gap-1.5 text-sm text-[var(--color-fg-dim)] hover:text-white transition-colors">
            <span>←</span> Lobby
          </Link>
          <div className="font-display text-xl">{room.name}</div>
          <div className="flex items-center gap-2 text-sm">
            <div className="glass rounded-full px-3 py-1.5 font-mono text-xs">🪙 {profile.gold_coins.toLocaleString()}</div>
            <div className="rounded-full px-3 py-1.5 bg-[var(--color-magenta)]/15 border border-[var(--color-magenta)]/30 font-mono text-xs">
              💎 {profile.sweeps_coins.toFixed(2)}
            </div>
          </div>
        </div>
      </header>

      {/* Win celebration overlay */}
      {winFlash && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center anim-scale-in">
          <div className="font-display text-[20vw] shimmer-gold leading-none drop-shadow-2xl">BINGO!</div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 anim-slide-up">
          <div className={`card glass px-6 py-3.5 font-medium ${toast.ok ? "border-[var(--color-emerald)]/50 text-[var(--color-emerald)]" : "border-[var(--color-magenta)]/50 text-[var(--color-magenta)]"}`}>
            {toast.text}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-6 grid lg:grid-cols-[1fr_320px] gap-6">
        {/* LEFT */}
        <div className="space-y-5">
          {/* Game state */}
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {gameStatus === "playing" ? (
                    <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-[var(--color-emerald)]/15 text-[var(--color-emerald)] border border-[var(--color-emerald)]/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-emerald)] anim-blink" />
                      IN PLAY
                    </span>
                  ) : gameStatus === "waiting" ? (
                    <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-[var(--color-gold)]/15 text-[var(--color-gold)] border border-[var(--color-gold)]/30">
                      WAITING
                    </span>
                  ) : (
                    <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-white/5 text-[var(--color-fg-dim)]">
                      FINISHED
                    </span>
                  )}
                  <span className="text-xs font-mono text-[var(--color-fg-muted)]">{balls.length}/75 BALLS</span>
                </div>
                <div className="font-display text-2xl">
                  Win with <span className="italic-serif">{winPatternLabel}</span>
                </div>
              </div>

              {/* Last ball — hero element */}
              {lastBall ? (
                <div
                  key={lastBall.sequence}
                  className={`bb-ball ${ballClass(lastBall.ball_number)} w-28 h-28 anim-scale-in anim-pulse-glow flex-shrink-0`}
                >
                  <span className="font-mono text-xs opacity-70 -mb-1">{ballLetter(lastBall.ball_number)}</span>
                  <span className="font-display text-5xl leading-none">{lastBall.ball_number}</span>
                </div>
              ) : (
                <div className="w-28 h-28 rounded-full border-2 border-dashed border-[var(--color-border)] flex items-center justify-center text-[var(--color-fg-muted)] font-mono text-xs flex-shrink-0">
                  READY
                </div>
              )}
            </div>

            {/* Recent called strip */}
            <div className="mt-5 pt-5 border-t border-[var(--color-border)]">
              <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-2">Last 12 balls</div>
              <div className="flex flex-wrap gap-1.5">
                {balls.slice(-12).reverse().map((b) => (
                  <div key={b.sequence} className={`bb-ball ${ballClass(b.ball_number)} w-10 h-10`}>
                    <span className="font-display text-base">{b.ball_number}</span>
                  </div>
                ))}
                {balls.length === 0 && (
                  <div className="text-sm text-[var(--color-fg-muted)] italic-serif">Waiting for the caller to start dropping balls...</div>
                )}
              </div>
            </div>
          </div>

          {/* Buy ticket */}
          {myCards.length < (room.max_cards_per_player ?? 6) && gameStatus !== "playing" && (
            <div className="card p-5 flex items-center justify-between flex-wrap gap-4 border-[var(--color-magenta)]/30">
              <div>
                <div className="font-display text-xl mb-0.5">Buy a card</div>
                <div className="text-sm text-[var(--color-fg-dim)]">You have {myCards.length}/{room.max_cards_per_player ?? 6}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => buyTicket("gold")}
                  disabled={buying || profile.gold_coins < room.ticket_gold}
                  className="btn btn-ghost disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                >
                  🪙 {room.ticket_gold}
                </button>
                <button
                  onClick={() => buyTicket("sweeps")}
                  disabled={buying || profile.sweeps_coins < room.ticket_sweeps}
                  className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                >
                  💎 ${room.ticket_sweeps}
                </button>
              </div>
            </div>
          )}

          {/* Cards */}
          {myCards.length === 0 ? (
            <div className="card p-12 text-center border-dashed">
              <div className="text-4xl mb-3">🎫</div>
              <div className="font-display text-2xl mb-1">No cards yet</div>
              <div className="text-[var(--color-fg-dim)] text-sm">Buy one above to start playing.</div>
            </div>
          ) : (
            <div className={`grid ${myCards.length === 1 ? "" : "md:grid-cols-2"} gap-4`}>
              {myCards.map((card, idx) => (
                <CardView
                  key={card.id}
                  card={card}
                  marked={marked[card.id] ?? new Set()}
                  index={idx}
                  onClaim={() => claimBingo(card.id, winPattern)}
                  canClaim={gameStatus === "playing"}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — chat */}
        <aside className="card overflow-hidden flex flex-col h-[600px] lg:sticky lg:top-20">
          <div className="px-4 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between">
            <div className="font-medium text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-emerald)] anim-blink" />
              Room chat
            </div>
            <div className="font-mono text-xs text-[var(--color-fg-muted)]">{chat.length}</div>
          </div>
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {chat.length === 0 ? (
              <div className="text-center text-[var(--color-fg-muted)] text-sm py-8 italic-serif">
                Be the first to say hi 👋
              </div>
            ) : (
              chat.map((m) => (
                <div key={m.id} className="flex items-start gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    m.is_mc ? "bg-[var(--color-magenta)]" : "bg-gradient-to-br from-[#00E5FF] to-[#B388FF]"
                  } text-white`}>
                    {(m.is_mc ? "M" : m.username?.[0]?.toUpperCase()) ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs font-medium mb-0.5 ${m.is_mc ? "text-[var(--color-magenta)]" : "text-[var(--color-cyan)]"}`}>
                      {m.is_mc ? "🎤 MC" : m.username}
                    </div>
                    <div className="text-sm text-[var(--color-fg-dim)] break-words">{m.message}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); sendChat(); }}
            className="p-3 border-t border-[var(--color-border)] flex gap-2"
          >
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type..."
              maxLength={200}
              className="input text-sm py-2.5"
            />
            <button type="submit" className="btn btn-primary px-4 text-sm">→</button>
          </form>
        </aside>
      </main>
    </div>
  );
}

function CardView({
  card,
  marked,
  index,
  onClaim,
  canClaim,
}: {
  card: MyCard;
  marked: Set<number>;
  index: number;
  onClaim: () => void;
  canClaim: boolean;
}) {
  const headerLetter = (l: string) => {
    const map: Record<string, string> = { B: "bb-ball--b", I: "bb-ball--i", N: "bb-ball--n", G: "bb-ball--g", O: "bb-ball--o" };
    return map[l];
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="font-display text-xl">Card #{index + 1}</div>
        <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-fg-muted)]">
          {card.currency === "sweeps" ? "💎 SWEEPS" : "🪙 GOLD"}
        </div>
      </div>

      {/* Header */}
      <div className="grid grid-cols-5 gap-1.5 mb-1.5">
        {COLS.map((l) => (
          <div key={l} className={`bb-ball ${headerLetter(l)} aspect-square text-2xl`}>
            <span className="font-display">{l}</span>
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-5 gap-1.5">
        {card.card_data.flatMap((row, r) =>
          row.map((val, c) => {
            const isMarked = val === "FREE" || (typeof val === "number" && marked.has(val));
            return (
              <div
                key={`${r}-${c}`}
                className={`aspect-square rounded-lg flex items-center justify-center font-display text-lg transition-all ${
                  isMarked
                    ? "bg-gradient-to-br from-[#FF3D7F] to-[#B388FF] text-white shadow-lg shadow-[var(--color-magenta-glow)]"
                    : "bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-fg)]"
                }`}
              >
                {val === "FREE" ? <span className="text-[10px] font-mono uppercase tracking-wider">FREE</span> : val}
              </div>
            );
          })
        )}
      </div>

      <button
        onClick={onClaim}
        disabled={!canClaim}
        className="btn btn-primary w-full mt-4 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Claim BINGO 🎉
      </button>
    </div>
  );
}

function errorLabel(msg: string): string {
  const map: Record<string, string> = {
    insufficient_funds: "Not enough coins. Visit the store.",
    kyc_required: "Complete verification first.",
    state_excluded: "Your state can't use Sweeps Coins.",
    max_cards_reached: "Max cards reached for this round.",
    game_not_active: "Game is no longer active.",
  };
  for (const k of Object.keys(map)) if (msg.includes(k)) return map[k];
  return msg;
}
