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
    const { data, error } = await db.from('schedules').insert([payload]).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
