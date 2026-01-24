-- ==============================================================
-- SECURITY FIX: Create public views for listings to hide
-- sensitive contact information (email, phone_numbers)
-- ==============================================================

-- Create public view for adventure_places excluding email and phone_numbers
CREATE OR REPLACE VIEW public.public_adventure_places WITH (security_invoker=on) AS
SELECT 
  id, name, location, place, country, image_url, description, 
  local_name, latitude, longitude, facilities, activities, amenities,
  entry_fee, entry_fee_type, available_slots, opening_hours, closing_hours,
  days_opened, gallery_images, images, map_link, created_at, approval_status, 
  is_hidden, created_by
FROM public.adventure_places
WHERE approval_status = 'approved' AND is_hidden = false;

-- Create public view for hotels excluding email and phone_numbers
CREATE OR REPLACE VIEW public.public_hotels WITH (security_invoker=on) AS
SELECT 
  id, name, location, place, country, image_url, description,
  latitude, longitude, amenities, facilities, activities, gallery_images, images,
  available_rooms, opening_hours, closing_hours, days_opened, created_at,
  approval_status, is_hidden, created_by
FROM public.hotels
WHERE approval_status = 'approved' AND is_hidden = false;

-- Create public view for trips excluding email and phone_number
CREATE OR REPLACE VIEW public.public_trips WITH (security_invoker=on) AS
SELECT 
  id, name, location, place, country, image_url, description,
  activities, gallery_images, images, map_link,
  price, price_child, available_tickets, date, is_custom_date, is_flexible_date,
  slot_limit_type, opening_hours, closing_hours, days_opened, type, created_at,
  approval_status, is_hidden, created_by
FROM public.trips
WHERE approval_status = 'approved' AND is_hidden = false;