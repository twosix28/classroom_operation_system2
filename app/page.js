'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ReservationForm from '../components/ReservationForm';
import RoomStatusBoard from '../components/RoomStatusBoard';
import RoomRequestModal from '../components/RoomRequestModal';
import { fetchSchedules, fetchRoomRequests, supabase } from '../utils/supabase';

// FullCalendar must be loaded client-side only
const MonthlyCalendar = dynamic(() => import('../components/MonthlyCalendar'), { ssr: false });

export default function HomePage() {
  const [schedules, setSchedules] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // ── Initial data load ────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const [sched, reqs] = await Promise.all([
        fetchSchedules(),
        fetchRoomRequests(),
      ]);
      setSchedules(sched);
      setRequests(reqs);
    } catch (err) {
      console.error('데이터 로드 오류:', err);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Supabase Realtime subscriptions ─────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('realtime-all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules' },
        (payload) => {
          setLastUpdate(new Date());
          if (payload.eventType === 'INSERT') {
            setSchedules((prev) => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setSchedules((prev) =>
              prev.map((s) => (s.id === payload.new.id ? payload.new : s)),
            );
          } else if (payload.eventType === 'DELETE') {
            setSchedules((prev) => prev.filter((s) => s.id !== payload.old.id));
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_requests' },
        (payload) => {
          setLastUpdate(new Date());
          if (payload.eventType === 'INSERT') {
            setRequests((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setRequests((prev) =>
              prev.map((r) => (r.id === payload.new.id ? payload.new : r)),
            );
          } else if (payload.eventType === 'DELETE') {
            setRequests((prev) => prev.filter((r) => r.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ── Refresh room status every minute (catch ending-soon transitions) ─────
  useEffect(() => {
    const interval = setInterval(() => setLastUpdate(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  function handleReservationSaved(saved) {
    // Optimistic: realtime subscription will also fire; avoid duplicate by checking
    setSchedules((prev) => {
      if (prev.find((s) => s.id === saved.id)) return prev;
      return [...prev, saved];
    });
  }

  function handleRequestSaved(saved) {
    setRequests((prev) => {
      if (prev.find((r) => r.id === saved.id)) return prev;
      return [saved, ...prev];
    });
  }

  function handleRequestResolved(reqId) {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === reqId ? { ...r, status: 'resolved', resolved_at: new Date().toISOString() } : r,
      ),
    );
  }

  // Count open requests for header badge
  const openRequestCount = requests.filter((r) => r.status === 'open').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top Navigation ─────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">✈</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">
                항공우주 산학융합원
              </h1>
              <p className="text-xs text-gray-500">강의실 예약 및 관리 시스템</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdate && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
                <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                실시간 연결 중
              </span>
            )}

            {/* Room Request Button */}
            <button
              onClick={() => setShowRequestModal(true)}
              className="relative flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              <span>🔔</span>
              <span>강의실 도움 요청</span>
              {openRequestCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                  {openRequestCount > 9 ? '9+' : openRequestCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main 3-Panel Layout ─────────────────────────────────────────── */}
      <main className="max-w-screen-2xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px_320px] gap-4 items-start">

          {/* Panel A: Monthly Calendar */}
          <div className="min-h-[600px]">
            <MonthlyCalendar schedules={schedules} />
          </div>

          {/* Panel B: Reservation Form */}
          <div className="min-h-[600px]">
            <ReservationForm onSaved={handleReservationSaved} />
          </div>

          {/* Panel C: Room Status Board */}
          <div className="min-h-[600px]">
            <RoomStatusBoard
              schedules={schedules}
              requests={requests}
              onRequestResolved={handleRequestResolved}
            />
          </div>
        </div>
      </main>

      {/* ── Room Request Modal ─────────────────────────────────────────── */}
      {showRequestModal && (
        <RoomRequestModal
          onClose={() => setShowRequestModal(false)}
          onSaved={handleRequestSaved}
        />
      )}
    </div>
  );
}
