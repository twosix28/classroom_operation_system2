'use client';

import { useEffect, useState, useCallback } from 'react';

function fmt(isoStr) {
  return new Date(isoStr).toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function fmtDate(isoStr) {
  return new Date(isoStr).toLocaleDateString('ko-KR', {
    month: 'short', day: 'numeric', weekday: 'short',
  });
}

function getStatus(start, end) {
  const now = new Date();
  if (now >= new Date(start) && now < new Date(end)) return 'active';
  if (new Date(start) > now) return 'upcoming';
  return 'ended';
}

const STATUS_STYLE = {
  active:   { badge: 'bg-green-600 text-white', card: 'bg-green-50 border-green-300' },
  upcoming: { badge: 'bg-amber-500 text-white',  card: 'bg-amber-50 border-amber-200' },
};

function KtbizCard({ s }) {
  const status = getStatus(s.start_time, s.end_time);
  const st = STATUS_STYLE[status];
  const today = new Date().toDateString();
  const startIsToday = new Date(s.start_time).toDateString() === today;

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-2.5 ${st.card}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${st.badge}`}>
          {status === 'active' ? '사용 중' : '예정'}
        </span>
        <span className="text-sm font-semibold text-gray-700 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shrink-0">
          {s.room}호
        </span>
      </div>

      <div>
        <p className="text-xs text-gray-500 font-medium">{s.room_name}</p>
        <p className="text-base font-bold text-gray-900 leading-snug mt-0.5 line-clamp-2">
          {s.title}
        </p>
      </div>

      <div className="flex items-center gap-1.5 text-sm text-gray-600">
        <span>🕐</span>
        <span>
          {startIsToday
            ? `${fmt(s.start_time)} ~ ${fmt(s.end_time)}`
            : `${fmtDate(s.start_time)} ${fmt(s.start_time)} ~ ${fmt(s.end_time)}`}
        </span>
      </div>

      <div className="pt-2 border-t border-gray-200 grid grid-cols-2 gap-x-2">
        <div>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">담당자</p>
          <p className="text-sm font-semibold text-gray-800 truncate">{s.author || '-'}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">부서</p>
          <p className="text-sm font-semibold text-gray-800 truncate">{s.dept || '-'}</p>
        </div>
      </div>
    </div>
  );
}

export default function KtbizSection() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      // 오늘 + 내일 (진행 중이거나 오늘 예정인 것 포함)
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const res = await fetch(`/api/ktbiz/schedule?start=${today}&end=${tomorrow}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const now = new Date();
      // 종료된 것 제외, 시간순 정렬
      const filtered = data.schedules
        .filter((s) => new Date(s.end_time) > now)
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      setSchedules(filtered);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5 * 60 * 1000); // 5분마다 갱신
    return () => clearInterval(interval);
  }, [load]);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span>🏢</span> 회의실 예약 현황
          <span className="text-sm font-normal text-gray-400 ml-1">
            ({new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })})
          </span>
        </h2>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <p className="text-xs text-gray-400">
              {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} 기준
            </p>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="text-xs text-blue-600 border border-blue-200 rounded-lg px-2.5 py-1 hover:bg-blue-50 disabled:opacity-40"
          >
            {loading ? '로딩 중...' : '새로고침'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          회의실 데이터를 불러오지 못했습니다: {error}
        </div>
      ) : loading && schedules.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border bg-gray-100 border-gray-200 p-4 h-36 animate-pulse" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-sm">
          <p className="text-3xl mb-2">📭</p>
          <p>오늘 예정된 회의실 예약이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {schedules.map((s) => (
            <KtbizCard key={`${s.id}-${s.room}`} s={s} />
          ))}
        </div>
      )}
    </section>
  );
}
