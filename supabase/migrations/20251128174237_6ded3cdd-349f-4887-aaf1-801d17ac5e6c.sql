-- Drop the incorrect unique constraint
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_users_id_item_type_key;

-- Add the correct unique constraint (one review per user per item)
ALTER TABLE public.reviews ADD CONSTRAINT reviews_user_item_unique UNIQUE (user_id, item_id, item_type);