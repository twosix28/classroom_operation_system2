'use client';

import { CATEGORY_LABELS } from '../utils/supabase';

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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
