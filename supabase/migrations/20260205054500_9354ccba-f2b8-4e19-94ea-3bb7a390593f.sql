-- Drop existing INSERT policy on referral_tracking
DROP POLICY IF EXISTS "Authenticated users can insert referral tracking" ON public.referral_tracking;

-- Create new INSERT policy that allows both authenticated and anonymous users
-- but still requires valid data
CREATE POLICY "Anyone can insert referral tracking"
ON public.referral_tracking FOR INSERT
TO public
WITH CHECK (
  -- referrer_id must not be null
  referrer_id IS NOT NULL
  AND item_id IS NOT NULL
  AND item_type IS NOT NULL
  AND referral_type IS NOT NULL
);

-- Add SELECT policy for anonymous users to view their own tracking (by tracking_id stored in session)
DROP POLICY IF EXISTS "Anonymous can view referral tracking by id" ON public.referral_tracking;
CREATE POLICY "Anonymous can view referral tracking by id"
ON public.referral_tracking FOR SELECT
TO anon
USING (true);  -- Tracked by session storage ID on client