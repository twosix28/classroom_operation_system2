'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import PasswordGate from '../../components/PasswordGate';
import NavBar from '../../components/NavBar';
import ReservationForm from '../../components/ReservationForm';
import RoomRequestModal from '../../components/RoomRequestModal';
import { fetchSchedules, fetchRoomRequests, supabase } from '../../utils/supabase';

const MonthlyCalendar = dynamic(() => import('../../components/MonthlyCalendar'), { ssr: false });

export default function ReservePage() {
  const [schedules, setSchedules] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [sched, reqs] = await Promise.all([fetchSchedules(), fetchRoomRequests()]);
      setSchedules(sched);
      setRequests(reqs);
      setLoadError(false);
    } catch (err) {
      console.error('데이터 로드 오류:', err);
      setLoadError(true);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const channel = supabase
      .channel('reserve-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, (payload) => {
        if (payload.eventType === 'INSERT')
          setSchedules((prev) => [...prev, payload.new]);
        else if (payload.eventType === 'UPDATE')
          setSchedules((prev) => prev.map((s) => s.id === payload.new.id ? payload.new : s));
        else if (payload.eventType === 'DELETE')
          setSchedules((prev) => prev.filter((s) => s.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_requests' }, (payload) => {
        if (payload.eventType === 'INSERT')
          setRequests((prev) => [payload.new, ...prev]);
        else if (payload.eventType === 'UPDATE')
          setRequests((prev) => prev.map((r) => r.id === payload.new.id ? payload.new : r));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  function handleReservationSaved(saved) {
    setSchedules((prev) => prev.find((s) => s.id === saved.id) ? prev : [...prev, saved]);
  }

  function handleDeleted(id) {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    setSelectedSchedule((s) => (s?.id === id ? null : s));
  }

  function handleEdited(updated) {
    setSchedules((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    setSelectedSchedule(null);
  }

  function handleRequestSaved(saved) {
    setRequests((prev) => prev.find((r) => r.id === saved.id) ? prev : [saved, ...prev]);
  }

  const openRequestCount = requests.filter((r) => r.status === 'open').length;

  return (
    <PasswordGate>
      <div className="min-h-screen bg-gray-50">
        <NavBar
          openRequestCount={openRequestCount}
          onHelpRequest={() => setShowRequestModal(true)}
        />

        <main className="max-w-screen-2xl mx-auto px-4 py-6 space-y-4">
          {loadError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
              <span>데이터를 불러오지 못했습니다. 네트워크 상태를 확인하거나 새로고침 해주세요.</span>
              <button
                onClick={loadAll}
                className="shrink-0 font-semibold underline hover:text-red-900"
              >
                다시 시도
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start">

            {/* 캘린더 */}
            <div>
              <MonthlyCalendar
              schedules={schedules}
              onDeleted={handleDeleted}
              onEventSelect={setSelectedSchedule}
            />
            </div>

            {/* 예약 폼 */}
            <div>
              <ReservationForm
                onSaved={handleReservationSaved}
                editingSchedule={selectedSchedule}
                onEdited={handleEdited}
                onDeleted={handleDeleted}
                onEditClear={() => setSelectedSchedule(null)}
              />
            </div>

          </div>
        </main>

        {showRequestModal && (
          <RoomRequestModal
            onClose={() => setShowRequestModal(false)}
            onSaved={handleRequestSaved}
          />
        )}
      </div>
    </PasswordGate>
  );
}
