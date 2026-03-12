'use client';

import { formatTime, isEndingSoon, isRecentlyEnded, CATEGORY_LABELS } from '../utils/supabase';

/**
 * Determines the room's attention/status state.
 * Returns: 'alert' | 'warning' | 'in_use' | 'available'
 */
function getRoomState({ activeSchedule, openRequests }) {
  const hasIssue = openRequests.length > 0;
  const ending = isEndingSoon(activeSchedule);
  const ended = isRecentlyEnded(activeSchedule);

  if (hasIssue) return 'alert';
  if (ended)    return 'alert';
  if (ending)   return 'warning';
  if (activeSchedule) return 'in_use';
  return 'available';
}

const STATE_STYLES = {
  alert: {
    card: 'border-red-400 bg-red-50 shadow-red-100',
    badge: 'bg-red-500 text-white',
    label: '주의 필요',
    animate: true,
  },
  warning: {
    card: 'border-amber-400 bg-amber-50 shadow-amber-100',
    badge: 'bg-amber-500 text-white',
    label: '종료 임박',
    animate: true,
  },
  in_use: {
    card: 'border-blue-400 bg-blue-50 shadow-blue-100',
    badge: 'bg-blue-500 text-white',
    label: '사용 중',
    animate: false,
  },
  available: {
    card: 'border-gray-200 bg-white',
    badge: 'bg-green-500 text-white',
    label: '이용 가능',
    animate: false,
  },
};

export default function RoomCard({ floor, room, activeSchedule, openRequests, onClick }) {
  const state = getRoomState({ activeSchedule, openRequests });
  const style = STATE_STYLES[state];

  return (
    <button
      onClick={() => onClick({ floor, room, activeSchedule, openRequests, state })}
      className={`
        relative w-full text-left rounded-xl border-2 p-3 shadow-sm
        transition-all duration-200 hover:scale-[1.02] hover:shadow-md
        ${style.card}
        ${style.animate ? 'animate-pulse-attention' : ''}
      `}
    >
      {/* Room number */}
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-base font-bold text-gray-800">{room}호</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${style.badge}`}>
          {style.label}
        </span>
      </div>

      {/* Active usage info */}
      {activeSchedule && (
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-gray-700 truncate">
            {activeSchedule.title}
          </p>
          <p className="text-[11px] text-gray-500">
            {CATEGORY_LABELS[activeSchedule.category] || ''} · {activeSchedule.author}
          </p>
          <p className="text-[11px] text-gray-500">
            {formatTime(activeSchedule.start_time)} ~ {formatTime(activeSchedule.end_time)}
          </p>
        </div>
      )}

      {/* Issue indicator */}
      {openRequests.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1">
          <span className="text-red-500 text-xs">⚠</span>
          <span className="text-xs text-red-600 font-medium">
            요청 {openRequests.length}건
          </span>
        </div>
      )}

      {/* Available indicator */}
      {state === 'available' && (
        <p className="text-xs text-green-600 font-medium mt-0.5">예약 가능</p>
      )}

      {/* Pulse dot for attention states */}
      {style.animate && (
        <span className="absolute top-2 right-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              state === 'alert' ? 'bg-red-400' : 'bg-amber-400'
            }`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              state === 'alert' ? 'bg-red-500' : 'bg-amber-500'
            }`} />
          </span>
        </span>
      )}
    </button>
  );
}
