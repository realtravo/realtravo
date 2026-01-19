import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Input validation schemas
const bookingDataSchema = z.object({
  item_id: z.string().uuid("Invalid item ID"),
  booking_type: z.enum(["trip", "event", "hotel", "adventure_place", "adventure", "attraction"]),
  total_amount: z.number().positive().max(10000000, "Amount too large"),
  booking_details: z.any(),
  user_id: z.string().uuid().optional().nullable(),
  is_guest_booking: z.boolean().optional(),
  guest_name: z.string().min(1).max(100).optional(),
  guest_email: z.string().email().max(255),
  guest_phone: z.string().max(20).optional().nullable(),
  visit_date: z.string().optional().nullable(),
  slots_booked: z.number().int().positive().max(100).optional(),
  host_id: z.string().uuid().optional().nullable(),
  referral_tracking_id: z.string().uuid().optional().nullable(),
  emailData: z.any().optional(),
});

const phoneSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(/\s+/g, "") : v),
  z.string().min(9, "Phone number too short").max(15, "Phone number too long")
);

const chargeRequestSchema = z.object({
  email: z.string().email(),
  amount: z.number().positive().min(1).max(10000000),
  phone_number: phoneSchema,
  bookingData: bookingDataSchema,
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawData = await req.json();
    console.log("Paystack mobile charge request:", JSON.stringify(rawData, null, 2));

    // Validate input
    let validatedData: z.infer<typeof chargeRequestSchema>;
    try {
      validatedData = chargeRequestSchema.parse(rawData);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error("Validation error:", validationError.errors);
        return jsonResponse({
          success: false,
          error: "Invalid input",
          details: validationError.errors,
        }, 400);
      }
      throw validationError;
    }

    const { email, amount, phone_number, bookingData } = validatedData;

    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      return jsonResponse({ success: false, error: "Payment configuration error" }, 500);
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify item exists
    let tableName = "trips";
    if (bookingData.booking_type === "hotel") {
      tableName = "hotels";
    } else if (bookingData.booking_type === "adventure" || bookingData.booking_type === "adventure_place") {
      tableName = "adventure_places";
    }

    const { data: item, error: itemError } = await supabaseClient
      .from(tableName)
      .select("id, created_by, approval_status")
      .eq("id", bookingData.item_id)
      .maybeSingle();

    if (itemError || !item) {
      return jsonResponse({ success: false, error: "Item not found" }, 404);
    }

    if ((item as any).approval_status !== "approved") {
      return jsonResponse({ success: false, error: "Item is not available for booking" }, 400);
    }

    // Create pending booking
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .insert({
        item_id: bookingData.item_id,
        booking_type: bookingData.booking_type,
        total_amount: bookingData.total_amount,
        booking_details: bookingData.booking_details,
        user_id: bookingData.user_id || null,
        is_guest_booking: bookingData.is_guest_booking || !bookingData.user_id,
        guest_name: bookingData.guest_name,
        guest_email: bookingData.guest_email,
        guest_phone: bookingData.guest_phone || null,
        visit_date: bookingData.visit_date || null,
        slots_booked: bookingData.slots_booked || 1,
        payment_status: "pending",
        payment_method: "mpesa",
        payment_phone: phone_number,
        status: "pending",
        referral_tracking_id: bookingData.referral_tracking_id || null,
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Error creating pending booking:", bookingError);
      return jsonResponse({ success: false, error: "Failed to create booking" }, 500);
    }

    // Format phone number for M-Pesa (Paystack expects format: 2547XXXXXXXX)
    let formattedPhone = phone_number.replace(/\s/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "254" + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith("+254")) {
      formattedPhone = formattedPhone.substring(1);
    } else if (formattedPhone.startsWith("2540")) {
      formattedPhone = "254" + formattedPhone.substring(4);
    } else if (!formattedPhone.startsWith("254")) {
      formattedPhone = "254" + formattedPhone;
    }

    const reference = `BK_${Date.now()}_${booking?.id?.slice(0, 8)}`;

    // Use Paystack Charge API for mobile money
    const chargePayload = {
      email,
      amount: Math.round(amount * 100), // Paystack uses kobo/cents
      mobile_money: {
        phone: formattedPhone,
        provider: "mpesa",
      },
      reference,
      metadata: {
        booking_id: booking?.id,
        item_id: bookingData.item_id,
        booking_type: bookingData.booking_type,
        host_id: (item as any).created_by,
        guest_name: bookingData.guest_name,
      },
    };

    console.log("Initiating Paystack mobile money charge:", {
      ...chargePayload,
      amount: amount,
    });

    const chargeResponse = await fetch("https://api.paystack.co/charge", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chargePayload),
    });

    const chargeData = await chargeResponse.json();
    console.log("Paystack charge response:", chargeData);

    if (!chargeResponse.ok || !chargeData.status) {
      console.error("Paystack charge failed:", chargeData);
      
      await supabaseClient
        .from("bookings")
        .update({ payment_status: "failed", status: "cancelled" })
        .eq("id", booking?.id);

      return jsonResponse({
        success: false,
        error: chargeData.message || "Failed to initiate mobile money payment",
      }, 400);
    }

    // Store payment record
    await supabaseClient.from("payments").insert({
      checkout_request_id: reference,
      merchant_request_id: chargeData.data?.reference,
      phone_number: formattedPhone,
      amount: Math.round(amount),
      account_reference: reference,
      transaction_desc: `Payment for ${bookingData.booking_type}`,
      booking_data: {
        ...bookingData,
        booking_id: booking?.id,
        host_id: (item as any).created_by,
      },
      payment_status: chargeData.data?.status === "success" ? "completed" : "pending",
      user_id: bookingData.user_id || null,
      host_id: (item as any).created_by,
    });

    // If charge requires pending action (e.g., OTP or USSD prompt)
    if (chargeData.data?.status === "pending" || chargeData.data?.status === "send_otp") {
      return jsonResponse({
        success: true,
        status: chargeData.data?.status,
        message: chargeData.data?.display_text || "Please complete the payment on your phone",
        reference: chargeData.data?.reference,
        bookingId: booking?.id,
      });
    }

    // If charge is immediately successful
    if (chargeData.data?.status === "success") {
      await supabaseClient
        .from("bookings")
        .update({ payment_status: "completed", status: "confirmed" })
        .eq("id", booking?.id);

      return jsonResponse({
        success: true,
        status: "success",
        message: "Payment completed successfully",
        reference: chargeData.data?.reference,
        bookingId: booking?.id,
      });
    }

    return jsonResponse({
      success: true,
      status: chargeData.data?.status,
      message: chargeData.data?.display_text || "Payment initiated",
      reference: chargeData.data?.reference,
      bookingId: booking?.id,
    });
  } catch (error) {
    console.error("Error in paystack-charge-mobile:", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "An error occurred",
    }, 500);
  }
});
