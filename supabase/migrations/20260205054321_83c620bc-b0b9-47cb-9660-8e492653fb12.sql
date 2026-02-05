-- Drop existing conflicting INSERT policies
DROP POLICY IF EXISTS "Allow booking creation" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;

-- Create a new unified INSERT policy that properly handles both authenticated and guest bookings
CREATE POLICY "Users and guests can create bookings"
ON public.bookings FOR INSERT
TO public
WITH CHECK (
  -- For authenticated users: user_id must match auth.uid() and is_guest_booking must be false
  (auth.uid() IS NOT NULL AND user_id = auth.uid() AND is_guest_booking = false)
  OR
  -- For guest bookings: user_id must be NULL, is_guest_booking true, and guest details provided
  (user_id IS NULL AND is_guest_booking = true AND guest_name IS NOT NULL AND guest_email IS NOT NULL)
  OR
  -- Allow service role to create any bookings (for edge functions)
  (auth.jwt() ->> 'role' = 'service_role')
);

-- Add UPDATE policy for service role (edge functions updating bookings)
DROP POLICY IF EXISTS "Service role can update bookings" ON public.bookings;
CREATE POLICY "Service role can update bookings"
ON public.bookings FOR UPDATE
TO public
USING (auth.jwt() ->> 'role' = 'service_role');

-- Add SELECT policy for hosts to view bookings on their items
DROP POLICY IF EXISTS "Hosts can view bookings for their items" ON public.bookings;
CREATE POLICY "Hosts can view bookings for their items"
ON public.bookings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips WHERE trips.id = bookings.item_id AND trips.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM hotels WHERE hotels.id = bookings.item_id AND hotels.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM adventure_places WHERE adventure_places.id = bookings.item_id AND adventure_places.created_by = auth.uid()
  )
);