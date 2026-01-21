import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      throw new Error("PAYSTACK_SECRET_KEY not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get current time
    const now = new Date();
    const payoutThreshold = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now

    console.log("Processing payouts for bookings with visit_date before:", payoutThreshold.toISOString());

    // Get all scheduled payouts where:
    // 1. Booking is confirmed and paid
    // 2. Payout status is 'scheduled'
    // 3. Visit date is within 48 hours OR has passed
    const { data: bookings, error: bookingsError } = await supabaseClient
      .from("bookings")
      .select(`
        id,
        item_id,
        booking_type,
        total_amount,
        visit_date,
        host_payout_amount,
        service_fee_amount,
        created_at
      `)
      .eq("payment_status", "paid")
      .eq("status", "confirmed")
      .eq("payout_status", "scheduled")
      .lte("visit_date", payoutThreshold.toISOString().split("T")[0]);

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      throw bookingsError;
    }

    console.log(`Found ${bookings?.length || 0} bookings ready for payout`);

    const results = [];

    for (const booking of bookings || []) {
      try {
        // Get host information based on booking type
        let hostId: string | null = null;
        
        if (booking.booking_type === "trip" || booking.booking_type === "event") {
          const { data: trip } = await supabaseClient
            .from("trips")
            .select("created_by")
            .eq("id", booking.item_id)
            .single();
          hostId = trip?.created_by;
        } else if (booking.booking_type === "hotel") {
          const { data: hotel } = await supabaseClient
            .from("hotels")
            .select("created_by")
            .eq("id", booking.item_id)
            .single();
          hostId = hotel?.created_by;
        } else if (booking.booking_type === "adventure_place" || booking.booking_type === "adventure") {
          const { data: adventure } = await supabaseClient
            .from("adventure_places")
            .select("created_by")
            .eq("id", booking.item_id)
            .single();
          hostId = adventure?.created_by;
        }

        if (!hostId) {
          console.log(`No host found for booking ${booking.id}`);
          continue;
        }

        // Get host's transfer recipient
        const { data: recipient } = await supabaseClient
          .from("transfer_recipients")
          .select("*")
          .eq("user_id", hostId)
          .single();

        if (!recipient) {
          console.log(`No transfer recipient found for host ${hostId}`);
          // Mark as failed due to missing bank details
          await supabaseClient
            .from("bookings")
            .update({ 
              payout_status: "failed",
              updated_at: new Date().toISOString()
            })
            .eq("id", booking.id);
          continue;
        }

        // Calculate payout amount (total - service fee)
        const payoutAmount = booking.host_payout_amount || 
          (booking.total_amount - (booking.service_fee_amount || 0));

        if (payoutAmount <= 0) {
          console.log(`Invalid payout amount for booking ${booking.id}`);
          continue;
        }

        // Create Paystack transfer
        const reference = `payout_${booking.id}_${Date.now()}`;
        
        const transferResponse = await fetch("https://api.paystack.co/transfer", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source: "balance",
            amount: Math.round(payoutAmount * 100), // Convert to kobo
            recipient: recipient.recipient_code,
            reference: reference,
            reason: `Payout for booking ${booking.id}`,
          }),
        });

        const transferData = await transferResponse.json();
        console.log("Transfer response:", transferData);

        if (transferData.status) {
          // Update booking payout status
          await supabaseClient
            .from("bookings")
            .update({
              payout_status: "processing",
              payout_reference: reference,
              payout_scheduled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", booking.id);

          // Create payout record
          await supabaseClient
            .from("payouts")
            .insert({
              recipient_id: hostId,
              recipient_type: "host",
              booking_id: booking.id,
              amount: payoutAmount,
              bank_code: recipient.bank_code,
              account_number: recipient.account_number,
              account_name: recipient.account_name,
              transfer_code: transferData.data?.transfer_code,
              reference: reference,
              status: "processing",
              scheduled_for: new Date().toISOString(),
            });

          results.push({ 
            booking_id: booking.id, 
            status: "processing", 
            reference 
          });
        } else {
          // Transfer initiation failed
          await supabaseClient
            .from("bookings")
            .update({
              payout_status: "failed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", booking.id);

          results.push({ 
            booking_id: booking.id, 
            status: "failed", 
            error: transferData.message 
          });
        }
      } catch (bookingError) {
        console.error(`Error processing booking ${booking.id}:`, bookingError);
        results.push({ 
          booking_id: booking.id, 
          status: "error", 
          error: bookingError instanceof Error ? bookingError.message : "Unknown error"
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing payouts:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
