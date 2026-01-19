import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reference } = await req.json();

    if (!reference) {
      return jsonResponse({ success: false, error: "Reference is required" }, 400);
    }

    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      return jsonResponse({ success: false, error: "Payment configuration error" }, 500);
    }

    // Verify transaction with Paystack
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
      },
    });

    const verifyData = await verifyResponse.json();
    console.log("Paystack verify response:", verifyData);

    if (!verifyResponse.ok || !verifyData.status) {
      return jsonResponse({
        success: false,
        error: verifyData.message || "Verification failed",
      }, 400);
    }

    const transaction = verifyData.data;
    const isSuccessful = transaction.status === "success";

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Update payment and booking status
    const bookingId = transaction.metadata?.booking_id;

    if (isSuccessful && bookingId) {
      // Update payment record
      await supabaseClient
        .from("payments")
        .update({
          payment_status: "completed",
          mpesa_receipt_number: transaction.reference,
          result_code: "0",
          result_desc: "Transaction successful",
          updated_at: new Date().toISOString(),
        })
        .eq("checkout_request_id", reference);

      // Update booking
      await supabaseClient
        .from("bookings")
        .update({
          payment_status: "completed",
          status: "confirmed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
    }

    return jsonResponse({
      success: true,
      status: transaction.status,
      isSuccessful,
      amount: transaction.amount / 100,
      reference: transaction.reference,
      bookingId,
      paidAt: transaction.paid_at,
      channel: transaction.channel,
      currency: transaction.currency,
    });
  } catch (error) {
    console.error("Error verifying Paystack transaction:", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "An error occurred",
    }, 500);
  }
});
