import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PaymentStatus } from '@/components/booking/PaymentStatusDialog';

interface PaystackPaymentOptions {
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
  payment_phone?: string;
  host_id?: string;
  emailData?: {
    itemName: string;
  };
}

interface PaymentRecord {
  id: string;
  payment_status: string;
  result_desc: string | null;
  booking_data: { booking_id?: string } | null;
}

export const usePaystackPayment = (options: PaystackPaymentOptions = {}) => {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);

  // Poll for payment status when reference is set
  useEffect(() => {
    if (!paymentReference) return;

    const pollInterval = setInterval(async () => {
      console.log('Polling Paystack payment status for:', paymentReference);
      
      try {
        const { data, error } = await supabase.functions.invoke('paystack-verify', {
          body: { reference: paymentReference },
        });

        if (error) {
          console.error('Error verifying payment:', error);
          return;
        }

        console.log('Paystack verify response:', data);

        if (data?.isSuccessful) {
          clearInterval(pollInterval);
          setPaymentStatus('success');
          if (options.onSuccess) {
            options.onSuccess(data.bookingId);
          }
        } else if (data?.status === 'failed') {
          clearInterval(pollInterval);
          setPaymentStatus('failed');
          setErrorMessage('Payment failed. Please try again.');
          if (options.onError) {
            options.onError('Payment failed');
          }
        }
      } catch (err) {
        console.error('Error polling payment:', err);
      }
    }, 5000);

    // Timeout after 5 minutes
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      setPaymentStatus('failed');
      setErrorMessage('Payment verification timed out. Please check your booking status.');
    }, 300000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [paymentReference, options.onSuccess, options.onError]);

  // Initialize card payment (redirects to Paystack checkout)
  const initiateCardPayment = useCallback(async (
    email: string,
    amount: number,
    bookingData: BookingData,
    callbackUrl?: string
  ) => {
    setPaymentStatus('waiting');
    setErrorMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('paystack-initialize', {
        body: {
          email,
          amount,
          payment_method: 'card',
          bookingData: {
            ...bookingData,
            guest_email: email,
          },
          callback_url: callbackUrl || window.location.origin + '/bookings',
        },
      });

      if (error || !data?.success) {
        setPaymentStatus('failed');
        setErrorMessage(data?.error || error?.message || 'Failed to initiate payment');
        return { success: false };
      }

      setPaymentReference(data.reference);
      setAuthorizationUrl(data.authorization_url);
      setPaymentStatus('processing');

      return { 
        success: true, 
        authorization_url: data.authorization_url,
        reference: data.reference,
        bookingId: data.bookingId,
      };
    } catch (error: any) {
      setPaymentStatus('failed');
      setErrorMessage(error.message || 'Failed to initiate payment');
      return { success: false };
    }
  }, []);

  // Initialize M-Pesa payment via Paystack
  const initiateMpesaPayment = useCallback(async (
    phoneNumber: string,
    email: string,
    amount: number,
    bookingData: BookingData
  ) => {
    setPaymentStatus('waiting');
    setErrorMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('paystack-charge-mobile', {
        body: {
          email,
          amount,
          phone_number: phoneNumber,
          bookingData: {
            ...bookingData,
            guest_email: email,
            payment_phone: phoneNumber,
          },
        },
      });

      if (error || !data?.success) {
        setPaymentStatus('failed');
        setErrorMessage(data?.error || error?.message || 'Failed to initiate payment');
        return false;
      }

      setPaymentReference(data.reference);
      setPaymentStatus('processing');

      // If payment is immediately successful
      if (data.status === 'success') {
        setPaymentStatus('success');
        if (options.onSuccess) {
          options.onSuccess(data.bookingId);
        }
        return true;
      }

      return true;
    } catch (error: any) {
      setPaymentStatus('failed');
      setErrorMessage(error.message || 'Failed to initiate payment');
      return false;
    }
  }, [options.onSuccess]);

  const resetPayment = useCallback(() => {
    setPaymentStatus('idle');
    setErrorMessage('');
    setPaymentReference(null);
    setAuthorizationUrl(null);
  }, []);

  return {
    paymentStatus,
    errorMessage,
    authorizationUrl,
    initiateCardPayment,
    initiateMpesaPayment,
    resetPayment,
    isPaymentInProgress: paymentStatus === 'waiting' || paymentStatus === 'processing',
  };
};
