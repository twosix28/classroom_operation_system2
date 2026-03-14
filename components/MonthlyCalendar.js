'use client';

import { useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CATEGORY_LABELS, formatTime } from '../utils/supabase';

// Color palette per floor
const FLOOR_COLORS = {
  1: { bg: '#3b82f6', border: '#2563eb' }, // blue
  2: { bg: '#10b981', border: '#059669' }, // green
  3: { bg: '#8b5cf6', border: '#7c3aed' }, // purple
};

function scheduleToEvent(s) {
  const colors = FLOOR_COLORS[s.floor] || { bg: '#6b7280', border: '#4b5563' };
  return {
    id: s.id,
    title: `[${s.room}] ${s.title}`,
    start: s.start_time,
    end: s.end_time,
    backgroundColor: s.color || colors.bg,
    borderColor: s.color || colors.border,
    extendedProps: { ...s },
  };
}

export default function MonthlyCalendar({ schedules, onDeleted, onEventSelect }) {
  const calRef = useRef(null);

  // Re-render calendar when schedules change
  useEffect(() => {
    if (calRef.current) {
      const api = calRef.current.getApi();
      api.removeAllEvents();
      api.addEventSource(schedules.map(scheduleToEvent));
    }
  }, [schedules]);

  function renderEventContent(eventInfo) {
    const { floor, room, author, category } = eventInfo.event.extendedProps;
    const catLabel = CATEGORY_LABELS[category] || category;
    return (
      <div className="px-1 py-0.5 text-xs leading-tight truncate">
        <span className="font-semibold">{room}호</span>
        {' '}
        <span>{eventInfo.event.title.replace(`[${room}] `, '')}</span>
        <span className="opacity-75 ml-1">({catLabel})</span>
      </div>
    );
  }

  function handleEventClick(clickInfo) {
    const p = clickInfo.event.extendedProps;
    if (onEventSelect) onEventSelect(p);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full overflow-auto">
      <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
        <span className="text-blue-600">📅</span> 월별 예약 현황
        <span className="text-xs text-gray-400 font-normal ml-1">(예약 클릭 → 수정/삭제)</span>
      </h2>

      {/* Legend */}
      <div className="flex gap-4 mb-3 flex-wrap">
        {Object.entries(FLOOR_COLORS).map(([floor, c]) => (
          <span key={floor} className="flex items-center gap-1 text-xs text-gray-600">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: c.bg }}
            />
            {floor}층
          </span>
        ))}
      </div>

      <FullCalendar
        ref={calRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale="ko"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek',
        }}
        buttonText={{ today: '오늘', month: '월', week: '주' }}
        events={schedules.map(scheduleToEvent)}
        eventContent={renderEventContent}
        eventClick={handleEventClick}
        height="auto"
        eventDisplay="block"
        dayMaxEvents={3}
        moreLinkText={(n) => `+${n}건`}
      />
    </div>
  );
}
