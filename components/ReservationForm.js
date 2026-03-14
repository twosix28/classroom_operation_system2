'use client';

import { useState } from 'react';
import FloorRoomSelector from './FloorRoomSelector';
import {
  CATEGORY_LABELS,
  checkConflict,
  createSchedule,
  createRoomLog,
} from '../utils/supabase';

const COLORS_BY_FLOOR = { 1: '#3b82f6', 2: '#10b981', 3: '#8b5cf6' };

function toLocalDatetimeString(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ReservationForm({ onSaved }) {
  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000);

  const [floor, setFloor] = useState('');
  const [room, setRoom] = useState('');
  const [title, setTitle] = useState('');
  const [projectName, setProjectName] = useState('');
  const [studentCount, setStudentCount] = useState('');
  const [category, setCategory] = useState('lecture');
  const [startTime, setStartTime] = useState(toLocalDatetimeString(now));
  const [endTime, setEndTime] = useState(toLocalDatetimeString(later));
  const [author, setAuthor] = useState('');
  const [facilityManager, setFacilityManager] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!floor || !room) {
      setError('층과 강의실을 선택해 주세요.');
      return;
    }
    if (!title.trim()) {
      setError('사용 목적을 입력해 주세요.');
      return;
    }
    if (!author.trim()) {
      setError('신청자 이름을 입력해 주세요.');
      return;
    }

    const startISO = new Date(startTime).toISOString();
    const endISO = new Date(endTime).toISOString();

    if (new Date(startISO) >= new Date(endISO)) {
      setError('종료 시간은 시작 시간보다 이후여야 합니다.');
      return;
    }

    setLoading(true);
    try {
      // Conflict check
      const conflicts = await checkConflict({
        floor: Number(floor),
        room,
        start_time: startISO,
        end_time: endISO,
      });

      if (conflicts.length > 0) {
        const c = conflicts[0];
        const startFmt = new Date(c.start_time).toLocaleString('ko-KR', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
        });
        const endFmt = new Date(c.end_time).toLocaleTimeString('ko-KR', {
          hour: '2-digit', minute: '2-digit', hour12: false,
        });
        setError(
          `⚠️ 예약 충돌! 해당 강의실은 이미 예약되어 있습니다.\n` +
          `"${c.title}" (${startFmt} ~ ${endFmt})`
        );
        return;
      }

      const saved = await createSchedule({
        floor: Number(floor),
        room,
        title: title.trim(),
        project_name: projectName.trim() || null,
        student_count: studentCount ? Number(studentCount) : null,
        category,
        start_time: startISO,
        end_time: endISO,
        author: author.trim(),
        facility_manager: facilityManager.trim() || null,
        request_note: requestNote.trim() || null,
        color: COLORS_BY_FLOOR[floor] || '#6b7280',
      });

      await createRoomLog({
        floor: Number(floor),
        room,
        status_type: 'usage_started',
        message: `"${title.trim()}" 예약이 등록되었습니다. (신청자: ${author.trim()})`,
      });

      setSuccess(true);
      setTitle('');
      setProjectName('');
      setStudentCount('');
      setCategory('lecture');
      setRequestNote('');
      setAuthor('');
      setFacilityManager('');
      setStartTime(toLocalDatetimeString(new Date()));
      setEndTime(toLocalDatetimeString(new Date(Date.now() + 3600000)));

      if (onSaved) onSaved(saved);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('저장 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full overflow-auto">
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span className="text-green-600">📝</span> 강의실 예약
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Floor + Room */}
        <FloorRoomSelector
          selectedFloor={floor}
          selectedRoom={room}
          onFloorChange={setFloor}
          onRoomChange={setRoom}
        />

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">사용 목적 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 항공우주공학 강의"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Project Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">사업명 (선택)</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="예: 항공우주 인재양성 사업"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category + Student Count */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">분류 *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">수강생 수 (선택)</label>
            <input
              type="number"
              min="1"
              value={studentCount}
              onChange={(e) => setStudentCount(e.target.value)}
              placeholder="명"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Start Time */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">시작 시간 *</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* End Time */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">종료 시간 *</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Author + Facility Manager */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">강사명 *</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="이름을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">시설 관리 담당자</label>
            <input
              type="text"
              value={facilityManager}
              onChange={(e) => setFacilityManager(e.target.value)}
              placeholder="담당자 이름"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">메모 (선택)</label>
          <textarea
            value={requestNote}
            onChange={(e) => setRequestNote(e.target.value)}
            rows={2}
            placeholder="특이사항이나 요청사항을 입력하세요"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 whitespace-pre-line">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
            ✅ 예약이 성공적으로 등록되었습니다.
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors text-sm"
        >
          {loading ? '저장 중...' : '예약 등록'}
        </button>
      </form>
    </div>
  );
}
