'use client';

import { useEffect, useState } from 'react';
import {
  fetchRoomLogs,
  fetchRoomRequests,
  resolveRoomRequest,
  formatTime,
  formatDateTime,
  isEndingSoon,
  isRecentlyEnded,
  CATEGORY_LABELS,
} from '../utils/supabase';

const STATUS_TYPE_LABELS = {
  usage_started:   '예약 등록',
  ending_soon:     '종료 임박',
  usage_ended:     '사용 종료',
  issue_submitted: '요청 접수',
  issue_resolved:  '요청 해결',
};

const ISSUE_STATUS_LABELS = {
  open:     { label: '처리 중', cls: 'bg-red-100 text-red-700' },
  resolved: { label: '해결됨', cls: 'bg-green-100 text-green-700' },
};

export default function RoomDetailModal({ roomInfo, onClose, onRequestResolved }) {
  const { floor, room, activeSchedule, openRequests, state } = roomInfo;
  const [logs, setLogs] = useState([]);
  const [requests, setRequests] = useState(openRequests || []);
  const [loadingResolve, setLoadingResolve] = useState(null);

  useEffect(() => {
    async function load() {
      const [logData, reqData] = await Promise.all([
        fetchRoomLogs({ floor, room, limit: 10 }),
        fetchRoomRequests(),
      ]);
      setLogs(logData);
      setRequests(reqData.filter((r) => String(r.floor) === String(floor) && r.room === room));
    }
    load();
  }, [floor, room]);

  // Close on backdrop click
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  async function handleResolve(reqId) {
    setLoadingResolve(reqId);
    try {
      await resolveRoomRequest(reqId);
      setRequests((prev) => prev.map((r) => r.id === reqId ? { ...r, status: 'resolved', resolved_at: new Date().toISOString() } : r));
      if (onRequestResolved) onRequestResolved(reqId);
    } catch (err) {
      alert('처리 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setLoadingResolve(null);
    }
  }

  // Compose status messages
  const messages = [];
  if (activeSchedule) {
    if (isRecentlyEnded(activeSchedule)) {
      messages.push({ type: 'ended', text: `${activeSchedule.room}호 사용이 종료되었습니다. (${formatTime(activeSchedule.end_time)} 종료)` });
    } else if (isEndingSoon(activeSchedule)) {
      messages.push({ type: 'warning', text: `사용이 ${formatTime(activeSchedule.end_time)}에 종료됩니다. (종료 임박)` });
    } else {
      messages.push({ type: 'info', text: `현재 "${activeSchedule.title}" 사용 중 (${activeSchedule.author}), ${formatTime(activeSchedule.end_time)} 종료 예정` });
    }
  } else {
    messages.push({ type: 'ok', text: '현재 사용 중인 예약이 없습니다.' });
  }

  const openReqs = requests.filter((r) => r.status === 'open');
  openReqs.forEach((r) => {
    messages.push({ type: 'alert', text: `요청 접수: "${r.issue_type}" (${formatDateTime(r.created_at)})${r.detail ? ` — ${r.detail}` : ''}` });
  });

  const msgColors = {
    alert:   'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    ended:   'bg-orange-50 border-orange-200 text-orange-700',
    info:    'bg-blue-50 border-blue-200 text-blue-700',
    ok:      'bg-green-50 border-green-200 text-green-700',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-bold text-gray-800">{floor === 0 ? room : `${floor}층 ${room}호`}</h3>
            <p className="text-sm text-gray-500 mt-0.5">강의실 상세 정보</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Status messages */}
          <section>
            <h4 className="text-sm font-bold text-gray-700 mb-2">현재 상태</h4>
            <div className="space-y-2">
              {messages.map((m, i) => (
                <div key={i} className={`text-sm px-3 py-2 rounded-lg border ${msgColors[m.type]}`}>
                  {m.text}
                </div>
              ))}
            </div>
          </section>

          {/* Current reservation detail */}
          {activeSchedule && (
            <section>
              <h4 className="text-sm font-bold text-gray-700 mb-2">예약 상세</h4>
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
                <Row label="제목" value={activeSchedule.title} />
                <Row label="분류" value={CATEGORY_LABELS[activeSchedule.category] || activeSchedule.category} />
                <Row label="신청자" value={activeSchedule.author} />
                <Row label="시작" value={formatDateTime(activeSchedule.start_time)} />
                <Row label="종료" value={formatDateTime(activeSchedule.end_time)} />
                {activeSchedule.request_note && (
                  <Row label="메모" value={activeSchedule.request_note} />
                )}
              </div>
            </section>
          )}

          {/* Open requests */}
          {requests.length > 0 && (
            <section>
              <h4 className="text-sm font-bold text-gray-700 mb-2">요청 내역</h4>
              <div className="space-y-2">
                {requests.map((req) => {
                  const s = ISSUE_STATUS_LABELS[req.status] || { label: req.status, cls: 'bg-gray-100 text-gray-700' };
                  return (
                    <div key={req.id} className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-800">{req.issue_type}</span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${s.cls}`}>
                          {s.label}
                        </span>
                      </div>
                      {req.detail && (
                        <p className="text-xs text-gray-600">{req.detail}</p>
                      )}
                      <p className="text-[11px] text-gray-400">{formatDateTime(req.created_at)}</p>
                      {req.status === 'open' && (
                        <button
                          onClick={() => handleResolve(req.id)}
                          disabled={loadingResolve === req.id}
                          className="mt-1 text-xs font-semibold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {loadingResolve === req.id ? '처리 중...' : '해결됨으로 표시'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Activity log */}
          {logs.length > 0 && (
            <section>
              <h4 className="text-sm font-bold text-gray-700 mb-2">최근 활동 로그</h4>
              <div className="space-y-1.5">
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-2 text-xs text-gray-600">
                    <span className="text-gray-400 shrink-0 pt-0.5">{formatDateTime(log.created_at)}</span>
                    <span>
                      <span className="font-medium text-gray-700">
                        [{STATUS_TYPE_LABELS[log.status_type] || log.status_type}]
                      </span>{' '}
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-3">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 shrink-0 w-16">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  );
}
