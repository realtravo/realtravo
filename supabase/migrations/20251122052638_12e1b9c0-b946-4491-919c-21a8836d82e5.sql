-- Create referral settings table for admin configuration
CREATE TABLE IF NOT EXISTS public.referral_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_commission_rate numeric NOT NULL DEFAULT 5.0,
  host_commission_rate numeric NOT NULL DEFAULT 10.0,
  host_commission_duration_days integer NOT NULL DEFAULT 15,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert default settings
INSERT INTO public.referral_settings (booking_commission_rate, host_commission_rate, host_commission_duration_days)
VALUES (5.0, 10.0, 15);

-- Create referral tracking table
CREATE TABLE IF NOT EXISTS public.referral_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_type text NOT NULL, -- 'booking' or 'host'
  item_id uuid,
  item_type text,
  clicked_at timestamp with time zone DEFAULT now(),
  converted_at timestamp with time zone,
  status text DEFAULT 'pending', -- 'pending', 'converted', 'expired'
  created_at timestamp with time zone DEFAULT now()
);

-- Create referral commissions table
CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  referral_tracking_id uuid REFERENCES public.referral_tracking(id) ON DELETE SET NULL,
  commission_type text NOT NULL, -- 'booking' or 'host'
  commission_amount numeric NOT NULL,
  commission_rate numeric NOT NULL,
  booking_amount numeric NOT NULL,
  status text DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
  created_at timestamp with time zone DEFAULT now(),
  paid_at timestamp with time zone
);

-- Add referrer_id to profiles table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'referrer_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN referrer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add referral_tracking_id to bookings table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'referral_tracking_id'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN referral_tracking_id uuid REFERENCES public.referral_tracking(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_settings
CREATE POLICY "Admins can manage referral settings"
  ON public.referral_settings
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view referral settings"
  ON public.referral_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for referral_tracking
CREATE POLICY "Users can view their own referral tracking"
  ON public.referral_tracking
  FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

CREATE POLICY "Anyone can insert referral tracking"
  ON public.referral_tracking
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update referral tracking"
  ON public.referral_tracking
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

-- RLS Policies for referral_commissions
CREATE POLICY "Users can view their own commissions"
  ON public.referral_commissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id);

CREATE POLICY "System can insert commissions"
  ON public.referral_commissions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage all commissions"
  ON public.referral_commissions
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at on referral_settings
CREATE TRIGGER update_referral_settings_updated_at
  BEFORE UPDATE ON public.referral_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();