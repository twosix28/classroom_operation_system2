import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { password } = await request.json();
    const correct = process.env.AUTH_PASSWORD;
    if (!correct) {
      return NextResponse.json({ ok: false }, { status: 500 });
    }
    return NextResponse.json({ ok: password === correct });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
