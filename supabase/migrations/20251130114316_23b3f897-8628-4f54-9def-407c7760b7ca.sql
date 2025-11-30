-- Add internal_referral_id_digits to profiles table
ALTER TABLE public.profiles 
ADD COLUMN internal_referral_id_digits text UNIQUE;

-- Create function to generate unique 8-digit referral ID
CREATE OR REPLACE FUNCTION generate_referral_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create trigger function to auto-generate referral ID on user creation
CREATE OR REPLACE FUNCTION handle_new_user_referral_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.internal_referral_id_digits := generate_referral_id();
  RETURN NEW;
END;
$$;

-- Create trigger for new user profiles
CREATE TRIGGER set_referral_id_on_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW
WHEN (NEW.internal_referral_id_digits IS NULL)
EXECUTE FUNCTION handle_new_user_referral_id();

-- Backfill existing users with referral IDs
UPDATE public.profiles
SET internal_referral_id_digits = generate_referral_id()
WHERE internal_referral_id_digits IS NULL;