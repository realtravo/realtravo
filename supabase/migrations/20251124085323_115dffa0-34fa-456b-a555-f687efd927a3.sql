-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- System can insert notifications
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Add index for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.handle_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for updated_at
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.handle_notification_updated_at();

-- Create function to notify on booking creation
CREATE OR REPLACE FUNCTION public.notify_on_booking_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_item_name text;
  v_item_creator uuid;
BEGIN
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

  -- Create notification for item creator
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
        'total_amount', NEW.total_amount
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for booking notifications
CREATE TRIGGER notify_on_booking_creation_trigger
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_booking_creation();

-- Create function to notify on item approval/rejection
CREATE OR REPLACE FUNCTION public.notify_on_item_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if status changed to approved or rejected
  IF NEW.approval_status != OLD.approval_status AND NEW.approval_status IN ('approved', 'rejected') THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.created_by,
      'item_status',
      CASE 
        WHEN NEW.approval_status = 'approved' THEN 'Item Approved'
        ELSE 'Item Rejected'
      END,
      'Your listing "' || NEW.name || '" has been ' || NEW.approval_status,
      jsonb_build_object(
        'item_id', NEW.id,
        'item_type', TG_TABLE_NAME,
        'status', NEW.approval_status
      )
    );
  END IF;

  -- Notify if item was hidden
  IF NEW.is_hidden != OLD.is_hidden AND NEW.is_hidden = true THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.created_by,
      'item_hidden',
      'Item Hidden from Public View',
      'Your listing "' || NEW.name || '" has been hidden from public view',
      jsonb_build_object(
        'item_id', NEW.id,
        'item_type', TG_TABLE_NAME
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for trips, hotels, adventure_places
CREATE TRIGGER notify_on_trip_status_change
AFTER UPDATE ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_item_status_change();

CREATE TRIGGER notify_on_hotel_status_change
AFTER UPDATE ON public.hotels
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_item_status_change();

CREATE TRIGGER notify_on_adventure_status_change
AFTER UPDATE ON public.adventure_places
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_item_status_change();

-- Create function for attraction status notifications (different name field)
CREATE OR REPLACE FUNCTION public.notify_on_attraction_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if status changed to approved or rejected
  IF NEW.approval_status != OLD.approval_status AND NEW.approval_status IN ('approved', 'rejected') THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.created_by,
      'item_status',
      CASE 
        WHEN NEW.approval_status = 'approved' THEN 'Item Approved'
        ELSE 'Item Rejected'
      END,
      'Your listing "' || COALESCE(NEW.local_name, NEW.location_name) || '" has been ' || NEW.approval_status,
      jsonb_build_object(
        'item_id', NEW.id,
        'item_type', 'attractions',
        'status', NEW.approval_status
      )
    );
  END IF;

  -- Notify if item was hidden
  IF NEW.is_hidden != OLD.is_hidden AND NEW.is_hidden = true THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.created_by,
      'item_hidden',
      'Item Hidden from Public View',
      'Your listing "' || COALESCE(NEW.local_name, NEW.location_name) || '" has been hidden from public view',
      jsonb_build_object(
        'item_id', NEW.id,
        'item_type', 'attractions'
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER notify_on_attraction_status_change_trigger
AFTER UPDATE ON public.attractions
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_attraction_status_change();

-- Create function to notify on host verification status
CREATE OR REPLACE FUNCTION public.notify_on_host_verification_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'host_verification',
      CASE 
        WHEN NEW.status = 'approved' THEN 'Host Verification Approved'
        ELSE 'Host Verification Rejected'
      END,
      'Your host verification has been ' || NEW.status,
      jsonb_build_object(
        'verification_id', NEW.id,
        'status', NEW.status
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER notify_on_host_verification_change_trigger
AFTER UPDATE ON public.host_verifications
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_host_verification_change();

-- Create function to notify on bank details verification
CREATE OR REPLACE FUNCTION public.notify_on_bank_verification_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_status != OLD.verification_status AND NEW.verification_status IN ('verified', 'rejected') THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'payment_verification',
      CASE 
        WHEN NEW.verification_status = 'verified' THEN 'Payment Details Approved'
        ELSE 'Payment Details Rejected'
      END,
      'Your payment details verification has been ' || NEW.verification_status,
      jsonb_build_object(
        'bank_details_id', NEW.id,
        'status', NEW.verification_status
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER notify_on_bank_verification_change_trigger
AFTER UPDATE ON public.bank_details
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_bank_verification_change();

-- Create function to notify on new referral
CREATE OR REPLACE FUNCTION public.notify_on_new_referral()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'converted' THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.referrer_id,
      'new_referral',
      'New Referral!',
      'Someone signed up using your referral link',
      jsonb_build_object(
        'referral_id', NEW.id,
        'referral_type', NEW.referral_type
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER notify_on_new_referral_trigger
AFTER UPDATE ON public.referral_tracking
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_referral();