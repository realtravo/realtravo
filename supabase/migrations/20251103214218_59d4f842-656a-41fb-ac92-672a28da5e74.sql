-- Add database constraints for data integrity (excluding auth.users)

-- 1. Add UNIQUE constraint on phone_number in profiles table (allow NULL)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_phone_number'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT unique_phone_number UNIQUE (phone_number);
  END IF;
END $$;

-- 2. Add UNIQUE constraint on business_registration_number in business_accounts table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_business_registration_number'
  ) THEN
    ALTER TABLE public.business_accounts 
    ADD CONSTRAINT unique_business_registration_number UNIQUE (business_registration_number);
  END IF;
END $$;

-- 3. Add UNIQUE constraint on business_phone_number in business_accounts table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_business_phone_number'
  ) THEN
    ALTER TABLE public.business_accounts 
    ADD CONSTRAINT unique_business_phone_number UNIQUE (business_phone_number);
  END IF;
END $$;