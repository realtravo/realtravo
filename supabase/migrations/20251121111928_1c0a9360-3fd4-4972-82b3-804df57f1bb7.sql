-- Add rejection_note column to trips table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trips' AND column_name = 'rejection_note'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN rejection_note TEXT;
  END IF;
END $$;

-- Add rejection_note column to hotels table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hotels' AND column_name = 'rejection_note'
  ) THEN
    ALTER TABLE public.hotels ADD COLUMN rejection_note TEXT;
  END IF;
END $$;

-- Add rejection_note column to adventure_places table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'adventure_places' AND column_name = 'rejection_note'
  ) THEN
    ALTER TABLE public.adventure_places ADD COLUMN rejection_note TEXT;
  END IF;
END $$;