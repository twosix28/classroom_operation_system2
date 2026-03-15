import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  const { error } = await supabase.from('schedules').delete().eq('id', id);
  if (error) throw error;
}

export async function updateSchedule(id, payload) {
  const { data, error } = await supabase
    .from('schedules')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createSchedule(payload) {
  const { data, error } = await supabase
    .from('schedules')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
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
  const { data, error } = await supabase
    .from('room_requests')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function resolveRoomRequest(id) {
  const { data, error } = await supabase
    .from('room_requests')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
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
  const { error } = await supabase.from('room_status_logs').insert([payload]);
  if (error) console.error('room_status_logs insert error', error);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const FLOORS = [1, 2, 3];

export function getRoomsForFloor(floor) {
  return Array.from({ length: 10 }, (_, i) => `${floor}${String(i + 1).padStart(2, '0')}`);
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
