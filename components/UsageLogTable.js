'use client';

import { CATEGORY_LABELS } from '../utils/supabase';

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

function downloadStudentCSV(schedule) {
  const students = schedule.students;
  if (!students || !students.length) return;

  const start = new Date(schedule.start_time);
  const end = new Date(schedule.end_time);
  const isMultiDay = start.toDateString() !== end.toDateString();

  let headers, rows;
  if (isMultiDay) {
    const days = getScheduleDays(schedule.start_time, schedule.end_time);
    const dayLabels = days.map((d) =>
      new Date(d + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })
    );
    // 날짜별 비고 컬럼 + 날짜별 출석 컬럼 순서로 구성
    headers = [
      '순번', '이름', '연락처',
      ...dayLabels.map((l) => `비고_${l}`),
      ...dayLabels.map((l) => `출석_${l}`),
    ];
    rows = students.map((s) => [
      s.seq ?? '',
      s.name ?? '',
      s.phone ?? '',
      ...days.map((d) => s.notes?.[d] ?? s.note ?? ''),
      ...days.map((d) => (s.checkedDates?.[d] ? 'O' : '')),
    ]);
  } else {
    headers = ['순번', '이름', '연락처', '비고', '출석'];
    rows = students.map((s) => [
      s.seq ?? '',
      s.name ?? '',
      s.phone ?? '',
      s.note ?? '',
      s.checked ? 'O' : '',
    ]);
  }

  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const title = (schedule.project_name || schedule.title || 'students').replace(/[/\\?%*:|"<>]/g, '-');
  const date = start.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace('.', '');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `명단-${title}-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const COLS = [
  { key: 'floor',            label: '층' },
  { key: 'room',             label: '호실' },
  { key: 'project_name',     label: '사업명' },
  { key: 'category',         label: '분류' },
  { key: 'title',            label: '강의명' },
  { key: 'author',           label: '강사명' },
  { key: 'student_count',    label: '수강생 수' },
  { key: 'start_time',       label: '시작시간' },
  { key: 'end_time',         label: '종료시간' },
  { key: 'facility_manager', label: '관리자' },
  { key: 'created_at',       label: '등록일시' },
];

function fmt(isoString, includeDate = true) {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleString('ko-KR', {
    year: includeDate ? 'numeric' : undefined,
    month: includeDate ? 'short' : undefined,
    day: includeDate ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function CellValue({ col, row }) {
  const v = row[col.key];
  switch (col.key) {
    case 'floor':         return v ? `${v}층` : '-';
    case 'category':      return CATEGORY_LABELS[v] || v || '-';
    case 'student_count': return v != null ? `${v}명` : '-';
    case 'start_time':
    case 'end_time':
    case 'created_at':    return fmt(v);
    default:              return v || '-';
  }
}

export default function UsageLogTable({ data }) {
  if (!data.length) {
    return (
      <div className="py-16 text-center text-gray-400 bg-white rounded-xl border border-gray-200">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-sm">조회된 사용 이력이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap w-10">
              No.
            </th>
            {COLS.map((col) => (
              <th
                key={col.key}
                className="px-3 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
            <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 whitespace-nowrap w-20">
              수강생 명단
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {data.map((row, i) => (
            <tr key={row.id} className="hover:bg-blue-50 transition-colors">
              <td className="px-3 py-2.5 text-gray-400 text-xs">{i + 1}</td>
              {COLS.map((col) => (
                <td key={col.key} className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                  <CellValue col={col} row={row} />
                </td>
              ))}
              <td className="px-3 py-2.5 text-center">
                {Array.isArray(row.students) && row.students.length > 0 ? (
                  <button
                    onClick={() => downloadStudentCSV(row)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors whitespace-nowrap"
                  >
                    ⬇ 명단
                  </button>
                ) : (
                  <span className="text-gray-300 text-xs">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
