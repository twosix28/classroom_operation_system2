'use client';

import { useState, useEffect } from 'react';
import PasswordGate from '../../components/PasswordGate';
import NavBar from '../../components/NavBar';

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function getWeekRange(base = new Date()) {
  const d = new Date(base);
  const day = d.getDay();
  const mon = new Date(d); mon.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { start: formatDate(mon), end: formatDate(sun) };
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDateKo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
}

export default function MeetingPage() {
  const today = formatDate(new Date());
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load(s, e) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/ktbiz/schedule?start=${s}&end=${e}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSchedules(data.schedules || []);
    } catch (err) {
      setError(err.message);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(start, end); }, []);

  function handleToday() {
    const t = formatDate(new Date());
    setStart(t); setEnd(t);
    load(t, t);
  }

  function handleThisWeek() {
    const { start: s, end: e } = getWeekRange();
    setStart(s); setEnd(e);
    load(s, e);
  }

  function handleSearch() {
    load(start, end);
  }

  // 날짜별 그룹화
  const grouped = schedules.reduce((acc, s) => {
    const date = s.start_time?.split('T')[0] || s.start_time?.split(' ')[0] || '';
    if (!acc[date]) acc[date] = [];
    acc[date].push(s);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort();

  return (
    <PasswordGate>
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <main className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-xl font-bold text-gray-800 mb-4">🏛️ 회의실 예약 현황</h1>

          {/* 날짜 검색 바 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex flex-wrap items-center gap-3">
            <button onClick={handleToday}
              className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
              오늘
            </button>
            <button onClick={handleThisWeek}
              className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
              이번 주
            </button>
            <div className="flex items-center gap-2">
              <input type="date" value={start} onChange={e => setStart(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <span className="text-gray-400 text-sm">~</span>
              <input type="date" value={end} onChange={e => setEnd(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <button onClick={handleSearch}
              className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors">
              조회
            </button>
          </div>

          {/* 결과 */}
          {loading && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3 animate-spin inline-block">⏳</div>
              <p className="text-sm">KT 비즈오피스에서 데이터를 불러오는 중...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
              오류: {error}
            </div>
          )}

          {!loading && !error && sortedDates.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">
              해당 기간에 예약이 없습니다.
            </div>
          )}

          {!loading && sortedDates.map(date => (
            <div key={date} className="mb-5">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2 px-1">
                {formatDateKo(date + 'T00:00:00')}
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600 w-24">호실</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600">사용 목적</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600 w-36">시간</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600 w-28">담당자</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[date]
                      .sort((a, b) => (a.start_time > b.start_time ? 1 : -1))
                      .map((s, i) => (
                        <tr key={s.id || i}
                          className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                          <td className="px-4 py-3 font-medium text-blue-700">{s.room}호</td>
                          <td className="px-4 py-3 text-gray-800">{s.title || '-'}</td>
                          <td className="px-4 py-3 text-gray-600 tabular-nums">
                            {formatTime(s.start_time)} ~ {formatTime(s.end_time)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{s.author || '-'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </main>
      </div>
    </PasswordGate>
  );
}
