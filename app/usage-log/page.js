'use client';

import { useState, useCallback, useEffect } from 'react';
import PasswordGate from '../../components/PasswordGate';
import NavBar from '../../components/NavBar';
import UsageLogTable from '../../components/UsageLogTable';
import RoomRequestModal from '../../components/RoomRequestModal';
import {
  fetchSchedulesByDateRange,
  fetchRoomRequests,
  CATEGORY_LABELS,
} from '../../utils/supabase';

function toDateInput(d) {
  return d.toISOString().slice(0, 10);
}

function downloadCSV(data, startDate, endDate) {
  if (!data.length) return;
  const headers = ['No.', '층', '호실', '사업명', '분류', '강의명', '강사명', '수강생수', '시작시간', '종료시간', '관리자', '등록일시'];
  const fmtDt = (iso) =>
    iso ? new Date(iso).toLocaleString('ko-KR', { hour12: false }) : '';

  const rows = data.map((s, i) => [
    i + 1,
    s.floor ? `${s.floor}층` : '',
    s.room || '',
    s.project_name || '',
    CATEGORY_LABELS[s.category] || s.category || '',
    s.title || '',
    s.author || '',
    s.student_count != null ? s.student_count : '',
    fmtDt(s.start_time),
    fmtDt(s.end_time),
    s.facility_manager || '',
    fmtDt(s.created_at),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const filename = startDate && endDate
    ? `usage-log-${startDate}_to_${endDate}.csv`
    : `usage-log-${toDateInput(new Date())}.csv`;

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function SummaryCard({ label, value, colorClass }) {
  return (
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-0.5">{value}</p>
    </div>
  );
}

export default function UsageLogPage() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(toDateInput(firstOfMonth));
  const [endDate, setEndDate] = useState(toDateInput(today));
  const [appliedStart, setAppliedStart] = useState(toDateInput(firstOfMonth));
  const [appliedEnd, setAppliedEnd] = useState(toDateInput(today));
  const [openRequestCount, setOpenRequestCount] = useState(0);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const loadData = useCallback(async (start, end) => {
    setLoading(true);
    try {
      const [result, reqs] = await Promise.all([
        fetchSchedulesByDateRange({ startDate: start, endDate: end }),
        fetchRoomRequests(),
      ]);
      setData(result);
      setOpenRequestCount(reqs.filter((r) => r.status === 'open').length);
    } catch (err) {
      console.error('사용 이력 로드 오류:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(appliedStart, appliedEnd); }, [loadData, appliedStart, appliedEnd]);

  function handleSearch() {
    setAppliedStart(startDate);
    setAppliedEnd(endDate);
  }

  function handleReset() {
    const s = toDateInput(firstOfMonth);
    const e = toDateInput(today);
    setStartDate(s); setEndDate(e);
    setAppliedStart(s); setAppliedEnd(e);
  }

  const todayStr = toDateInput(today);
  const todayCount = data.filter((s) => s.start_time?.slice(0, 10) === todayStr).length;
  const uniqueRooms = new Set(data.map((s) => `${s.floor}-${s.room}`)).size;

  return (
    <PasswordGate>
      <div className="min-h-screen bg-gray-50">
        <NavBar
          openRequestCount={openRequestCount}
          onHelpRequest={() => setShowRequestModal(true)}
        />

        <main className="max-w-screen-2xl mx-auto px-4 py-6 space-y-5">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">강의실 사용 이력</h1>
            <p className="text-sm text-gray-500 mt-0.5">강의실 예약 및 사용 내역을 조회합니다</p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              label="조회 기간 총 건수"
              value={`${data.length}건`}
              colorClass="bg-blue-50 border-blue-200 text-blue-800"
            />
            <SummaryCard
              label="오늘 사용 건수"
              value={`${todayCount}건`}
              colorClass="bg-green-50 border-green-200 text-green-800"
            />
            <SummaryCard
              label="사용 강의실 수"
              value={`${uniqueRooms}개`}
              colorClass="bg-purple-50 border-purple-200 text-purple-800"
            />
          </div>

          {/* Filter bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              조회
            </button>
            <button
              onClick={handleReset}
              className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
            >
              초기화
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {loading ? '불러오는 중...' : (
                <>
                  <span className="font-semibold text-gray-800">{appliedStart}</span>
                  {' ~ '}
                  <span className="font-semibold text-gray-800">{appliedEnd}</span>
                  {' · 총 '}
                  <span className="font-semibold text-blue-700">{data.length}건</span>
                </>
              )}
            </p>
            <button
              onClick={() => downloadCSV(data, appliedStart, appliedEnd)}
              disabled={!data.length || loading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <span>⬇</span> CSV 다운로드
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-16 text-center text-gray-400 bg-white rounded-xl border border-gray-200">
              <p className="text-4xl mb-2 animate-pulse">⏳</p>
              <p className="text-sm">데이터를 불러오는 중입니다...</p>
            </div>
          ) : (
            <UsageLogTable data={data} />
          )}

        </main>

        {showRequestModal && (
          <RoomRequestModal
            onClose={() => setShowRequestModal(false)}
            onSaved={() => setShowRequestModal(false)}
          />
        )}
      </div>
    </PasswordGate>
  );
}
