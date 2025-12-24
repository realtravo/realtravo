-- Add operating hours and days columns to trips table
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS opening_hours text,
ADD COLUMN IF NOT EXISTS closing_hours text,
ADD COLUMN IF NOT EXISTS days_opened text[] DEFAULT ARRAY[]::text[];