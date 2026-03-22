import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../utils/supabase-admin';
import { validateToken } from '../../../utils/auth-token';

function authorized(request) {
  const token = request.headers.get('authorization')?.slice(7);
  return validateToken(token);
}

export async function POST(request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const payload = await request.json();
    const db = getSupabaseAdmin();
    const { error } = await db.from('room_status_logs').insert([payload]);
    if (error) console.error('room_status_logs insert error', error);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
