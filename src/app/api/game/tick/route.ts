import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  const { game_id, room_id } = body;
  const supabase = await createClient();

  // Si recibimos room_id, buscamos el juego activo de esa sala
  let targetGameId = game_id;
  if (room_id && !game_id) {
    const { data: activeGame } = await supabase
      .from('games')
      .select('id')
      .eq('room_id', room_id)
      .eq('status', 'active')
      .maybeSingle();
    if (activeGame) {
      targetGameId = activeGame.id;
    } else {
      return NextResponse.json({ status: 'no_active_game' });
    }
  }

  if (!targetGameId) {
    return NextResponse.json({ status: 'no_game_id' });
  }

  // Llamar a la función tick_game (debe existir en Supabase)
  const { data, error } = await supabase.rpc('tick_game', { p_game_id: targetGameId });
  if (error) {
    console.error('tick_game error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
