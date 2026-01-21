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

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { amount, account_name, account_number, bank_code, bank_name } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate available balance
    const { data: commissions } = await supabaseClient
      .from("referral_commissions")
      .select("commission_amount, status, withdrawn_at")
      .eq("referrer_id", user.id)
      .eq("status", "paid")
      .is("withdrawn_at", null);

    const availableBalance = commissions?.reduce(
      (sum, c) => sum + Number(c.commission_amount), 
      0
    ) || 0;

    if (amount > availableBalance) {
      return new Response(
        JSON.stringify({ error: "Insufficient balance" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get or create transfer recipient
    let recipientCode: string;
    
    const { data: existingRecipient } = await supabaseClient
      .from("transfer_recipients")
      .select("recipient_code")
      .eq("user_id", user.id)
      .single();

    if (existingRecipient) {
      recipientCode = existingRecipient.recipient_code;
    } else {
      // Create new recipient on Paystack
      if (!account_name || !account_number || !bank_code) {
        return new Response(
          JSON.stringify({ error: "Bank details required for first withdrawal" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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

      if (!recipientData.status) {
        return new Response(
          JSON.stringify({ error: recipientData.message || "Failed to verify bank account" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      recipientCode = recipientData.data.recipient_code;

      // Save recipient
      await supabaseClient
        .from("transfer_recipients")
        .insert({
          user_id: user.id,
          recipient_code: recipientCode,
          bank_code: bank_code,
          account_number: account_number,
          account_name: account_name,
          bank_name: bank_name || null,
          is_verified: true,
        });
    }

    // Initiate transfer
    const reference = `withdrawal_${user.id}_${Date.now()}`;

    const transferResponse = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount: Math.round(amount * 100), // Convert to kobo
        recipient: recipientCode,
        reference: reference,
        reason: "Referral commission withdrawal",
      }),
    });

    const transferData = await transferResponse.json();
    console.log("Transfer response:", transferData);

    if (!transferData.status) {
      return new Response(
        JSON.stringify({ error: transferData.message || "Transfer failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark commissions as withdrawn up to the requested amount
    let remainingAmount = amount;
    const commissionIds: string[] = [];

    const { data: allCommissions } = await supabaseClient
      .from("referral_commissions")
      .select("id, commission_amount")
      .eq("referrer_id", user.id)
      .eq("status", "paid")
      .is("withdrawn_at", null)
      .order("created_at", { ascending: true });

    for (const comm of allCommissions || []) {
      if (remainingAmount <= 0) break;
      commissionIds.push(comm.id);
      remainingAmount -= Number(comm.commission_amount);
    }

    // Update commissions as withdrawn
    await supabaseClient
      .from("referral_commissions")
      .update({
        withdrawn_at: new Date().toISOString(),
        withdrawal_reference: reference,
      })
      .in("id", commissionIds);

    // Create payout record
    await supabaseClient
      .from("payouts")
      .insert({
        recipient_id: user.id,
        recipient_type: "referrer",
        amount: amount,
        bank_code: bank_code || existingRecipient?.bank_code || "",
        account_number: account_number || existingRecipient?.account_number || "",
        account_name: account_name || existingRecipient?.account_name || "",
        transfer_code: transferData.data?.transfer_code,
        reference: reference,
        status: "processing",
        processed_at: new Date().toISOString(),
      });

    return new Response(
      JSON.stringify({
        success: true,
        reference: reference,
        amount: amount,
        message: "Withdrawal initiated successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing withdrawal:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
