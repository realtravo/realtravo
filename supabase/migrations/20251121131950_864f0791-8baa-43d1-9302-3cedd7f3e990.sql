-- Create simple test policies that definitely work for public access
-- Drop all existing SELECT policies first
DROP POLICY IF EXISTS "Allow public read access to approved hotels" ON public.hotels;
DROP POLICY IF EXISTS "Allow public read access to approved adventure_places" ON public.adventure_places;

-- Create ultra-simple policies for public read access
CREATE POLICY "Public hotels read"
ON public.hotels
FOR SELECT
TO anon, authenticated
USING (
  (approval_status = 'approved' AND is_hidden = false)
  OR (auth.uid() = created_by)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Public adventure_places read"  
ON public.adventure_places
FOR SELECT
TO anon, authenticated
USING (
  (approval_status = 'approved' AND is_hidden = false)
  OR (auth.uid() = created_by)
  OR has_role(auth.uid(), 'admin'::app_role)
);