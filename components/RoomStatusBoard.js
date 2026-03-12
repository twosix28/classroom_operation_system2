'use client';

import { useState } from 'react';
import RoomCard from './RoomCard';
import RoomDetailModal from './RoomDetailModal';
import { FLOORS, getRoomsForFloor, getActiveSchedule } from '../utils/supabase';

const FLOOR_NAMES = { 1: '1층', 2: '2층', 3: '3층' };
const FLOOR_ACCENT = {
  1: 'bg-blue-600',
  2: 'bg-emerald-600',
  3: 'bg-violet-600',
};

export default function RoomStatusBoard({ schedules, requests, onRequestResolved }) {
  const [selectedRoom, setSelectedRoom] = useState(null);

  function handleRoomClick(roomInfo) {
    setSelectedRoom(roomInfo);
  }

  function handleClose() {
    setSelectedRoom(null);
  }

  function handleRequestResolved(reqId) {
    if (onRequestResolved) onRequestResolved(reqId);
  }

  // Pre-compute attention counts per floor for header badges
  function getFloorAlertCount(floor) {
    return getRoomsForFloor(floor).reduce((acc, room) => {
      const active = getActiveSchedule(schedules, floor, room);
      const openReqs = requests.filter(
        (r) => String(r.floor) === String(floor) && r.room === room && r.status === 'open',
      );
      if (openReqs.length > 0) return acc + 1;
      if (active) {
        const now = new Date();
        const end = new Date(active.end_time);
        const diffMs = end - now;
        if (diffMs < 0 && diffMs > -30 * 60 * 1000) return acc + 1; // recently ended
        if (diffMs >= 0 && diffMs <= 15 * 60 * 1000) return acc + 1; // ending soon
      }
      return acc;
    }, 0);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full overflow-auto">
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span className="text-amber-500">🏢</span> 강의실 현황
      </h2>

      <div className="space-y-5">
        {FLOORS.map((floor) => {
          const alertCount = getFloorAlertCount(floor);
          return (
            <div key={floor}>
              {/* Floor header */}
              <div className={`flex items-center justify-between rounded-lg px-3 py-2 mb-2 ${FLOOR_ACCENT[floor]}`}>
                <span className="text-white font-bold text-sm">{FLOOR_NAMES[floor]}</span>
                {alertCount > 0 && (
                  <span className="bg-white text-red-600 text-xs font-bold px-2 py-0.5 rounded-full animate-bounce">
                    ⚠ {alertCount}건 주의
                  </span>
                )}
              </div>

              {/* Room grid */}
              <div className="grid grid-cols-2 gap-2">
                {getRoomsForFloor(floor).map((room) => {
                  const active = getActiveSchedule(schedules, floor, room);
                  const openReqs = requests.filter(
                    (r) =>
                      String(r.floor) === String(floor) &&
                      r.room === room &&
                      r.status === 'open',
                  );
                  return (
                    <RoomCard
                      key={room}
                      floor={floor}
                      room={room}
                      activeSchedule={active}
                      openRequests={openReqs}
                      onClick={handleRoomClick}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail modal */}
      {selectedRoom && (
        <RoomDetailModal
          roomInfo={selectedRoom}
          onClose={handleClose}
          onRequestResolved={handleRequestResolved}
        />
      )}
    </div>
  );
}
