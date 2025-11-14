-- Remove date_type column from trips and events tables as all dates are now fixed
-- This prevents database errors and simplifies the booking system

-- For trips table
ALTER TABLE trips DROP COLUMN IF EXISTS date_type;

-- For events table (if it has date_type)
ALTER TABLE events DROP COLUMN IF EXISTS date_type;