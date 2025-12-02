-- Drop the previous version that tried to use HTTP
DROP FUNCTION IF EXISTS public.reconcile_mpesa_payment() CASCADE;

-- Recreate reconcile_mpesa_payment without HTTP calls
CREATE OR REPLACE FUNCTION public.reconcile_mpesa_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pending_payment_id UUID;
  v_booking_data JSONB;
  v_booking_id UUID;
  v_host_id UUID;
BEGIN
  -- Find the corresponding pending payment
  SELECT id, booking_data 
  INTO v_pending_payment_id, v_booking_data
  FROM public.pending_payments
  WHERE checkout_request_id = NEW.checkout_request_id
  LIMIT 1;

  IF v_pending_payment_id IS NULL THEN
    RAISE NOTICE 'No pending payment found for checkout_request_id: %', NEW.checkout_request_id;
    RETURN NEW;
  END IF;

  -- Update the callback log with pending_payment_id reference
  UPDATE public.mpesa_callback_log
  SET pending_payment_id = v_pending_payment_id
  WHERE id = NEW.id;

  -- Process based on result code
  IF NEW.result_code = '0' THEN
    -- SUCCESS: Update pending payment status
    UPDATE public.pending_payments
    SET 
      payment_status = 'completed',
      result_code = NEW.result_code,
      result_desc = NEW.result_desc,
      mpesa_receipt_number = (NEW.raw_payload->'Body'->'stkCallback'->'CallbackMetadata'->'Item'->0->>'Value'),
      updated_at = now()
    WHERE id = v_pending_payment_id;

    -- Create the booking with PAID status
    INSERT INTO public.bookings (
      user_id,
      item_id,
      booking_type,
      booking_details,
      total_amount,
      payment_status,
      payment_method,
      payment_phone,
      guest_name,
      guest_email,
      guest_phone,
      is_guest_booking,
      visit_date,
      slots_booked,
      referral_tracking_id,
      status
    )
    SELECT 
      (v_booking_data->>'user_id')::UUID,
      (v_booking_data->>'item_id')::UUID,
      v_booking_data->>'booking_type',
      v_booking_data->'booking_details',
      (v_booking_data->>'total_amount')::NUMERIC,
      'paid',
      'mpesa',
      (SELECT phone_number FROM public.pending_payments WHERE id = v_pending_payment_id),
      v_booking_data->>'guest_name',
      v_booking_data->>'guest_email',
      v_booking_data->>'guest_phone',
      COALESCE((v_booking_data->>'is_guest_booking')::BOOLEAN, false),
      (v_booking_data->>'visit_date')::DATE,
      COALESCE((v_booking_data->>'slots_booked')::INTEGER, 1),
      (v_booking_data->>'referral_tracking_id')::UUID,
      'confirmed'
    RETURNING id INTO v_booking_id;

    RAISE NOTICE 'Booking created successfully with ID: %', v_booking_id;

  ELSIF NEW.result_code != '1032' THEN
    -- FAILURE (but not pending/timeout): Update pending payment status
    UPDATE public.pending_payments
    SET 
      payment_status = 'failed',
      result_code = NEW.result_code,
      result_desc = NEW.result_desc,
      updated_at = now()
    WHERE id = v_pending_payment_id;

    RAISE NOTICE 'Payment failed with result code: %', NEW.result_code;
  ELSE
    -- PENDING (1032): Do not update status, keep as pending
    RAISE NOTICE 'Payment still pending with result code: %', NEW.result_code;
  END IF;

  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_mpesa_callback_received
  AFTER INSERT ON public.mpesa_callback_log
  FOR EACH ROW
  EXECUTE FUNCTION public.reconcile_mpesa_payment();

-- Update notify_on_booking_creation to also create USER notifications
CREATE OR REPLACE FUNCTION public.notify_on_booking_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_item_name text;
  v_item_creator uuid;
BEGIN
  -- Only process paid bookings
  IF NEW.payment_status != 'paid' THEN
    RETURN NEW;
  END IF;

  -- Get item creator based on booking type
  IF NEW.booking_type = 'trip' THEN
    SELECT name, created_by INTO v_item_name, v_item_creator
    FROM trips WHERE id = NEW.item_id;
  ELSIF NEW.booking_type = 'hotel' THEN
    SELECT name, created_by INTO v_item_name, v_item_creator
    FROM hotels WHERE id = NEW.item_id;
  ELSIF NEW.booking_type IN ('adventure', 'adventure_place') THEN
    SELECT name, created_by INTO v_item_name, v_item_creator
    FROM adventure_places WHERE id = NEW.item_id;
  ELSIF NEW.booking_type = 'attraction' THEN
    SELECT local_name, created_by INTO v_item_name, v_item_creator
    FROM attractions WHERE id = NEW.item_id;
  END IF;

  -- Create notification for HOST (item creator)
  IF v_item_creator IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_item_creator,
      'new_booking',
      'New Booking Received',
      'You have received a new booking for ' || COALESCE(v_item_name, 'your listing'),
      jsonb_build_object(
        'booking_id', NEW.id,
        'item_id', NEW.item_id,
        'booking_type', NEW.booking_type,
        'total_amount', NEW.total_amount,
        'guest_name', COALESCE(NEW.guest_name, ''),
        'visit_date', NEW.visit_date
      )
    );
  END IF;

  -- Create notification for USER (if logged in)
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'payment_confirmed',
      'Payment Successful',
      'Your payment for ' || COALESCE(v_item_name, 'your booking') || ' has been confirmed.',
      jsonb_build_object(
        'booking_id', NEW.id,
        'item_id', NEW.item_id,
        'booking_type', NEW.booking_type,
        'total_amount', NEW.total_amount,
        'visit_date', NEW.visit_date
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;