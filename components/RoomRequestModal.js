'use client';

import { useState } from 'react';
import FloorRoomSelector from './FloorRoomSelector';
import { ISSUE_TYPES, createRoomRequest, createRoomLog } from '../utils/supabase';

export default function RoomRequestModal({ onClose, onSaved }) {
  const [floor, setFloor] = useState('');
  const [room, setRoom] = useState('');
  const [issueType, setIssueType] = useState('');
  const [detail, setDetail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!floor || !room) {
      setError('층과 강의실을 선택해 주세요.');
      return;
    }
    if (!issueType) {
      setError('요청 유형을 선택해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const saved = await createRoomRequest({
        floor: Number(floor),
        room,
        issue_type: issueType,
        detail: detail.trim() || null,
      });

      await createRoomLog({
        floor: Number(floor),
        room,
        status_type: 'issue_submitted',
        message: `"${issueType}" 요청이 접수되었습니다.${detail ? ` — ${detail.trim()}` : ''}`,
      });

      setSuccess(true);
      if (onSaved) onSaved(saved);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError('저장 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-red-50">
          <div>
            <h3 className="text-xl font-bold text-gray-800">강의실 도움 요청</h3>
            <p className="text-sm text-red-600 mt-0.5">문제가 있는 강의실을 선택하여 요청해 주세요</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg p-1.5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="text-5xl mb-3">✅</div>
            <p className="text-lg font-bold text-green-700">요청이 접수되었습니다</p>
            <p className="text-sm text-gray-500 mt-1">담당자에게 전달되었습니다.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Floor + Room */}
            <FloorRoomSelector
              selectedFloor={floor}
              selectedRoom={room}
              onFloorChange={setFloor}
              onRoomChange={setRoom}
            />

            {/* Issue type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">요청 유형 *</label>
              <div className="grid grid-cols-2 gap-2">
                {ISSUE_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setIssueType(type)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium text-left transition-all border ${
                      issueType === type
                        ? 'bg-red-600 text-white border-red-600 shadow-md'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-red-400 hover:text-red-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Detail */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">상세 내용 (선택)</label>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={3}
                placeholder="추가적인 내용을 입력해 주세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold rounded-lg text-sm transition-colors"
              >
                {loading ? '전송 중...' : '요청 제출'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
