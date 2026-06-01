import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');

  if (!roomId || !UUID_RE.test(roomId)) {
    return NextResponse.json({ error: 'invalid_room_id' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }
  
  const { data, error } = await supabase.rpc('get_room_state', { p_room_id: roomId });

  if (error) {
    return NextResponse.json({ error: 'room_state_failed' }, { status: 500 });
  }

  return NextResponse.json(data);
}
