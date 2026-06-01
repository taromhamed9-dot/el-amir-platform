-- ============================================================
-- MIGRATION: New Payment System (per-course + monthly/per-session)
-- ============================================================
--
-- HOW TO RUN
--   1. Open Supabase Dashboard → SQL Editor → New query
--   2. Paste this ENTIRE file
--   3. Click "Run"
--   4. Wait for "Success. No rows returned."
--   5. Hard-refresh the app (Ctrl+Shift+R)
--
-- WHAT IT DOES
--   • Adds course.session_price + course.sessions_per_month
--     (monthly_price is derived = session_price × sessions_per_month)
--   • Adds students.payment_model ('monthly' | 'per_session')
--   • TRUNCATES payments + attendance (clean slate for testing)
--   • Replaces every student/teacher email with hamedtarom14@gmail.com
--   • Reloads PostgREST schema cache so the new columns are queryable
--     immediately without redeploying the backend.
-- ============================================================

BEGIN;

-- ── 1. courses: per-session pricing + session count ─────────
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS session_price DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS sessions_per_month INTEGER NOT NULL DEFAULT 4
    CHECK (sessions_per_month BETWEEN 1 AND 20);

-- Optional: per-course custom session labels (overrides "حصة N شهر …")
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS session_labels JSONB;

-- Backfill session_price from legacy `price` (assume price = monthly price)
-- so existing courses don't break. Safe to re-run.
UPDATE courses
SET session_price = ROUND((price / NULLIF(sessions_per_month, 0))::numeric, 2)
WHERE session_price = 0 AND price > 0;

-- ── 2. students: per-enrollment payment model ───────────────
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS payment_model VARCHAR(20) NOT NULL DEFAULT 'per_session'
    CHECK (payment_model IN ('monthly', 'per_session'));

-- ── 3. WIPE payments + attendance (user explicitly requested) ─
TRUNCATE TABLE payments  RESTART IDENTITY CASCADE;
TRUNCATE TABLE attendance RESTART IDENTITY CASCADE;

-- ── 4. Force every student + teacher email to a single inbox ─
UPDATE students SET email = 'hamedtarom14@gmail.com';
UPDATE teachers SET email = 'hamedtarom14@gmail.com';

-- ── 5. Reload PostgREST so new columns are immediately exposed ──
NOTIFY pgrst, 'reload schema';

COMMIT;

-- After running, verify with:
--   SELECT id, name, price, session_price, sessions_per_month FROM courses LIMIT 5;
--   SELECT id, first_name, last_name, payment_model, email FROM students LIMIT 5;
--   SELECT email FROM teachers LIMIT 5;
--   SELECT COUNT(*) FROM payments;   -- should be 0
--   SELECT COUNT(*) FROM attendance; -- should be 0
