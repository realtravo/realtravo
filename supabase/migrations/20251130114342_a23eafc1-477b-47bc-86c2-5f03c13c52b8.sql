-- Fix security warnings: Add search_path to generate_referral_id function
CREATE OR REPLACE FUNCTION generate_referral_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id text;
  id_exists boolean;
BEGIN
  LOOP
    -- Generate random 8-digit number
    new_id := LPAD(FLOOR(RANDOM() * 100000000)::text, 8, '0');
    
    -- Check if ID already exists
    SELECT EXISTS(
      SELECT 1 FROM profiles WHERE internal_referral_id_digits = new_id
    ) INTO id_exists;
    
    -- Exit loop if unique
    EXIT WHEN NOT id_exists;
  END LOOP;
  
  RETURN new_id;
END;
$$;