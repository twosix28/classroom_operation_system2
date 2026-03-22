import { NextResponse } from 'next/server';
import { generateDailyToken } from '../../../../utils/auth-token';

// 간단한 인메모리 Rate Limiter (IP당 1분에 10회 제한)
const rateLimiter = new Map();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimiter.get(ip);
  if (!entry || now - entry.first > WINDOW_MS) {
    rateLimiter.set(ip, { count: 1, first: now });
    return false; // 제한 없음
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS; // true → 차단
}

// 메모리 누수 방지: 1시간마다 만료된 항목 정리
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimiter) {
    if (now - entry.first > WINDOW_MS) rateLimiter.delete(ip);
  }
}, 60 * 60 * 1000);

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  if (checkRateLimit(ip)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  try {
    const { password } = await request.json();
    const correct = process.env.AUTH_PASSWORD;
    if (!correct) return NextResponse.json({ ok: false }, { status: 500 });

    if (password !== correct) {
      return NextResponse.json({ ok: false });
    }

    // 성공 시 일일 회전 토큰 반환 (클라이언트가 API 쓰기 요청에 사용)
    return NextResponse.json({ ok: true, token: generateDailyToken() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
