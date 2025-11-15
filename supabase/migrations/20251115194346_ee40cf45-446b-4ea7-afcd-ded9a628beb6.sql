-- Add new security and access control fields to hotels table
ALTER TABLE public.hotels 
ADD COLUMN IF NOT EXISTS access_pin TEXT,
ADD COLUMN IF NOT EXISTS allowed_admin_emails TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS establishment_type TEXT DEFAULT 'hotel',
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Add new security and access control fields to adventure_places table
ALTER TABLE public.adventure_places 
ADD COLUMN IF NOT EXISTS access_pin TEXT,
ADD COLUMN IF NOT EXISTS allowed_admin_emails TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Add is_hidden field to trips and events tables
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Update RLS policies for hotels to allow access by allowed_admin_emails
CREATE POLICY "Allowed admins can update hotels" ON public.hotels
FOR UPDATE USING (
  auth.uid() = created_by OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  (SELECT email FROM auth.users WHERE id = auth.uid()) = ANY(allowed_admin_emails)
);

-- Update RLS policies for adventure_places to allow access by allowed_admin_emails
CREATE POLICY "Allowed admins can update adventure places" ON public.adventure_places
FOR UPDATE USING (
  auth.uid() = created_by OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  (SELECT email FROM auth.users WHERE id = auth.uid()) = ANY(allowed_admin_emails)
);

-- Update SELECT policies to show hidden items to admins
DROP POLICY IF EXISTS "Allow public read access to approved hotels" ON public.hotels;
CREATE POLICY "Allow public read access to approved hotels" ON public.hotels
FOR SELECT USING (
  (approval_status = 'approved' AND is_hidden = FALSE) OR 
  (auth.uid() = created_by) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  (SELECT email FROM auth.users WHERE id = auth.uid()) = ANY(allowed_admin_emails)
);

DROP POLICY IF EXISTS "Allow public read access to approved adventure_places" ON public.adventure_places;
CREATE POLICY "Allow public read access to approved adventure_places" ON public.adventure_places
FOR SELECT USING (
  (approval_status = 'approved' AND is_hidden = FALSE) OR 
  (auth.uid() = created_by) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  (SELECT email FROM auth.users WHERE id = auth.uid()) = ANY(allowed_admin_emails)
);

DROP POLICY IF EXISTS "Allow public read access to approved trips" ON public.trips;
CREATE POLICY "Allow public read access to approved trips" ON public.trips
FOR SELECT USING (
  (approval_status = 'approved' AND is_hidden = FALSE) OR 
  (auth.uid() = created_by) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Allow public read access to approved events" ON public.events;
CREATE POLICY "Allow public read access to approved events" ON public.events
FOR SELECT USING (
  (approval_status = 'approved' AND is_hidden = FALSE) OR 
  (auth.uid() = created_by) OR 
  has_role(auth.uid(), 'admin'::app_role)
);