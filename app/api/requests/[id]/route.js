import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../utils/supabase-admin';
import { validateToken } from '../../../../utils/auth-token';

function authorized(request) {
  const token = request.headers.get('authorization')?.slice(7);
  return validateToken(token);
}

export async function PATCH(request, { params }) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('room_requests')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
