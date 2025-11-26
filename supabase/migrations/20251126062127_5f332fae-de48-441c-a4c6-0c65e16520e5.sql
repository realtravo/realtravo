-- Drop the old constraint that doesn't include 'attraction'
ALTER TABLE saved_items DROP CONSTRAINT IF EXISTS saved_items_item_type_check;