'use client';

import { useState, useEffect } from 'react';

const SESSION_KEY = 'classroom_auth';
const TOKEN_KEY = 'classroom_token';
const TOKEN_DATE_KEY = 'classroom_token_date';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function PasswordGate({ children }) {
  const [authed, setAuthed] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // 세션이 있고 토큰이 오늘 발급된 것이면 그대로 인증 유지
    const hasSession = sessionStorage.getItem(SESSION_KEY) === '1';
    const tokenDate = sessionStorage.getItem(TOKEN_DATE_KEY);
    if (hasSession && tokenDate === todayStr()) {
      setAuthed(true);
    } else {
      // 만료된 세션 정리 (날짜가 바뀌면 재로그인 필요)
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_DATE_KEY);
    }
    setChecking(false);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: input }),
      });
      if (res.status === 429) {
        setError(true);
        setInput('');
        setTimeout(() => setError(false), 1500);
        return;
      }
      const { ok, token } = await res.json();
      if (ok) {
        sessionStorage.setItem(SESSION_KEY, '1');
        sessionStorage.setItem(TOKEN_KEY, token);
        sessionStorage.setItem(TOKEN_DATE_KEY, todayStr());
        setAuthed(true);
      } else {
        setError(true);
        setInput('');
        setTimeout(() => setError(false), 1500);
      }
    } catch {
      setError(true);
      setInput('');
      setTimeout(() => setError(false), 1500);
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) return null;
  if (authed) return children;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-7">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="항공우주산학융합원" className="h-20 w-auto object-contain" />
          </div>
          <p className="text-sm text-gray-500 mt-1">강의실 예약 관리 시스템</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              접속 암호
            </label>
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="암호를 입력하세요"
              autoFocus
              className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                error
                  ? 'border-red-400 focus:ring-red-300 bg-red-50'
                  : 'border-gray-300 focus:ring-blue-400'
              }`}
            />
            {error && (
              <p className="text-xs text-red-600 mt-1.5 font-medium">
                암호가 올바르지 않습니다.
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            {submitting ? '확인 중...' : '입장'}
          </button>
        </form>
      </div>
    </div>
  );
}
