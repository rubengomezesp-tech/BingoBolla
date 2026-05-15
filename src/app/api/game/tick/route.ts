import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { room_id } = await req.json();
  if (!room_id) {
    return NextResponse.json({ error: 'room_id required' }, { status: 400 });
  }

  const supabase = await createClient();

  // 1. Activar juegos waiting que ya hayan expirado
  await supabase.rpc('activate_waiting_games');

  // 2. Buscar juego activo en esta sala
  let { data: activeGame, error } = await supabase
    .from('games')
    .select('*, rooms(ball_interval_ms, variant)')
    .eq('room_id', room_id)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 3. Si no hay activo, buscar el waiting más próximo
  if (!activeGame) {
    const { data: waitingGame } = await supabase
      .from('games')
      .select('*, rooms(ball_interval_ms, variant)')
      .eq('room_id', room_id)
      .eq('status', 'waiting')
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (waitingGame) {
      const now = new Date();
      const startsAt = new Date(waitingGame.starts_at);
      if (startsAt <= now) {
        // Activar manualmente
        await supabase
          .from('games')
          .update({ status: 'active', starts_at: now.toISOString() })
          .eq('id', waitingGame.id);
        // Recargar el juego activo
        const { data: refreshed } = await supabase
          .from('games')
          .select('*, rooms(ball_interval_ms, variant)')
          .eq('id', waitingGame.id)
          .single();
        activeGame = refreshed;
      } else {
        const diffMs = startsAt.getTime() - now.getTime();
        return NextResponse.json({ status: 'waiting', next_in_ms: diffMs });
      }
    } else {
      // No hay ningún juego para esta sala → crear uno nuevo waiting
      const { data: room } = await supabase
        .from('rooms')
        .select('schedule_interval_seconds, ball_interval_ms, variant')
        .eq('id', room_id)
        .single();
      if (room) {
        const nextStart = new Date(Date.now() + room.schedule_interval_seconds * 1000);
        await supabase.from('games').insert({
          room_id,
          status: 'waiting',
          starts_at: nextStart.toISOString(),
          pot_gold: 0,
          pot_sweeps: 0,
          ball_interval_ms: room.ball_interval_ms,
          variant: room.variant,
        });
      }
      return NextResponse.json({ status: 'no_game', created: true });
    }
  }

  // 4. Si tenemos juego activo, llamamos a tick_game
  if (activeGame) {
    const { data, error: tickError } = await supabase.rpc('tick_game', { p_game_id: activeGame.id });
    if (tickError) {
      return NextResponse.json({ error: tickError.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  return NextResponse.json({ status: 'no_active_game' });
}
