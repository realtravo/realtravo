-- Create helper function to hash PINs
CREATE OR REPLACE FUNCTION public.hash_pin(pin_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN crypt(pin_text, gen_salt('bf', 8));
END;
$$;

-- Grant execute permission to authenticated users  
GRANT EXECUTE ON FUNCTION public.hash_pin TO authenticated;