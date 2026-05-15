import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');

  if (!roomId) {
    return NextResponse.json({ error: 'roomId required' }, { status: 400 });
  }

  const supabase = await createClient();

  // Llamar a la función RPC que ya tienes
  const { data, error } = await supabase.rpc('get_room_state', { p_room_id: roomId });

  if (error) {
    console.error('Error fetching room state:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
