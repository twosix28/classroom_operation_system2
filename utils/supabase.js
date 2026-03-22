import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── 서버 API Route 호출 헬퍼 ────────────────────────────────────────────────
// 쓰기 작업은 service_role 키를 사용하는 API Route를 통해서만 수행
// (anon 키로는 RLS에 의해 쓰기 차단됨)

function getAuthHeader() {
  if (typeof window === 'undefined') return {};
  const token = sessionStorage.getItem('classroom_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `요청 실패 (${res.status})`);
  return json;
}

// ─── Schedules ────────────────────────────────────────────────────────────────

export async function fetchSchedules() {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data;
}

/** Fetch schedules filtered by optional date range (for usage log) */
export async function fetchSchedulesByDateRange({ startDate, endDate } = {}) {
  let query = supabase
    .from('schedules')
    .select('*')
    .order('start_time', { ascending: false });
  if (startDate) {
    const s = new Date(startDate); s.setHours(0, 0, 0, 0);
    query = query.gte('start_time', s.toISOString());
  }
  if (endDate) {
    const e = new Date(endDate); e.setHours(23, 59, 59, 999);
    query = query.lte('start_time', e.toISOString());
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** Fetch today's + future schedules for dashboard */
export async function fetchDashboardSchedules() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .gte('end_time', startOfToday.toISOString())
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data;
}

export async function deleteSchedule(id) {
  await apiFetch(`/api/schedules/${id}`, 'DELETE');
}

export async function updateSchedule(id, payload) {
  return apiFetch(`/api/schedules/${id}`, 'PATCH', payload);
}

export async function createSchedule(payload) {
  return apiFetch('/api/schedules', 'POST', payload);
}

/** Returns overlapping schedules for the same room (excluding optional excludeId) */
export async function checkConflict({ floor, room, start_time, end_time, excludeId }) {
  let query = supabase
    .from('schedules')
    .select('id, title, start_time, end_time')
    .eq('floor', floor)
    .eq('room', room)
    .lt('start_time', end_time)
    .gt('end_time', start_time);

  if (excludeId) query = query.neq('id', excludeId);

  const { data, error } = await query;
  if (error) throw error;
  return data; // non-empty → conflict exists
}

// ─── Room Requests ────────────────────────────────────────────────────────────

export async function fetchRoomRequests({ status } = {}) {
  let query = supabase
    .from('room_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createRoomRequest(payload) {
  return apiFetch('/api/requests', 'POST', payload);
}

export async function resolveRoomRequest(id) {
  return apiFetch(`/api/requests/${id}`, 'PATCH');
}

// ─── Room Status Logs ─────────────────────────────────────────────────────────

export async function fetchRoomLogs({ floor, room, limit = 20 } = {}) {
  let query = supabase
    .from('room_status_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (floor) query = query.eq('floor', floor);
  if (room)  query = query.eq('room', room);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createRoomLog(payload) {
  try {
    await apiFetch('/api/logs', 'POST', payload);
  } catch (err) {
    console.error('room_status_logs insert error', err);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const FLOORS = [1, 2, 0];

export function getRoomsForFloor(floor) {
  const rooms = {
    1: ['133', '137'],
    2: ['231', '232', '233', '234', '235', '236', '239'],
    0: ['외부 시설'],
  };
  return rooms[floor] || [];
}

export const CATEGORY_LABELS = {
  lecture:  '강의',
  seminar:  '세미나',
  meeting:  '회의',
  other:    '기타',
};

export const ISSUE_TYPES = [
  '마커 부족',
  '물 필요',
  'TV / 프로젝터 불량',
  '컴퓨터 불량',
  '냉난방 문제',
  '청소 필요',
  '기타',
];

/** Given a list of schedules, return those currently active for a specific room */
export function getActiveSchedule(schedules, floor, room) {
  const now = new Date();
  return schedules.find(
    (s) =>
      String(s.floor) === String(floor) &&
      s.room === String(room) &&
      new Date(s.start_time) <= now &&
      new Date(s.end_time) >= now,
  ) || null;
}

/** True if usage ends within `thresholdMinutes` minutes */
export function isEndingSoon(schedule, thresholdMinutes = 15) {
  if (!schedule) return false;
  const now = new Date();
  const end = new Date(schedule.end_time);
  const diffMs = end - now;
  return diffMs > 0 && diffMs <= thresholdMinutes * 60 * 1000;
}

/** True if usage has already ended but is recent (within 30 min) */
export function isRecentlyEnded(schedule) {
  if (!schedule) return false;
  const now = new Date();
  const end = new Date(schedule.end_time);
  const diffMs = now - end;
  return diffMs > 0 && diffMs <= 30 * 60 * 1000;
}

export function formatTime(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDateTime(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
