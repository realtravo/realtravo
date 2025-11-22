-- Create bank_details table for storing user payment information
CREATE TABLE IF NOT EXISTS public.bank_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_holder_name text NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  last_updated timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.bank_details ENABLE ROW LEVEL SECURITY;

-- Users can view their own bank details
CREATE POLICY "Users can view their own bank details"
  ON public.bank_details
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own bank details
CREATE POLICY "Users can insert their own bank details"
  ON public.bank_details
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own bank details (once per month restriction handled in frontend)
CREATE POLICY "Users can update their own bank details"
  ON public.bank_details
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_bank_details_user_id ON public.bank_details(user_id);