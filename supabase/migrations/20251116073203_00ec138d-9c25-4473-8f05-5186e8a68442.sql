-- Remove the triggers first (they depend on the function)
DROP TRIGGER IF EXISTS check_trip_limit ON trips;
DROP TRIGGER IF EXISTS check_event_limit ON events;
DROP TRIGGER IF EXISTS check_hotel_limit ON hotels;
DROP TRIGGER IF EXISTS check_adventure_place_limit ON adventure_places;

-- Now remove the function
DROP FUNCTION IF EXISTS check_listing_limit();