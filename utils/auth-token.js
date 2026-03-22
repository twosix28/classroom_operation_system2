import { createHmac } from 'crypto';

/**
 * 서버 전용 — 일일 회전 세션 토큰 생성/검증
 * AUTH_PASSWORD + 오늘 날짜로 HMAC-SHA256 계산
 * 매일 자정 자동 만료되므로 별도 토큰 저장소 불필요
 */
export function generateDailyToken() {
  const password = process.env.AUTH_PASSWORD ?? '';
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return createHmac('sha256', password).update(`api:${day}`).digest('hex');
}

export function validateToken(token) {
  if (!token) return false;
  return token === generateDailyToken();
}
