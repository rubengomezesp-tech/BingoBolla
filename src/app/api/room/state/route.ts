import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');

  if (!roomId) {
    return NextResponse.json({ error: 'roomId required' }, { status: 400 });
  }

  const supabase = await createClient();

  // 1. Obtener datos de la sala
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  if (roomError) {
    return NextResponse.json({ error: roomError.message }, { status: 404 });
  }

  // 2. Obtener juego activo (playing)
  const { data: playingGame } = await supabase
    .from('games')
    .select('*')
    .eq('room_id', roomId)
    .eq('status', 'active')
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 3. Obtener juego en espera (waiting)
  const { data: waitingGame } = await supabase
    .from('games')
    .select('*')
    .eq('room_id', roomId)
    .eq('status', 'waiting')
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  // 4. Obtener cartones del usuario (autenticado)
  const { data: { user } } = await supabase.auth.getUser();
  let myCardsPlaying: any[] = [];
  let myCardsWaiting: any[] = [];

  if (user) {
    if (playingGame) {
      const { data } = await supabase
        .from('cards')
        .select('*')
        .eq('game_id', playingGame.id)
        .eq('player_id', user.id);
      myCardsPlaying = data || [];
    }
    if (waitingGame) {
      const { data } = await supabase
        .from('cards')
        .select('*')
        .eq('game_id', waitingGame.id)
        .eq('player_id', user.id);
      myCardsWaiting = data || [];
    }
  }

  // 5. Obtener mensajes de chat (solo del juego activo o del waiting)
  let chat: any[] = [];
  const gameForChat = playingGame || waitingGame;
  if (gameForChat) {
    const { data } = await supabase
      .from('chat_messages')
      .select('*, profiles(username)')
      .eq('game_id', gameForChat.id)
      .order('created_at', { ascending: true })
      .limit(50);
    chat = data || [];
  }

  // 6. Ventana de compra abierta? (5 segundos antes de que empiece el waiting)
  let purchaseOpen = false;
  let purchaseClosesInS = 0;
  if (waitingGame) {
    const startsAt = new Date(waitingGame.starts_at).getTime();
    const now = Date.now();
    const diffSec = (startsAt - now) / 1000;
    purchaseOpen = diffSec > 5;
    purchaseClosesInS = Math.max(0, diffSec - 5);
  }

  const response = {
    room,
    playing_game: playingGame ? { ...playingGame, balls: [] } : null, // las bolas se cargarán por separado
    waiting_game: waitingGame,
    my_cards_playing: myCardsPlaying,
    my_cards_waiting: myCardsWaiting,
    chat,
    purchase_open: purchaseOpen,
    purchase_closes_in_s: purchaseClosesInS,
  };

  // Si hay juego activo, agregar las bolas ya llamadas
  if (playingGame) {
    const { data: balls } = await supabase
      .from('balls_called')
      .select('ball_number, sequence, created_at')
      .eq('game_id', playingGame.id)
      .order('sequence', { ascending: true });
    if (response.playing_game) {
      response.playing_game.balls = balls || [];
    }
  }

  return NextResponse.json(response);
}
