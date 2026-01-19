import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      console.error("Paystack secret key not configured");
      return new Response("Configuration error", { status: 500 });
    }

    // Get the raw body for signature verification
    const body = await req.text();
    console.log("Paystack webhook received:", body.substring(0, 500));

    // Verify webhook signature using Web Crypto API (globalThis.crypto)
    const signature = req.headers.get("x-paystack-signature");
    if (signature) {
      const encoder = new TextEncoder();
      const key = await globalThis.crypto.subtle.importKey(
        "raw",
        encoder.encode(paystackSecretKey),
        { name: "HMAC", hash: "SHA-512" },
        false,
        ["sign"]
      );
      const signatureBuffer = await globalThis.crypto.subtle.sign("HMAC", key, encoder.encode(body));
      const computedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (computedSignature !== signature) {
        console.error("Invalid webhook signature");
        return new Response("Invalid signature", { status: 401 });
      }
    }

    const payload = JSON.parse(body);
    const event = payload.event;
    const data = payload.data;

    console.log("Paystack event:", event, "Reference:", data?.reference);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Handle successful charge
    if (event === "charge.success") {
      const reference = data.reference;
      const amount = data.amount / 100; // Convert from kobo to KES
      const metadata = data.metadata;
      const bookingId = metadata?.booking_id;

      console.log("Payment successful for booking:", bookingId, "Amount:", amount);

      // Update payment record
      const { error: paymentError } = await supabaseClient
        .from("payments")
        .update({
          payment_status: "completed",
          mpesa_receipt_number: data.reference,
          result_code: "0",
          result_desc: "Transaction successful",
          updated_at: new Date().toISOString(),
        })
        .eq("checkout_request_id", reference);

      if (paymentError) {
        console.error("Error updating payment:", paymentError);
      }

      // Update booking status
      if (bookingId) {
        const { error: bookingError } = await supabaseClient
          .from("bookings")
          .update({
            payment_status: "completed",
            status: "confirmed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookingId);

        if (bookingError) {
          console.error("Error updating booking:", bookingError);
        } else {
          console.log("Booking updated successfully:", bookingId);
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle failed charge
    if (event === "charge.failed") {
      const reference = data.reference;
      const metadata = data.metadata;
      const bookingId = metadata?.booking_id;

      console.log("Payment failed for booking:", bookingId);

      // Update payment record
      await supabaseClient
        .from("payments")
        .update({
          payment_status: "failed",
          result_code: data.gateway_response || "failed",
          result_desc: data.gateway_response || "Payment failed",
          updated_at: new Date().toISOString(),
        })
        .eq("checkout_request_id", reference);

      // Update booking status
      if (bookingId) {
        await supabaseClient
          .from("bookings")
          .update({
            payment_status: "failed",
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookingId);
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log unhandled events
    console.log("Unhandled Paystack event:", event);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing Paystack webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
