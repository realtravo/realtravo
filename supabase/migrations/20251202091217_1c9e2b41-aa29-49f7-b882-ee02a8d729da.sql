-- Update reconcile_mpesa_payment trigger to handle user notifications and email confirmations
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
  v_item_name TEXT;
  v_item_type TEXT;
  v_guest_email TEXT;
  v_guest_name TEXT;
  v_user_id UUID;
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

    -- Extract booking details
    v_user_id := (v_booking_data->>'user_id')::UUID;
    v_item_type := v_booking_data->>'booking_type';
    v_guest_email := v_booking_data->>'guest_email';
    v_guest_name := v_booking_data->>'guest_name';

    -- Get item name and host based on booking type
    IF v_item_type = 'trip' THEN
      SELECT name, created_by INTO v_item_name, v_host_id
      FROM trips WHERE id = (v_booking_data->>'item_id')::UUID;
    ELSIF v_item_type = 'event' THEN
      SELECT name, created_by INTO v_item_name, v_host_id
      FROM trips WHERE id = (v_booking_data->>'item_id')::UUID;
    ELSIF v_item_type = 'hotel' THEN
      SELECT name, created_by INTO v_item_name, v_host_id
      FROM hotels WHERE id = (v_booking_data->>'item_id')::UUID;
    ELSIF v_item_type IN ('adventure', 'adventure_place') THEN
      SELECT name, created_by INTO v_item_name, v_host_id
      FROM adventure_places WHERE id = (v_booking_data->>'item_id')::UUID;
    ELSIF v_item_type = 'attraction' THEN
      SELECT local_name, created_by INTO v_item_name, v_host_id
      FROM attractions WHERE id = (v_booking_data->>'item_id')::UUID;
    END IF;

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

    -- Create notification for USER (if logged in)
    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES (
        v_user_id,
        'payment_confirmed',
        'Payment Successful',
        'Your payment for ' || COALESCE(v_item_name, 'your booking') || ' has been confirmed.',
        jsonb_build_object(
          'booking_id', v_booking_id,
          'item_id', (v_booking_data->>'item_id')::UUID,
          'booking_type', v_item_type,
          'total_amount', (v_booking_data->>'total_amount')::NUMERIC
        )
      );
    END IF;

    -- Send email confirmation (via HTTP request to edge function)
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-booking-confirmation',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'bookingId', v_booking_id,
        'recipientEmail', COALESCE(v_guest_email, (SELECT email FROM profiles WHERE id = v_user_id)),
        'recipientName', COALESCE(v_guest_name, (SELECT name FROM profiles WHERE id = v_user_id)),
        'bookingType', v_item_type,
        'itemName', v_item_name,
        'totalAmount', (v_booking_data->>'total_amount')::NUMERIC,
        'visitDate', v_booking_data->>'visit_date',
        'bookingDetails', v_booking_data->'booking_details'
      )
    );

    RAISE NOTICE 'Booking created successfully with ID: %, notifications sent', v_booking_id;

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

-- Ensure the trigger is attached to mpesa_callback_log
DROP TRIGGER IF EXISTS on_mpesa_callback_received ON public.mpesa_callback_log;
CREATE TRIGGER on_mpesa_callback_received
  AFTER INSERT ON public.mpesa_callback_log
  FOR EACH ROW
  EXECUTE FUNCTION public.reconcile_mpesa_payment();