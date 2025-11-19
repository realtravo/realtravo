-- Add new columns to profiles table for date of birth, country, and phone country code
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS phone_country_code text DEFAULT '+1';