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

const initializeRequestSchema = z.object({
  email: z.string().email(),
  amount: z.number().positive().min(1).max(10000000),
  payment_method: z.enum(["card", "mobile_money"]),
  mobile_money_provider: z.string().optional(), // e.g., "mpesa"
  phone_number: z.string().optional(), // Required for mobile money
  bookingData: bookingDataSchema,
  callback_url: z.string().url().optional(),
  metadata: z.any().optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawData = await req.json();
    console.log("Paystack initialize request:", JSON.stringify(rawData, null, 2));

    // Validate input
    let validatedData: z.infer<typeof initializeRequestSchema>;
    try {
      validatedData = initializeRequestSchema.parse(rawData);
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

    const { email, amount, payment_method, mobile_money_provider, phone_number, bookingData, callback_url } = validatedData;

    // Get Paystack secret key
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      console.error("Paystack secret key not configured");
      return jsonResponse({ success: false, error: "Payment configuration error" }, 500);
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify item exists and is approved
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
      console.error("Item not found:", bookingData.item_id, itemError);
      return jsonResponse({ success: false, error: "Item not found" }, 404);
    }

    if ((item as any).approval_status !== "approved") {
      return jsonResponse({ success: false, error: "Item is not available for booking" }, 400);
    }

    // Create pending booking first
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
        payment_method: payment_method === "mobile_money" ? "mpesa" : "card",
        payment_phone: phone_number || null,
        status: "pending",
        referral_tracking_id: bookingData.referral_tracking_id || null,
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Error creating pending booking:", bookingError);
      return jsonResponse({ success: false, error: "Failed to create booking" }, 500);
    }

    console.log("Pending booking created:", booking?.id);

    // Generate reference
    const reference = `BK_${Date.now()}_${booking?.id?.slice(0, 8)}`;

    // Build Paystack request
    const paystackPayload: any = {
      email,
      amount: Math.round(amount * 100), // Paystack uses kobo/cents
      reference,
      callback_url: callback_url || `${Deno.env.get("SUPABASE_URL")}/functions/v1/paystack-callback`,
      metadata: {
        booking_id: booking?.id,
        item_id: bookingData.item_id,
        booking_type: bookingData.booking_type,
        host_id: (item as any).created_by,
        guest_name: bookingData.guest_name,
        guest_email: bookingData.guest_email,
        custom_fields: [
          { display_name: "Booking ID", variable_name: "booking_id", value: booking?.id },
          { display_name: "Guest Name", variable_name: "guest_name", value: bookingData.guest_name },
        ],
      },
    };

    // Add mobile money channel if M-Pesa
    if (payment_method === "mobile_money") {
      paystackPayload.channels = ["mobile_money"];
      paystackPayload.mobile_money = {
        phone: phone_number,
        provider: mobile_money_provider || "mpesa",
      };
    } else {
      paystackPayload.channels = ["card"];
    }

    console.log("Initiating Paystack transaction:", {
      ...paystackPayload,
      amount: paystackPayload.amount / 100, // Log in KES for readability
    });

    // Call Paystack Initialize Transaction API
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paystackPayload),
    });

    const paystackData = await paystackResponse.json();
    console.log("Paystack response:", paystackData);

    if (!paystackResponse.ok || !paystackData.status) {
      console.error("Paystack initialization failed:", paystackData);
      
      // Update booking as failed
      await supabaseClient
        .from("bookings")
        .update({ payment_status: "failed", status: "cancelled" })
        .eq("id", booking?.id);

      return jsonResponse({
        success: false,
        error: paystackData.message || "Failed to initialize payment",
      }, 400);
    }

    // Store payment record
    await supabaseClient.from("payments").insert({
      checkout_request_id: reference,
      merchant_request_id: paystackData.data?.access_code,
      phone_number: phone_number || "",
      amount: Math.round(amount),
      account_reference: reference,
      transaction_desc: `Payment for ${bookingData.booking_type}`,
      booking_data: {
        ...bookingData,
        booking_id: booking?.id,
        host_id: (item as any).created_by,
      },
      payment_status: "pending",
      user_id: bookingData.user_id || null,
      host_id: (item as any).created_by,
    });

    return jsonResponse({
      success: true,
      message: "Payment initialized successfully",
      authorization_url: paystackData.data?.authorization_url,
      access_code: paystackData.data?.access_code,
      reference: paystackData.data?.reference,
      bookingId: booking?.id,
    });
  } catch (error) {
    console.error("Error in paystack-initialize function:", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "An error occurred",
    }, 500);
  }
});
