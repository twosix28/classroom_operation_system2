'use client';

import { useState, useEffect } from 'react';
import FloorRoomSelector from './FloorRoomSelector';
import StudentListUpload from './StudentListUpload';
import {
  CATEGORY_LABELS,
  checkConflict,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  createRoomLog,
} from '../utils/supabase';

const COLORS_BY_FLOOR = { 1: '#3b82f6', 2: '#10b981', 3: '#8b5cf6', 0: '#6b7280' };

function toLocalDatetimeString(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ReservationForm({ onSaved, editingSchedule, onEdited, onDeleted, onEditClear }) {
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
  const [students, setStudents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Populate form when an existing schedule is selected for editing
  useEffect(() => {
    if (!editingSchedule) return;
    setFloor(editingSchedule.floor);
    setRoom(editingSchedule.room);
    setTitle(editingSchedule.title || '');
    setProjectName(editingSchedule.project_name || '');
    setStudentCount(editingSchedule.student_count ?? '');
    setCategory(editingSchedule.category || 'lecture');
    setStartTime(toLocalDatetimeString(new Date(editingSchedule.start_time)));
    setEndTime(toLocalDatetimeString(new Date(editingSchedule.end_time)));
    setAuthor(editingSchedule.author || '');
    setFacilityManager(editingSchedule.facility_manager || '');
    setRequestNote(editingSchedule.request_note || '');
    setStudents(Array.isArray(editingSchedule.students) ? editingSchedule.students : []);
    setError('');
    setSuccess(false);
  }, [editingSchedule]);

  function resetForm() {
    setFloor(''); setRoom(''); setTitle(''); setProjectName('');
    setStudentCount(''); setCategory('lecture');
    setAuthor(''); setFacilityManager(''); setRequestNote('');
    setStudents([]);
    setStartTime(toLocalDatetimeString(new Date()));
    setEndTime(toLocalDatetimeString(new Date(Date.now() + 3600000)));
    setError(''); setSuccess(false);
  }

  async function handleDelete() {
    if (!window.confirm(`"${title}" 예약을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setLoading(true);
    try {
      await deleteSchedule(editingSchedule.id);
      if (onDeleted) onDeleted(editingSchedule.id);
      if (onEditClear) onEditClear();
      resetForm();
    } catch (err) {
      setError('삭제 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if ((floor === '' || floor === null || floor === undefined) || !room) {
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
        excludeId: editingSchedule?.id,
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

      const payload = {
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
        students: students.length > 0 ? students : [],
      };

      if (editingSchedule) {
        const updated = await updateSchedule(editingSchedule.id, payload);
        await createRoomLog({
          floor: Number(floor),
          room,
          status_type: 'usage_started',
          message: `"${title.trim()}" 예약이 수정되었습니다. (신청자: ${author.trim()})`,
        });
        setSuccess(true);
        if (onEdited) onEdited(updated);
        if (onEditClear) onEditClear();
        resetForm();
      } else {
        const saved = await createSchedule({ ...payload, color: COLORS_BY_FLOOR[floor] || '#6b7280' });
        await createRoomLog({
          floor: Number(floor),
          room,
          status_type: 'usage_started',
          message: `"${title.trim()}" 예약이 등록되었습니다. (신청자: ${author.trim()})`,
        });
        setSuccess(true);
        resetForm();
        if (onSaved) onSaved(saved);
      }
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('저장 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span className={editingSchedule ? 'text-amber-500' : 'text-green-600'}>
            {editingSchedule ? '✏️' : '📝'}
          </span>
          {editingSchedule ? '예약 수정' : '강의실 예약'}
        </h2>
        {editingSchedule && (
          <button
            type="button"
            onClick={() => { if (onEditClear) onEditClear(); resetForm(); }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
          >
            새 예약 작성
          </button>
        )}
      </div>
      {editingSchedule && (
        <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          선택된 예약: <span className="font-semibold">{editingSchedule.room}호 — {editingSchedule.title}</span>
        </div>
      )}

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

        {/* Student List */}
        <StudentListUpload students={students} onChange={setStudents} />

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
          className={`w-full py-2.5 text-white font-semibold rounded-lg transition-colors text-sm disabled:opacity-60 ${
            editingSchedule
              ? 'bg-amber-500 hover:bg-amber-600'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? '저장 중...' : editingSchedule ? '수정 완료' : '예약 등록'}
        </button>

        {editingSchedule && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors text-sm"
          >
            예약 삭제
          </button>
        )}
      </form>
    </div>
  );
}
