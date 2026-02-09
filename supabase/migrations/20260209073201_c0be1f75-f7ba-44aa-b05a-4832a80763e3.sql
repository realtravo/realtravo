
-- Add columns for accommodation-only external booking links and source info
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS general_booking_link text;
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS link_source_name text;
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS link_source_url text;
