'use client';

import { CATEGORY_LABELS } from '../utils/supabase';

const STATUS_CONFIG = {
  active: {
    label: '사용 중',
    cardClass: 'bg-blue-50 border-blue-300',
    badgeClass: 'bg-blue-600 text-white',
  },
  today: {
    label: '오늘 사용 예정',
    cardClass: 'bg-amber-50 border-amber-200',
    badgeClass: 'bg-amber-500 text-white',
  },
  upcoming: {
    label: '앞으로 예정',
    cardClass: 'bg-gray-50 border-gray-200',
    badgeClass: 'bg-gray-500 text-white',
  },
};

function formatPeriod(start_time, end_time) {
  const start = new Date(start_time);
  const end = new Date(end_time);
  const dateOpts = { month: 'short', day: 'numeric' };
  const timeOpts = { hour: '2-digit', minute: '2-digit', hour12: false };
  const sameDay = start.toDateString() === end.toDateString();
  const dateStr = start.toLocaleDateString('ko-KR', dateOpts);
  const startT = start.toLocaleTimeString('ko-KR', timeOpts);
  const endT = end.toLocaleTimeString('ko-KR', timeOpts);
  if (sameDay) return `${dateStr}  ${startT} ~ ${endT}`;
  const endDateStr = end.toLocaleDateString('ko-KR', dateOpts);
  return `${dateStr} ${startT} ~ ${endDateStr} ${endT}`;
}

export default function DashboardScheduleCard({ schedule, status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.upcoming;
  const catLabel = CATEGORY_LABELS[schedule.category] || schedule.category;

  return (
    <div className={`rounded-xl border ${cfg.cardClass} p-4 flex flex-col gap-3`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.badgeClass}`}>
          {cfg.label}
        </span>
        <span className="text-sm font-semibold text-gray-700 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shrink-0">
          {schedule.floor}층 {schedule.room}호
        </span>
      </div>

      {/* Title / Project name */}
      <div>
        <p className="text-base font-bold text-gray-900 leading-snug">
          {schedule.project_name || schedule.title}
        </p>
        {schedule.project_name && schedule.project_name !== schedule.title && (
          <p className="text-xs text-gray-500 mt-0.5">{schedule.title}</p>
        )}
        <span className="inline-block mt-1 text-xs text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5">
          {catLabel}
        </span>
      </div>

      {/* Period */}
      <div className="flex items-center gap-1.5 text-sm text-gray-600">
        <span>🕐</span>
        <span>{formatPeriod(schedule.start_time, schedule.end_time)}</span>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-1 pt-2 border-t border-gray-200">
        <InfoItem label="강사명" value={schedule.author || '-'} />
        <InfoItem label="수강생 수" value={schedule.student_count ? `${schedule.student_count}명` : '-'} />
        <InfoItem label="시설 담당자" value={schedule.facility_manager || '-'} />
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
    </div>
  );
}
