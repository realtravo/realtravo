-- Enable cryptographic functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add hashed PIN columns to hotels and adventure_places
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS hashed_access_pin TEXT;
ALTER TABLE public.adventure_places ADD COLUMN IF NOT EXISTS hashed_access_pin TEXT;

-- Hash existing plain text PINs using bcrypt
UPDATE public.hotels 
SET hashed_access_pin = crypt(access_pin, gen_salt('bf', 8))
WHERE access_pin IS NOT NULL AND hashed_access_pin IS NULL;

UPDATE public.adventure_places 
SET hashed_access_pin = crypt(access_pin, gen_salt('bf', 8))
WHERE access_pin IS NOT NULL AND hashed_access_pin IS NULL;

-- Create secure function to verify PIN credentials
CREATE OR REPLACE FUNCTION public.verify_item_credentials(
  p_item_id UUID,
  p_item_type TEXT,
  p_pin_attempt TEXT,
  p_reg_number_attempt TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_hash TEXT;
  v_stored_reg_number TEXT;
  v_user_id UUID;
  v_allowed_emails TEXT[];
  v_user_email TEXT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  -- Fetch item credentials based on type
  IF p_item_type = 'hotel' THEN
    SELECT hashed_access_pin, registration_number, created_by, allowed_admin_emails
    INTO v_stored_hash, v_stored_reg_number, v_user_id, v_allowed_emails
    FROM public.hotels 
    WHERE id = p_item_id;
  ELSIF p_item_type IN ('adventure', 'adventure_place') THEN
    SELECT hashed_access_pin, registration_number, created_by, allowed_admin_emails
    INTO v_stored_hash, v_stored_reg_number, v_user_id, v_allowed_emails
    FROM public.adventure_places 
    WHERE id = p_item_id;
  ELSE
    RETURN FALSE;
  END IF;
  
  -- Verify user is creator or in allowed admin list
  IF auth.uid() != v_user_id AND NOT (v_user_email = ANY(v_allowed_emails)) THEN
    RETURN FALSE;
  END IF;
  
  -- Verify PIN and registration number
  RETURN (
    v_stored_hash IS NOT NULL AND
    v_stored_hash = crypt(p_pin_attempt, v_stored_hash) AND
    v_stored_reg_number = p_reg_number_attempt
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.verify_item_credentials TO authenticated;