-- Add missing columns to existing bank_details table
ALTER TABLE public.bank_details
ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS previous_account_holder_name text,
ADD COLUMN IF NOT EXISTS previous_bank_name text,
ADD COLUMN IF NOT EXISTS previous_account_number text,
ADD COLUMN IF NOT EXISTS previous_verified_at timestamp with time zone;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Admins can view all bank details" ON public.bank_details;
DROP POLICY IF EXISTS "Admins can update all bank details" ON public.bank_details;

-- Admins can view all bank details
CREATE POLICY "Admins can view all bank details"
  ON public.bank_details
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update all bank details  
CREATE POLICY "Admins can update all bank details"
  ON public.bank_details
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bank_details_verification_status ON public.bank_details(verification_status);