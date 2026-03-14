'use client';

import { useState, useEffect } from 'react';

const PASSWORD = 'june';
const SESSION_KEY = 'classroom_auth';

export default function PasswordGate({ children }) {
  const [authed, setAuthed] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === '1') {
      setAuthed(true);
    }
    setChecking(false);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (input === PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setAuthed(true);
    } else {
      setError(true);
      setInput('');
      setTimeout(() => setError(false), 1500);
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
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            입장
          </button>
        </form>
      </div>
    </div>
  );
}
