import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { game_id } = await req.json();
  const supabase = await createClient();

  // 1. Si no hay game_id válido, buscar o crear un juego activo
  let activeGameId = game_id;
  if (!activeGameId) {
    const { data: activeGame } = await supabase
      .from('games')
      .select('id')
      .eq('status', 'active')
      .limit(1)
      .single();
    if (activeGame) {
      activeGameId = activeGame.id;
    } else {
      // Crear un nuevo juego activo ahora mismo
      const { data: room } = await supabase
        .from('rooms')
        .select('id')
        .eq('name', 'London 90')
        .single();
      if (room) {
        const { data: newGame } = await supabase
          .from('games')
          .insert({
            room_id: room.id,
            status: 'active',
            starts_at: new Date().toISOString(),
            pot_gold: 0,
            pot_sweeps: 0,
          })
          .select('id')
          .single();
        activeGameId = newGame?.id;
      }
    }
  }

  if (!activeGameId) {
    return NextResponse.json({ error: 'No active game and could not create one' }, { status: 500 });
  }

  // 2. Llamar a tick_game con el ID activo
  const { data, error } = await supabase.rpc('tick_game', { p_game_id: activeGameId });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ game_id: activeGameId, ...data });
}
