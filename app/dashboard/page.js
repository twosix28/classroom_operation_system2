'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import PasswordGate from '../../components/PasswordGate';
import NavBar from '../../components/NavBar';
import DashboardScheduleCard from '../../components/DashboardScheduleCard';
import RoomRequestModal from '../../components/RoomRequestModal';
import { fetchDashboardSchedules, fetchRoomRequests, supabase } from '../../utils/supabase';
import KtbizSection from '../../components/KtbizSection';

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function classifySchedules(schedules) {
  const now = new Date();
  const todayEnd = endOfToday();
  const active = [];
  const todayLater = [];
  const upcoming = [];

  for (const s of schedules) {
    const start = new Date(s.start_time);
    const end = new Date(s.end_time);
    if (now >= start && now < end) {
      active.push(s);
    } else if (start > now && start <= todayEnd) {
      todayLater.push(s);
    } else if (start > todayEnd) {
      upcoming.push(s);
    }
    // ended today are excluded
  }
  return { active, todayLater, upcoming };
}

function SummaryCard({ icon, label, count, colorClass }) {
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-4 ${colorClass}`}>
      <span className="text-3xl">{icon}</span>
      <div>
        <p className="text-sm text-gray-600 font-medium">{label}</p>
        <p className="text-3xl font-bold text-gray-900 leading-none">{count}</p>
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="col-span-full py-10 text-center text-gray-400 text-sm">
      <p className="text-3xl mb-2">📭</p>
      <p>{message}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [schedules, setSchedules] = useState([]);
  const [openRequestCount, setOpenRequestCount] = useState(0);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadAll = useCallback(async () => {
    try {
      const [sched, reqs] = await Promise.all([
        fetchDashboardSchedules(),
        fetchRoomRequests(),
      ]);
      setSchedules(sched);
      setOpenRequestCount(reqs.filter((r) => r.status === 'open').length);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('대쉬보드 데이터 로드 오류:', err);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => {
        loadAll();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_requests' }, () => {
        loadAll();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [loadAll]);

  // Re-evaluate active/today status every minute
  useEffect(() => {
    const interval = setInterval(() => setSchedules((s) => [...s]), 60_000);
    return () => clearInterval(interval);
  }, []);

  const { active, todayLater, upcoming } = useMemo(() => classifySchedules(schedules), [schedules]);

  const todayAll = [...active, ...todayLater];

  return (
    <PasswordGate>
      <div className="min-h-screen bg-gray-50">
        <NavBar
          openRequestCount={openRequestCount}
          onHelpRequest={() => setShowRequestModal(true)}
        />

        <main className="max-w-screen-2xl mx-auto px-4 py-6 space-y-8">

          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">강의실 운영 대쉬보드</h1>
              <p className="text-sm text-gray-500 mt-0.5">실시간 강의실 사용 현황을 확인합니다</p>
            </div>
            {lastUpdated && (
              <p className="text-xs text-gray-400">
                최종 업데이트: {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
              </p>
            )}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              icon="🟢"
              label="현재 사용 중인 강의실"
              count={active.length}
              colorClass="bg-blue-50 border-blue-200"
            />
            <SummaryCard
              icon="🕐"
              label="오늘 사용 예정 강의실"
              count={todayLater.length}
              colorClass="bg-amber-50 border-amber-200"
            />
            <SummaryCard
              icon="📅"
              label="앞으로 예정된 예약"
              count={upcoming.length}
              colorClass="bg-gray-100 border-gray-200"
            />
          </div>

          {/* Today section */}
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>🏫</span> 오늘 강의실 현황
              <span className="text-sm font-normal text-gray-400 ml-1">
                ({new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })})
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {todayAll.length === 0 ? (
                <EmptyState message="오늘 예정된 강의실 사용이 없습니다." />
              ) : (
                todayAll.map((s) => (
                  <DashboardScheduleCard
                    key={s.id}
                    schedule={s}
                    status={active.includes(s) ? 'active' : 'today'}
                  />
                ))
              )}
            </div>
          </section>

          {/* KT 비즈 회의실 섹션 */}
          <KtbizSection />

          {/* Upcoming section */}
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>📋</span> 앞으로 예정된 강의실
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {upcoming.length === 0 ? (
                <EmptyState message="앞으로 예정된 예약이 없습니다." />
              ) : (
                upcoming.map((s) => (
                  <DashboardScheduleCard key={s.id} schedule={s} status="upcoming" />
                ))
              )}
            </div>
          </section>

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
