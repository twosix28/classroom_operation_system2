import { createClient } from '@supabase/supabase-js';

/**
 * 서버 전용 Supabase 관리자 클라이언트
 * SUPABASE_SERVICE_ROLE_KEY 는 RLS를 우회하므로 절대 클라이언트에 노출 금지
 * API Route 내부에서만 import 해야 함
 */
let _admin = null;

export function getSupabaseAdmin() {
  if (_admin) return _admin;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다');
  }
  _admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  return _admin;
}
