import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { game_id } = await req.json();
  const supabase = await createClient();

  // 1. Obtener el juego con su sala
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select(`*, rooms(ball_interval_ms, variant, schedule_interval_seconds)`)
    .eq('id', game_id)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  const now = new Date();
  const startsAt = new Date(game.starts_at);

  // 2. Si el juego está en 'waiting' y ya es hora, activarlo
  if (game.status === 'waiting' && startsAt <= now) {
    const { error: updateError } = await supabase
      .from('games')
      .update({ 
        status: 'active',
        starts_at: now.toISOString(),
        // Asegurar que las columnas necesarias para tick_game no sean null
        ball_interval_ms: game.rooms.ball_interval_ms,
        variant: game.rooms.variant,
        pot_gold: game.pot_gold ?? 0,
        pot_sweeps: game.pot_sweeps ?? 0
      })
      .eq('id', game_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Juego activado, ahora generamos la primera bola inmediatamente
    const result = await callTickGame(game_id);
    return NextResponse.json({ status: 'activated', ...result });
  }

  // 3. Si el juego ya está activo, ejecutar tick_game (función SQL existente)
  if (game.status === 'active') {
    const result = await callTickGame(game_id);
    return NextResponse.json(result);
  }

  // 4. Si es waiting pero aún no es hora
  return NextResponse.json({ status: 'waiting', next_in_ms: startsAt.getTime() - now.getTime() });
}

// Helper para llamar a la función SQL tick_game
async function callTickGame(gameId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('tick_game', { p_game_id: gameId });
  if (error) {
    return { error: error.message };
  }
  return data;
}
