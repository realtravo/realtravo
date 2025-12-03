-- Update the reconcile_mpesa_payment function to properly handle all Daraja result codes
CREATE OR REPLACE FUNCTION public.reconcile_mpesa_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pending_payment_id UUID;
  v_booking_data JSONB;
  v_booking_id UUID;
  v_host_id UUID;
  v_result_code TEXT;
BEGIN
  v_result_code := NEW.result_code;
  
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

  -- Process based on result code using Safaricom Daraja codes
  CASE v_result_code
    -- 0: Transaction completed successfully
    WHEN '0' THEN
      RAISE NOTICE 'Payment SUCCESS (code 0) for checkout: %', NEW.checkout_request_id;
      
      UPDATE public.pending_payments
      SET 
        payment_status = 'completed',
        result_code = v_result_code,
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

    -- 1: Insufficient balance
    WHEN '1' THEN
      RAISE NOTICE 'Payment FAILED - Insufficient balance (code 1) for checkout: %', NEW.checkout_request_id;
      UPDATE public.pending_payments
      SET 
        payment_status = 'failed',
        result_code = v_result_code,
        result_desc = COALESCE(NEW.result_desc, 'Insufficient balance'),
        updated_at = now()
      WHERE id = v_pending_payment_id;

    -- 2: Transaction not supported
    WHEN '2' THEN
      RAISE NOTICE 'Payment FAILED - Transaction not supported (code 2) for checkout: %', NEW.checkout_request_id;
      UPDATE public.pending_payments
      SET 
        payment_status = 'failed',
        result_code = v_result_code,
        result_desc = COALESCE(NEW.result_desc, 'Transaction type not supported'),
        updated_at = now()
      WHERE id = v_pending_payment_id;

    -- 1001: Subscriber busy (user in another USSD session)
    WHEN '1001' THEN
      RAISE NOTICE 'Payment FAILED - Subscriber busy (code 1001) for checkout: %', NEW.checkout_request_id;
      UPDATE public.pending_payments
      SET 
        payment_status = 'failed',
        result_code = v_result_code,
        result_desc = COALESCE(NEW.result_desc, 'Unable to process - user busy with another session'),
        updated_at = now()
      WHERE id = v_pending_payment_id;

    -- 1032: User cancelled the request
    WHEN '1032' THEN
      RAISE NOTICE 'Payment CANCELLED by user (code 1032) for checkout: %', NEW.checkout_request_id;
      UPDATE public.pending_payments
      SET 
        payment_status = 'cancelled',
        result_code = v_result_code,
        result_desc = COALESCE(NEW.result_desc, 'Request cancelled by user'),
        updated_at = now()
      WHERE id = v_pending_payment_id;

    -- 1037: Timeout (user didn't enter PIN in time)
    WHEN '1037' THEN
      RAISE NOTICE 'Payment TIMEOUT - No response from user (code 1037) for checkout: %', NEW.checkout_request_id;
      UPDATE public.pending_payments
      SET 
        payment_status = 'timeout',
        result_code = v_result_code,
        result_desc = COALESCE(NEW.result_desc, 'Request timed out - no response from user'),
        updated_at = now()
      WHERE id = v_pending_payment_id;

    -- 2001: Invalid initiator details (B2C/B2B)
    WHEN '2001' THEN
      RAISE NOTICE 'Payment FAILED - Invalid initiator (code 2001) for checkout: %', NEW.checkout_request_id;
      UPDATE public.pending_payments
      SET 
        payment_status = 'failed',
        result_code = v_result_code,
        result_desc = COALESCE(NEW.result_desc, 'Invalid initiator information'),
        updated_at = now()
      WHERE id = v_pending_payment_id;

    -- All other codes: Mark as failed
    ELSE
      RAISE NOTICE 'Payment FAILED with unknown code: % for checkout: %', v_result_code, NEW.checkout_request_id;
      UPDATE public.pending_payments
      SET 
        payment_status = 'failed',
        result_code = v_result_code,
        result_desc = NEW.result_desc,
        updated_at = now()
      WHERE id = v_pending_payment_id;
  END CASE;

  RETURN NEW;
END;
$function$;