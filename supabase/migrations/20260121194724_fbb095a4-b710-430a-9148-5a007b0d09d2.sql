-- Add payout_status column to bookings table for escrow tracking
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'scheduled' CHECK (payout_status IN ('scheduled', 'processing', 'paid', 'failed')),
ADD COLUMN IF NOT EXISTS payout_scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payout_processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payout_reference TEXT,
ADD COLUMN IF NOT EXISTS service_fee_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS host_payout_amount NUMERIC DEFAULT 0;

-- Add withdrawal fields to referral_commissions
ALTER TABLE public.referral_commissions
ADD COLUMN IF NOT EXISTS withdrawal_reference TEXT,
ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMP WITH TIME ZONE;

-- Create payouts table for tracking all transfers
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('host', 'referrer')),
  booking_id UUID REFERENCES public.bookings(id),
  commission_id UUID REFERENCES public.referral_commissions(id),
  amount NUMERIC NOT NULL,
  bank_code TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  transfer_code TEXT,
  reference TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'reversed')),
  failure_reason TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on payouts
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- RLS policies for payouts
CREATE POLICY "Users can view their own payouts" ON public.payouts
FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Admins can view all payouts" ON public.payouts
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage payouts" ON public.payouts
FOR ALL USING (auth.role() = 'service_role');

-- Create transfer recipients table for Paystack
CREATE TABLE IF NOT EXISTS public.transfer_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  recipient_code TEXT NOT NULL,
  bank_code TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  bank_name TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on transfer_recipients
ALTER TABLE public.transfer_recipients ENABLE ROW LEVEL SECURITY;

-- RLS policies for transfer_recipients
CREATE POLICY "Users can view own recipient" ON public.transfer_recipients
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own recipient" ON public.transfer_recipients
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipient" ON public.transfer_recipients
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all recipients" ON public.transfer_recipients
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage recipients" ON public.transfer_recipients
FOR ALL USING (auth.role() = 'service_role');

-- Create index for faster payout queries
CREATE INDEX IF NOT EXISTS idx_payouts_status_scheduled ON public.payouts(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_bookings_payout_status ON public.bookings(payout_status, visit_date) WHERE payout_status = 'scheduled';