'use client';

import { useState, useEffect } from 'react';
import { updateSchedule } from '../utils/supabase';

function formatPeriod(start_time, end_time) {
  const s = new Date(start_time);
  const e = new Date(end_time);
  const opts = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
  return `${s.toLocaleString('ko-KR', opts)} ~ ${e.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
}

function getScheduleDays(start_time, end_time) {
  const days = [];
  const current = new Date(start_time);
  current.setHours(0, 0, 0, 0);
  const endDay = new Date(end_time);
  endDay.setHours(0, 0, 0, 0);
  while (current <= endDay) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    days.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function formatDayTab(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
}

export default function StudentListModal({ schedule, onClose, onUpdated }) {
  const [students, setStudents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  const days = schedule ? getScheduleDays(schedule.start_time, schedule.end_time) : [];
  const isMultiDay = days.length > 1;

  useEffect(() => {
    setStudents(Array.isArray(schedule?.students) ? schedule.students : []);
    if (schedule) {
      setSelectedDay(getScheduleDays(schedule.start_time, schedule.end_time)[0]);
    }
  }, [schedule]);

  if (!schedule) return null;

  async function toggleCheck(idx) {
    let next;
    if (isMultiDay) {
      next = students.map((s, i) => {
        if (i !== idx) return s;
        const checkedDates = { ...(s.checkedDates || {}), [selectedDay]: !(s.checkedDates?.[selectedDay] ?? false) };
        return { ...s, checkedDates };
      });
    } else {
      next = students.map((s, i) => i === idx ? { ...s, checked: !s.checked } : s);
    }
    setStudents(next);
    setSaving(true);
    try {
      await updateSchedule(schedule.id, { students: next });
      if (onUpdated) onUpdated({ ...schedule, students: next });
    } catch (err) {
      console.error('수강생 체크 저장 오류:', err);
    } finally {
      setSaving(false);
    }
  }

  const isChecked = (s) => isMultiDay
    ? (s.checkedDates?.[selectedDay] ?? false)
    : !!s.checked;

  const checkedCount = students.filter(isChecked).length;
  const locationLabel = schedule.floor === 0 ? schedule.room : `${schedule.floor}층 ${schedule.room}호`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">
              {locationLabel} · {formatPeriod(schedule.start_time, schedule.end_time)}
            </p>
            <h2 className="text-base font-bold text-gray-900 leading-snug truncate">
              {schedule.project_name || schedule.title}
            </h2>
            {schedule.project_name && schedule.project_name !== schedule.title && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{schedule.title}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-colors shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Day tabs — multi-day schedules only */}
        {isMultiDay && (
          <div className="px-5 pt-3 pb-3 flex flex-wrap gap-2 border-b border-gray-100">
            {days.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  selectedDay === day
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                }`}
              >
                {formatDayTab(day)}
              </button>
            ))}
          </div>
        )}

        {/* Stats bar */}
        {students.length > 0 && (
          <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-4 text-sm">
            <span className="text-gray-600">
              총 <span className="font-bold text-gray-900">{students.length}</span>명
            </span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-600">
              확인 <span className="font-bold text-green-600">{checkedCount}</span>명
            </span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-600">
              미확인 <span className="font-bold text-amber-600">{students.length - checkedCount}</span>명
            </span>
            {saving && <span className="ml-auto text-xs text-gray-400">저장 중...</span>}
          </div>
        )}

        {/* Table */}
        <div className="overflow-y-auto flex-1">
          {students.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              <p className="text-3xl mb-2">📋</p>
              <p>등록된 수강생 명단이 없습니다.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 w-12">순번</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">이름</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">연락처</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">비고</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 w-14">확인</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const checked = isChecked(s);
                  return (
                    <tr
                      key={i}
                      className={`border-b border-gray-50 transition-colors ${
                        checked ? 'bg-green-50' : i % 2 === 1 ? 'bg-gray-50/50' : ''
                      }`}
                    >
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{s.seq}</td>
                      <td className={`px-4 py-2.5 font-medium ${checked ? 'text-green-700 line-through' : 'text-gray-900'}`}>
                        {s.name}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 tabular-nums">{s.phone || '-'}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{s.note || '-'}</td>
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCheck(i)}
                          className="w-4 h-4 accent-green-500 cursor-pointer"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
