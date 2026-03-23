'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavBar({ openRequestCount = 0, onHelpRequest }) {
  const pathname = usePathname();

  function handleLogout() {
    if (confirm('로그아웃 하시겠습니까?')) {
      sessionStorage.removeItem('classroom_auth');
      window.location.reload();
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <img src="/logo.png" alt="항공우주산학융합원" className="h-10 w-auto object-contain" />
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto">
          {[
            { href: '/',          emoji: '🏢', label: '강의실 현황' },
            { href: '/reserve',   emoji: '📝', label: '예약 관리' },
            { href: '/dashboard', emoji: '📊', label: '대쉬보드' },
            { href: '/usage-log', emoji: '📋', label: '사용 이력' },
            { href: '/meeting',   emoji: '🏛️', label: '회의실 현황' },
          ].map(({ href, emoji, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1 px-2 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                pathname === href
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{emoji}</span>
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onHelpRequest}
            className="relative flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-3 py-2 rounded-lg transition-colors shadow-sm"
          >
            <span>🔔</span>
            <span className="hidden sm:inline">도움 요청</span>
            {openRequestCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                {openRequestCount > 9 ? '9+' : openRequestCount}
              </span>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors text-sm"
            title="로그아웃"
          >
            🔒
          </button>
        </div>
      </div>
    </header>
  );
}
