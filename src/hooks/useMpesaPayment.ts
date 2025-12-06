import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PaymentStatus } from '@/components/booking/PaymentStatusDialog';

interface MpesaPaymentOptions {
  onSuccess?: (bookingId: string) => void;
  onError?: (error: string) => void;
}

interface BookingData {
  item_id: string;
  booking_type: string;
  total_amount: number;
  booking_details: any;
  user_id?: string | null;
  is_guest_booking: boolean;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  visit_date?: string;
  slots_booked?: number;
  payment_method: string;
  payment_phone: string;
  host_id?: string;
  emailData?: {
    itemName: string;
  };
}

export const useMpesaPayment = (options: MpesaPaymentOptions = {}) => {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);

  // Subscribe to pending_payments changes
  useEffect(() => {
    if (!checkoutRequestId) return;

    const channel = supabase
      .channel(`payment-${checkoutRequestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pending_payments',
          filter: `checkout_request_id=eq.${checkoutRequestId}`,
        },
        async (payload) => {
          const payment = payload.new as any;
          console.log('Payment status update:', payment.payment_status);

          if (payment.payment_status === 'completed') {
            setPaymentStatus('success');
            
            // Create the booking now that payment is confirmed
            await createBookingFromPayment(payment);
            
            if (options.onSuccess) {
              options.onSuccess(payment.id);
            }
          } else if (payment.payment_status === 'failed') {
            setPaymentStatus('failed');
            setErrorMessage(payment.result_desc || 'Payment failed');
            if (options.onError) {
              options.onError(payment.result_desc || 'Payment failed');
            }
          }
        }
      )
      .subscribe();

    // Also poll as fallback (M-Pesa callback might be delayed)
    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('pending_payments')
        .select('payment_status, result_desc, id')
        .eq('checkout_request_id', checkoutRequestId)
        .single();

      if (data) {
        if (data.payment_status === 'completed') {
          clearInterval(pollInterval);
          setPaymentStatus('success');
          if (options.onSuccess) options.onSuccess(data.id);
        } else if (data.payment_status === 'failed') {
          clearInterval(pollInterval);
          setPaymentStatus('failed');
          setErrorMessage(data.result_desc || 'Payment failed');
          if (options.onError) options.onError(data.result_desc || 'Payment failed');
        }
      }
    }, 5000);

    // Timeout after 60 seconds
    const timeout = setTimeout(async () => {
      clearInterval(pollInterval);
      channel.unsubscribe();
      
      // Update pending payment and booking as failed due to timeout
      if (checkoutRequestId) {
        await supabase
          .from('pending_payments')
          .update({ 
            payment_status: 'failed', 
            result_desc: 'Payment timed out. User did not complete the transaction within 60 seconds.' 
          })
          .eq('checkout_request_id', checkoutRequestId);

        // Also update the booking status to failed
        const { data: pendingPayment } = await supabase
          .from('pending_payments')
          .select('booking_data')
          .eq('checkout_request_id', checkoutRequestId)
          .single();

        const bookingData = pendingPayment?.booking_data as { booking_id?: string } | null;
        if (bookingData?.booking_id) {
          await supabase
            .from('bookings')
            .update({ 
              payment_status: 'failed', 
              status: 'cancelled' 
            })
            .eq('id', bookingData.booking_id);
        }
      }
      
      setPaymentStatus('failed');
      setErrorMessage('Payment timed out. Please try again.');
    }, 60000);

    return () => {
      channel.unsubscribe();
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [checkoutRequestId, options.onSuccess, options.onError]);

  const createBookingFromPayment = async (payment: any) => {
    try {
      const bookingData = payment.booking_data;
      
      // Insert booking with paid status
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          item_id: bookingData.item_id,
          booking_type: bookingData.booking_type,
          total_amount: bookingData.total_amount,
          booking_details: bookingData.booking_details,
          user_id: bookingData.user_id || null,
          is_guest_booking: bookingData.is_guest_booking,
          guest_name: bookingData.guest_name,
          guest_email: bookingData.guest_email,
          guest_phone: bookingData.guest_phone || null,
          visit_date: bookingData.visit_date || null,
          slots_booked: bookingData.slots_booked || 1,
          payment_status: 'paid',
          payment_method: 'mpesa',
          payment_phone: payment.phone_number,
          status: 'confirmed',
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Send notifications and emails
      await sendPaymentSuccessNotifications(booking, bookingData, payment);

      return booking;
    } catch (error) {
      console.error('Error creating booking from payment:', error);
    }
  };

  const sendPaymentSuccessNotifications = async (booking: any, bookingData: any, payment: any) => {
    try {
      // Send confirmation email to user
      await supabase.functions.invoke('send-booking-confirmation', {
        body: {
          bookingId: booking.id,
          email: bookingData.guest_email,
          guestName: bookingData.guest_name,
          bookingType: bookingData.booking_type,
          itemName: bookingData.emailData?.itemName || 'your booking',
          totalAmount: bookingData.total_amount,
          bookingDetails: bookingData.booking_details,
          visitDate: bookingData.visit_date,
          paymentStatus: 'paid',
          mpesaReceipt: payment.mpesa_receipt_number,
        },
      });

      // Create notification for user if logged in
      if (bookingData.user_id) {
        await supabase.from('notifications').insert({
          user_id: bookingData.user_id,
          type: 'payment_confirmed',
          title: 'Payment Successful',
          message: `Your payment of KES ${bookingData.total_amount} for ${bookingData.emailData?.itemName || 'your booking'} has been confirmed.`,
          data: { booking_id: booking.id, amount: bookingData.total_amount },
        });
      }

      // Create notification for host
      if (bookingData.host_id) {
        await supabase.from('notifications').insert({
          user_id: bookingData.host_id,
          type: 'new_booking',
          title: 'New Paid Booking',
          message: `You have a new paid booking for ${bookingData.emailData?.itemName || 'your listing'}. Amount: KES ${bookingData.total_amount}`,
          data: { booking_id: booking.id, amount: bookingData.total_amount, guest_name: bookingData.guest_name },
        });

        // Send email to host
        await supabase.functions.invoke('send-host-booking-notification', {
          body: {
            hostId: bookingData.host_id,
            bookingId: booking.id,
            guestName: bookingData.guest_name,
            itemName: bookingData.emailData?.itemName,
            totalAmount: bookingData.total_amount,
            visitDate: bookingData.visit_date,
          },
        });
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  };

  const initiatePayment = useCallback(async (
    phoneNumber: string,
    amount: number,
    bookingData: BookingData
  ) => {
    setPaymentStatus('waiting');
    setErrorMessage('');

    try {
      const accountReference = `BK${Date.now()}`;
      
      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phoneNumber,
          amount,
          accountReference,
          transactionDesc: `Payment for ${bookingData.emailData?.itemName || 'booking'}`,
          bookingData: {
            ...bookingData,
            payment_phone: phoneNumber,
          },
        },
      });

      if (error || !data?.success) {
        setPaymentStatus('failed');
        setErrorMessage(data?.error || error?.message || 'Failed to initiate payment');
        return false;
      }

      setCheckoutRequestId(data.checkoutRequestId);
      setPaymentStatus('processing');
      return true;
    } catch (error: any) {
      setPaymentStatus('failed');
      setErrorMessage(error.message || 'Failed to initiate payment');
      return false;
    }
  }, []);

  const resetPayment = useCallback(() => {
    setPaymentStatus('idle');
    setErrorMessage('');
    setCheckoutRequestId(null);
  }, []);

  return {
    paymentStatus,
    errorMessage,
    initiatePayment,
    resetPayment,
    isPaymentInProgress: paymentStatus === 'waiting' || paymentStatus === 'processing',
  };
};
