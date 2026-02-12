
CREATE OR REPLACE FUNCTION public.award_referral_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tracking RECORD;
  v_settings RECORD;
  v_service_fee_rate NUMERIC;
  v_commission_rate NUMERIC;
  v_commission_type TEXT;
  v_service_fee_amount NUMERIC;
  v_commission_amount NUMERIC;
  v_existing_commission_count INTEGER;
BEGIN
  IF NEW.payment_status != 'completed' OR NEW.referral_tracking_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.payment_status = NEW.payment_status THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_existing_commission_count
  FROM public.referral_commissions
  WHERE booking_id = NEW.id;

  IF v_existing_commission_count > 0 THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_tracking
  FROM public.referral_tracking
  WHERE id = NEW.referral_tracking_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_settings
  FROM public.referral_settings
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_commission_type := 'booking';
  
  IF NEW.booking_type = 'trip' THEN
    v_service_fee_rate := v_settings.trip_service_fee;
    v_commission_rate := v_settings.trip_commission_rate;
  ELSIF NEW.booking_type = 'event' THEN
    v_service_fee_rate := v_settings.event_service_fee;
    v_commission_rate := v_settings.event_commission_rate;
  ELSIF NEW.booking_type = 'hotel' THEN
    v_service_fee_rate := v_settings.hotel_service_fee;
    v_commission_rate := v_settings.hotel_commission_rate;
  ELSIF NEW.booking_type = 'attraction' THEN
    v_service_fee_rate := v_settings.attraction_service_fee;
    v_commission_rate := v_settings.attraction_commission_rate;
  ELSIF NEW.booking_type IN ('adventure', 'adventure_place') THEN
    v_service_fee_rate := v_settings.adventure_place_service_fee;
    v_commission_rate := v_settings.adventure_place_commission_rate;
  ELSE
    v_service_fee_rate := 20.0;
    v_commission_rate := 5.0;
  END IF;

  -- Step 1: Calculate service fee from gross booking amount
  v_service_fee_amount := (NEW.total_amount * v_service_fee_rate) / 100;
  
  -- Step 2: Calculate commission FROM service fee (margin protection)
  v_commission_amount := (v_service_fee_amount * v_commission_rate) / 100;
  
  -- Margin Protection Rules:
  -- Rule 1: If service fee is 0, commission is 0
  IF v_service_fee_amount <= 0 THEN
    v_commission_amount := 0;
  END IF;
  -- Rule 2 & 3: Commission can never exceed service fee
  IF v_commission_amount > v_service_fee_amount THEN
    v_commission_amount := v_service_fee_amount;
  END IF;

  INSERT INTO public.referral_commissions (
    referrer_id, referred_user_id, booking_id, referral_tracking_id,
    commission_type, commission_amount, commission_rate, booking_amount,
    status, paid_at
  ) VALUES (
    v_tracking.referrer_id, v_tracking.referred_user_id, NEW.id,
    NEW.referral_tracking_id, v_commission_type, v_commission_amount,
    v_commission_rate, NEW.total_amount, 'paid', NOW()
  );

  UPDATE public.referral_tracking
  SET status = 'converted', converted_at = NOW()
  WHERE id = NEW.referral_tracking_id;

  RAISE NOTICE 'Referral commission awarded: % from service fee % for booking %', v_commission_amount, v_service_fee_amount, NEW.id;

  RETURN NEW;
END;
$function$;
