-- Create missing profile for user who submitted verification
INSERT INTO public.profiles (id, name, email, created_at, updated_at)
VALUES ('970b3fec-4793-476e-9968-7ff6ebdd3ce7', 'Paul', 'paulkiariemurungaru@gmail.com', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Drop existing foreign key
ALTER TABLE public.host_verifications
DROP CONSTRAINT IF EXISTS host_verifications_user_id_fkey;

-- Add foreign key relationship pointing to profiles table
ALTER TABLE public.host_verifications
ADD CONSTRAINT host_verifications_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;