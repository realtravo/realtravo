import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Paystack bank codes for Kenya
const BANK_CODES: Record<string, string> = {
  'equity': '070',
  'equity bank': '070',
  'kcb': '062',
  'kcb bank': '062',
  'cooperative': '078',
  'cooperative bank': '078',
  'coop bank': '078',
  'absa': '076',
  'absa bank': '076',
  'stanbic': '072',
  'stanbic bank': '072',
  'dtb': '076',
  'diamond trust': '076',
  'ncba': '069',
  'ncba bank': '069',
  'family bank': '050',
  'im bank': '067',
  'im bank limited': '067',
  'standard chartered': '074',
  'mpesa': '063', // M-Pesa paybill
};

function getBankCode(bankName: string): string {
  const normalized = bankName.toLowerCase().trim();
  return BANK_CODES[normalized] || normalized;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error("PAYSTACK_SECRET_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // Process scheduled payouts (48h before booking)
    if (action === 'process_scheduled' || !action) {
      const now = new Date().toISOString();
      
      // Get all scheduled payouts that are due
      const { data: duePayout, error: payoutError } = await supabase
        .from('payouts')
        .select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_for', now)
        .limit(50);

      if (payoutError) {
        throw new Error(`Error fetching payouts: ${payoutError.message}`);
      }

      console.log(`Found ${duePayout?.length || 0} payouts to process`);

      const results = [];

      for (const payout of duePayout || []) {
        try {
          // Create transfer recipient in Paystack
          const recipientResponse = await fetch("https://api.paystack.co/transferrecipient", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "mobile_money",
              name: payout.account_name,
              account_number: payout.account_number,
              bank_code: getBankCode(payout.bank_code),
              currency: "KES",
            }),
          });

          const recipientData = await recipientResponse.json();

          if (!recipientData.status) {
            console.error("Failed to create recipient:", recipientData);
            await supabase.from('payouts').update({
              status: 'failed',
              failure_reason: recipientData.message || 'Failed to create transfer recipient',
            }).eq('id', payout.id);
            continue;
          }

          const recipientCode = recipientData.data.recipient_code;

          // Store recipient code for future use
          await supabase.from('transfer_recipients').upsert({
            user_id: payout.recipient_id,
            recipient_code: recipientCode,
            account_name: payout.account_name,
            account_number: payout.account_number,
            bank_code: getBankCode(payout.bank_code),
            bank_name: payout.bank_code,
          }, { onConflict: 'user_id' });

          // Initiate transfer
          const transferResponse = await fetch("https://api.paystack.co/transfer", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              source: "balance",
              amount: Math.round(payout.amount * 100), // Convert to cents
              recipient: recipientCode,
              reason: `Payout for booking ${payout.booking_id}`,
              reference: `PAY_OUT_${payout.id}_${Date.now()}`,
            }),
          });

          const transferData = await transferResponse.json();

          if (!transferData.status) {
            console.error("Failed to initiate transfer:", transferData);
            await supabase.from('payouts').update({
              status: 'failed',
              failure_reason: transferData.message || 'Failed to initiate transfer',
            }).eq('id', payout.id);
            continue;
          }

          // Update payout status
          await supabase.from('payouts').update({
            status: 'processing',
            transfer_code: transferData.data.transfer_code,
            reference: transferData.data.reference,
          }).eq('id', payout.id);

          // Update booking payout status
          if (payout.booking_id) {
            await supabase.from('bookings').update({
              payout_status: 'processing',
              payout_reference: transferData.data.reference,
            }).eq('id', payout.booking_id);
          }

          results.push({
            payout_id: payout.id,
            status: 'processing',
            transfer_code: transferData.data.transfer_code,
          });

          console.log(`Payout ${payout.id} initiated successfully`);

        } catch (error: any) {
          console.error(`Error processing payout ${payout.id}:`, error);
          await supabase.from('payouts').update({
            status: 'failed',
            failure_reason: error.message,
          }).eq('id', payout.id);
        }
      }

      return new Response(
        JSON.stringify({ success: true, processed: results.length, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Manual withdrawal request
    if (action === 'withdraw') {
      const { user_id, amount, payout_type } = body;

      if (!user_id || !amount) {
        throw new Error("user_id and amount are required");
      }

      // Get user's bank details
      const { data: bankDetails, error: bankError } = await supabase
        .from('bank_details')
        .select('*')
        .eq('user_id', user_id)
        .eq('verification_status', 'verified')
        .single();

      if (bankError || !bankDetails) {
        throw new Error("No verified bank details found. Please add and verify your bank details first.");
      }

      // Check available balance based on payout type
      let availableBalance = 0;

      if (payout_type === 'commission') {
        // Check referral commission balance
        const { data: commissions } = await supabase
          .from('referral_commissions')
          .select('commission_amount')
          .eq('referrer_id', user_id)
          .eq('status', 'paid')
          .is('withdrawn_at', null);

        availableBalance = (commissions || []).reduce((sum, c) => sum + Number(c.commission_amount), 0);
      } else if (payout_type === 'host') {
        // Check host earnings balance (bookings with payout_status = 'ready')
        const { data: bookings } = await supabase
          .from('bookings')
          .select('host_payout_amount, item_id')
          .eq('payout_status', 'ready')
          .gt('host_payout_amount', 0);

        // Filter bookings where user is the host
        for (const booking of bookings || []) {
          // Check if user owns this item
          const { data: trips } = await supabase.from('trips').select('id').eq('id', booking.item_id).eq('created_by', user_id);
          const { data: hotels } = await supabase.from('hotels').select('id').eq('id', booking.item_id).eq('created_by', user_id);
          const { data: adventures } = await supabase.from('adventure_places').select('id').eq('id', booking.item_id).eq('created_by', user_id);
          
          if ((trips && trips.length > 0) || (hotels && hotels.length > 0) || (adventures && adventures.length > 0)) {
            availableBalance += Number(booking.host_payout_amount);
          }
        }
      }

      if (amount > availableBalance) {
        throw new Error(`Insufficient balance. Available: KES ${availableBalance.toFixed(2)}`);
      }

      // Create payout record
      const { data: payout, error: payoutError } = await supabase
        .from('payouts')
        .insert({
          recipient_id: user_id,
          recipient_type: payout_type,
          amount: amount,
          status: 'pending',
          bank_code: bankDetails.bank_name,
          account_number: bankDetails.account_number,
          account_name: bankDetails.account_holder_name,
          scheduled_for: new Date().toISOString(),
        })
        .select()
        .single();

      if (payoutError) {
        throw new Error(`Error creating payout: ${payoutError.message}`);
      }

      // Process the withdrawal immediately
      try {
        // Create transfer recipient
        const recipientResponse = await fetch("https://api.paystack.co/transferrecipient", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "mobile_money",
            name: bankDetails.account_holder_name,
            account_number: bankDetails.account_number,
            bank_code: getBankCode(bankDetails.bank_name),
            currency: "KES",
          }),
        });

        const recipientData = await recipientResponse.json();

        if (!recipientData.status) {
          throw new Error(recipientData.message || 'Failed to create transfer recipient');
        }

        // Initiate transfer
        const transferResponse = await fetch("https://api.paystack.co/transfer", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source: "balance",
            amount: Math.round(amount * 100),
            recipient: recipientData.data.recipient_code,
            reason: `${payout_type} withdrawal`,
            reference: `WITHDRAW_${payout.id}_${Date.now()}`,
          }),
        });

        const transferData = await transferResponse.json();

        if (!transferData.status) {
          await supabase.from('payouts').update({
            status: 'failed',
            failure_reason: transferData.message,
          }).eq('id', payout.id);
          throw new Error(transferData.message || 'Failed to initiate transfer');
        }

        // Update payout status
        await supabase.from('payouts').update({
          status: 'processing',
          transfer_code: transferData.data.transfer_code,
          reference: transferData.data.reference,
        }).eq('id', payout.id);

        // Mark commissions as withdrawn if applicable
        if (payout_type === 'commission') {
          await supabase
            .from('referral_commissions')
            .update({ 
              withdrawn_at: new Date().toISOString(),
              withdrawal_reference: transferData.data.reference,
            })
            .eq('referrer_id', user_id)
            .eq('status', 'paid')
            .is('withdrawn_at', null);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Withdrawal initiated successfully',
            reference: transferData.data.reference,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      } catch (error: any) {
        await supabase.from('payouts').update({
          status: 'failed',
          failure_reason: error.message,
        }).eq('id', payout.id);
        throw error;
      }
    }

    throw new Error("Invalid action");

  } catch (error: any) {
    console.error("Process payouts error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
