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

    const { account_name, account_number, bank_code, bank_name, user_id } = await req.json();

    if (!account_name || !account_number || !bank_code || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create transfer recipient on Paystack
    const recipientResponse = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "nuban",
        name: account_name,
        account_number: account_number,
        bank_code: bank_code,
        currency: "KES",
      }),
    });

    const recipientData = await recipientResponse.json();
    console.log("Paystack recipient response:", recipientData);

    if (!recipientData.status) {
      return new Response(
        JSON.stringify({ 
          error: recipientData.message || "Failed to create transfer recipient" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recipientCode = recipientData.data.recipient_code;

    // Check if recipient already exists for this user
    const { data: existingRecipient } = await supabaseClient
      .from("transfer_recipients")
      .select("id")
      .eq("user_id", user_id)
      .single();

    if (existingRecipient) {
      // Update existing recipient
      const { error: updateError } = await supabaseClient
        .from("transfer_recipients")
        .update({
          recipient_code: recipientCode,
          bank_code: bank_code,
          account_number: account_number,
          account_name: account_name,
          bank_name: bank_name || null,
          is_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user_id);

      if (updateError) {
        console.error("Error updating recipient:", updateError);
        throw updateError;
      }
    } else {
      // Insert new recipient
      const { error: insertError } = await supabaseClient
        .from("transfer_recipients")
        .insert({
          user_id: user_id,
          recipient_code: recipientCode,
          bank_code: bank_code,
          account_number: account_number,
          account_name: account_name,
          bank_name: bank_name || null,
          is_verified: true,
        });

      if (insertError) {
        console.error("Error inserting recipient:", insertError);
        throw insertError;
      }
    }

    // Also update bank_details table if exists
    await supabaseClient
      .from("bank_details")
      .upsert({
        user_id: user_id,
        account_holder_name: account_name,
        account_number: account_number,
        bank_name: bank_name || bank_code,
        verification_status: "verified",
        verified_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    return new Response(
      JSON.stringify({ 
        success: true, 
        recipient_code: recipientCode,
        message: "Transfer recipient created successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating transfer recipient:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
