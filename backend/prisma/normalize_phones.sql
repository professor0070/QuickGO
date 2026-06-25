-- Normalize phone numbers in "User" to canonical +91XXXXXXXXXX
-- Safe migration: records conflicts in phone_normalization_issues and only updates non-conflicting rows.

BEGIN;

CREATE TABLE IF NOT EXISTS phone_normalization_issues (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  old_phone TEXT,
  new_phone TEXT,
  conflicting_user_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

WITH candidates AS (
  SELECT id, phone, regexp_replace(coalesce(phone, ''), '\\D', '', 'g') AS digits
  FROM "User"
),
normalized AS (
  SELECT
    id,
    phone,
    digits,
    CASE
      WHEN length(digits) = 12 AND digits LIKE '91%' THEN right(digits, 10)
      WHEN length(digits) = 11 AND digits LIKE '0%' THEN right(digits, 10)
      WHEN length(digits) = 10 THEN digits
      ELSE NULL
    END AS ten,
    CASE
      WHEN length(digits) = 12 AND digits LIKE '91%' THEN '+91' || right(digits, 10)
      WHEN length(digits) = 11 AND digits LIKE '0%' THEN '+91' || right(digits, 10)
      WHEN length(digits) = 10 THEN '+91' || digits
      ELSE NULL
    END AS normalized_phone
  FROM candidates
)
-- Log conflicts where another user already has the normalized phone
INSERT INTO phone_normalization_issues (user_id, old_phone, new_phone, conflicting_user_id, note)
SELECT n.id, n.phone, n.normalized_phone, u2.id,
  'conflict: another user exists with the normalized phone'::text
FROM normalized n
JOIN "User" u2 ON u2.phone = n.normalized_phone
WHERE n.normalized_phone IS NOT NULL
  AND u2.id <> n.id
  AND n.phone <> n.normalized_phone;

-- Update only rows where no conflicting user exists for the resulting normalized phone
WITH to_update AS (
  SELECT n.id, n.phone, n.normalized_phone
  FROM normalized n
  LEFT JOIN "User" u2 ON u2.phone = n.normalized_phone AND u2.id <> n.id
  WHERE n.normalized_phone IS NOT NULL
    AND n.phone <> n.normalized_phone
    AND u2.id IS NULL
)
UPDATE "User" u
SET phone = t.normalized_phone,
    "updatedAt" = now()
FROM to_update t
WHERE u.id = t.id;

COMMIT;

-- Notes:
-- 1) This script only updates the "User" table. Consider extending similar logic to
--    "OtpSession" (otp session phone), "Rider" (rider.phone), "Vendor" (ownerPhone),
--    and address receiverPhone fields where appropriate.
-- 2) If conflicts are detected (inserted into phone_normalization_issues), resolve them
--    manually before re-running or extending the migration.
-- 3) Run this during a maintenance window and back up the database first.
