import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { game_id, room_id } = await req.json();

  // Si no nos pasan room_id, lo intentamos obtener del game_id o de la URL (pero lo ideal es pasarlo)
  let targetRoomId = room_id;
  let targetGameId = game_id;

  // Si tenemos game_id, obtenemos su room_id
  if (targetGameId && !targetRoomId) {
    const { data: game } = await supabase
      .from('games')
      .select('room_id')
      .eq('id', targetGameId)
      .single();
    if (game) targetRoomId = game.room_id;
  }

  if (!targetRoomId) {
    return NextResponse.json({ error: 'room_id required' }, { status: 400 });
  }

  // 1. Buscar un juego activo en esta sala
  let { data: activeGame } = await supabase
    .from('games')
    .select('*')
    .eq('room_id', targetRoomId)
    .eq('status', 'active')
    .maybeSingle();

  // 2. Si no hay activo, buscar el waiting más próximo (con starts_at <= ahora)
  if (!activeGame) {
    const { data: waitingGame } = await supabase
      .from('games')
      .select('*')
      .eq('room_id', targetRoomId)
      .eq('status', 'waiting')
      .lte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (waitingGame) {
      // Activar ese waiting
      const { error: updateError } = await supabase
        .from('games')
        .update({ status: 'active', starts_at: new Date().toISOString() })
        .eq('id', waitingGame.id);
      if (!updateError) {
        activeGame = { ...waitingGame, status: 'active' };
      }
    }
  }

  if (!activeGame) {
    // No hay juego activo ni waiting listo para activar
    return NextResponse.json({ status: 'no_active_game' });
  }

  // 3. Llamar a tick_game con el juego activo
  const { data, error } = await supabase.rpc('tick_game', { p_game_id: activeGame.id });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ...data, game_id: activeGame.id });
}
