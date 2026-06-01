import { NextResponse } from "next/server";
import { checkCardStatus, type Card, type Pattern } from "@/lib/game/engine";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PATTERNS = new Set<Pattern>(["line", "two_lines", "full_house"]);

type ClaimPreviewBody = {
  cardId?: unknown;
  card_id?: unknown;
  pattern?: unknown;
};

type GameRow = {
  id: string;
  status: string;
  line_won_by: string | null;
  two_lines_won_by: string | null;
  full_house_won_by: string | null;
};

export async function POST(request: Request) {
  const body = await readBody(request);
  if (!body) return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });

  const cardId = typeof body.cardId === "string" ? body.cardId : body.card_id;
  const pattern = body.pattern;
  if (typeof cardId !== "string" || !UUID_RE.test(cardId)) {
    return NextResponse.json({ ok: false, error: "invalid_card_id" }, { status: 400 });
  }
  if (typeof pattern !== "string" || !PATTERNS.has(pattern as Pattern)) {
    return NextResponse.json({ ok: false, error: "invalid_pattern" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult.user) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("id, game_id, player_id, card_data")
    .eq("id", cardId)
    .eq("player_id", userResult.user.id)
    .single();

  if (cardError || !card) {
    return NextResponse.json({ ok: false, error: "card_not_found" }, { status: 404 });
  }

  const [gameResult, ballsResult, claimResult] = await Promise.all([
    supabase
      .from("games")
      .select("id, status, line_won_by, two_lines_won_by, full_house_won_by")
      .eq("id", card.game_id)
      .single<GameRow>(),
    supabase
      .from("balls_called")
      .select("ball_number")
      .eq("game_id", card.game_id),
    supabase
      .from("claims")
      .select("pattern, valid, prize_gold, prize_sweeps, claimed_at")
      .eq("card_id", card.id)
      .eq("player_id", userResult.user.id)
      .eq("pattern", pattern)
      .eq("valid", true)
      .order("claimed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (gameResult.error || !gameResult.data) {
    return NextResponse.json({ ok: false, error: "game_not_found" }, { status: 404 });
  }
  if (ballsResult.error) {
    return NextResponse.json({ ok: false, error: "balls_unavailable" }, { status: 500 });
  }

  const called = new Set((ballsResult.data ?? []).map((ball) => Number(ball.ball_number)));
  const status = checkCardStatus(card.card_data as Card, called);
  const requestedPattern = pattern as Pattern;
  const ready = isPatternReady(status, requestedPattern);
  const missing = getMissing(status, requestedPattern);
  const winnerId = getWinner(gameResult.data, requestedPattern);
  const alreadyClaimed = winnerId === userResult.user.id || Boolean(claimResult.data);
  const closed = Boolean(winnerId && winnerId !== userResult.user.id);
  const gameActive = gameResult.data.status === "playing";

  return NextResponse.json({
    ok: true,
    pattern: requestedPattern,
    ready,
    missing,
    alreadyClaimed,
    closed,
    gameActive,
    prize: claimResult.data
      ? {
          gold: Number(claimResult.data.prize_gold ?? 0),
          sweeps: Number(claimResult.data.prize_sweeps ?? 0),
          claimedAt: claimResult.data.claimed_at,
        }
      : null,
    status: {
      line: status.line,
      twoLines: status.two_lines,
      fullHouse: status.full_house,
      toLine: status.to_line,
      toTwoLines: status.to_two_lines,
      toFullHouse: status.to_full_house,
      markedCount: status.marked_count,
      total: status.total,
    },
  });
}

async function readBody(request: Request): Promise<ClaimPreviewBody | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as ClaimPreviewBody) : null;
  } catch {
    return null;
  }
}

function isPatternReady(status: ReturnType<typeof checkCardStatus>, pattern: Pattern) {
  if (pattern === "line") return status.line;
  if (pattern === "two_lines") return status.two_lines;
  return status.full_house;
}

function getMissing(status: ReturnType<typeof checkCardStatus>, pattern: Pattern) {
  if (pattern === "line") return status.to_line;
  if (pattern === "two_lines") return status.to_two_lines;
  return status.to_full_house;
}

function getWinner(game: GameRow, pattern: Pattern) {
  if (pattern === "line") return game.line_won_by;
  if (pattern === "two_lines") return game.two_lines_won_by;
  return game.full_house_won_by;
}
