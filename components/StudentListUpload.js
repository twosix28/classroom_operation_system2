'use client';

import { useRef } from 'react';
import * as XLSX from 'xlsx';

/**
 * 수강생 명단 업로드 + 수동 편집 컴포넌트
 * students: [{ seq, name, phone, note, checked }]
 * onChange(students): 상위에 변경된 배열 전달
 */
export default function StudentListUpload({ students = [], onChange }) {
  const fileRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      // 첫 행이 헤더인지 확인 (이름 컬럼이 문자열이면 헤더로 간주)
      const start = rows.length > 0 && isNaN(Number(rows[0][0])) ? 1 : 0;
      const parsed = rows.slice(start)
        .filter((r) => String(r[1] || '').trim())
        .map((r, i) => ({
          seq: Number(r[0]) || i + 1,
          name: String(r[1] || '').trim(),
          phone: String(r[2] || '').trim(),
          note: String(r[3] || '').trim(),
          checked: false,
        }));
      onChange(parsed);
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  }

  function addRow() {
    onChange([...students, { seq: students.length + 1, name: '', phone: '', note: '', checked: false }]);
  }

  function removeRow(idx) {
    const next = students.filter((_, i) => i !== idx).map((s, i) => ({ ...s, seq: i + 1 }));
    onChange(next);
  }

  function updateCell(idx, field, value) {
    onChange(students.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-700">
          수강생 명단 <span className="text-xs text-gray-400 font-normal">(선택)</span>
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-xs px-2.5 py-1 rounded-lg bg-green-50 hover:bg-green-100 border border-green-300 text-green-700 font-semibold transition-colors"
          >
            📂 엑셀 업로드
          </button>
          <button
            type="button"
            onClick={addRow}
            className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-700 font-semibold transition-colors"
          >
            + 행 추가
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      </div>

      {students.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-2 py-2 text-gray-500 font-semibold w-10 text-center">순번</th>
                <th className="px-2 py-2 text-gray-500 font-semibold text-left">이름</th>
                <th className="px-2 py-2 text-gray-500 font-semibold text-left">연락처</th>
                <th className="px-2 py-2 text-gray-500 font-semibold text-left">비고</th>
                <th className="px-2 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="px-2 py-1.5 text-center text-gray-500">{s.seq}</td>
                  <td className="px-2 py-1.5">
                    <input
                      value={s.name}
                      onChange={(e) => updateCell(i, 'name', e.target.value)}
                      className="w-full bg-transparent border-0 focus:outline-none focus:bg-blue-50 rounded px-1"
                      placeholder="이름"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={s.phone}
                      onChange={(e) => updateCell(i, 'phone', e.target.value)}
                      className="w-full bg-transparent border-0 focus:outline-none focus:bg-blue-50 rounded px-1"
                      placeholder="010-0000-0000"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={s.note}
                      onChange={(e) => updateCell(i, 'note', e.target.value)}
                      className="w-full bg-transparent border-0 focus:outline-none focus:bg-blue-50 rounded px-1"
                      placeholder="-"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-gray-300 hover:text-red-400 transition-colors font-bold"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {students.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-3 border border-dashed border-gray-200 rounded-lg">
          엑셀 업로드 또는 행 추가로 수강생을 등록하세요
        </p>
      )}
    </div>
  );
}
