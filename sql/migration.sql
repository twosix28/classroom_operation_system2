-- ============================================================
-- Classroom Reservation & Management System - DB Migration
-- ============================================================

-- 1. Create schedules table (safe: does nothing if already exists)
CREATE TABLE IF NOT EXISTS schedules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  start_time   TIMESTAMPTZ NOT NULL,
  end_time     TIMESTAMPTZ NOT NULL,
  author       TEXT,
  color        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  floor        INTEGER,
  room         TEXT,
  category     TEXT DEFAULT 'other',
  request_note TEXT
);

-- If schedules already existed, add any missing columns individually
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS floor        INTEGER;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS room         TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS category     TEXT DEFAULT 'other';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS request_note TEXT;

-- 2. Create room_requests table
CREATE TABLE IF NOT EXISTS room_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor       INTEGER NOT NULL,
  room        TEXT    NOT NULL,
  issue_type  TEXT    NOT NULL,
  detail      TEXT,
  status      TEXT    NOT NULL DEFAULT 'open',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 3. Create room_status_logs table (optional activity log)
CREATE TABLE IF NOT EXISTS room_status_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor       INTEGER NOT NULL,
  room        TEXT    NOT NULL,
  status_type TEXT    NOT NULL,   -- e.g. 'usage_started','ending_soon','usage_ended','issue_submitted','issue_resolved'
  message     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Enable Realtime for all required tables
-- Run these in Supabase Dashboard → Database → Replication if not already done
-- (SQL equivalent shown below – requires superuser in hosted Supabase)
ALTER PUBLICATION supabase_realtime ADD TABLE schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE room_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE room_status_logs;

-- 5. Handy indexes for query performance
CREATE INDEX IF NOT EXISTS idx_schedules_room      ON schedules (floor, room);
CREATE INDEX IF NOT EXISTS idx_schedules_time      ON schedules (start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_room_requests_room  ON room_requests (floor, room, status);
CREATE INDEX IF NOT EXISTS idx_room_logs_room      ON room_status_logs (floor, room, created_at DESC);
