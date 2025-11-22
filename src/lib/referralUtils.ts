import { supabase } from "@/integrations/supabase/client";

export const generateReferralLink = (
  itemId: string,
  itemType: string,
  referrerId: string
): string => {
  const baseUrl = window.location.origin;
  let path = "";
  
  switch (itemType) {
    case "trip":
      path = `/trips/${itemId}`;
      break;
    case "hotel":
      path = `/hotels/${itemId}`;
      break;
    case "adventure":
      path = `/adventures/${itemId}`;
      break;
    case "attraction":
      path = `/attractions/${itemId}`;
      break;
    default:
      path = `/`;
  }
  
  return `${baseUrl}${path}?ref=${referrerId}`;
};

export const trackReferralClick = async (
  referrerId: string,
  itemId?: string,
  itemType?: string,
  referralType: "booking" | "host" = "booking"
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Don't track if the referrer is clicking their own link
    if (user?.id === referrerId) {
      return null;
    }

    const { data, error } = await supabase
      .from("referral_tracking")
      .insert({
        referrer_id: referrerId,
        referred_user_id: user?.id || null,
        referral_type: referralType,
        item_id: itemId,
        item_type: itemType,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;
    
    // Store tracking ID in session storage for later use
    if (data) {
      sessionStorage.setItem("referral_tracking_id", data.id);
    }
    
    return data;
  } catch (error) {
    console.error("Error tracking referral:", error);
    return null;
  }
};

export const getReferralTrackingId = (): string | null => {
  return sessionStorage.getItem("referral_tracking_id");
};

export const clearReferralTracking = () => {
  sessionStorage.removeItem("referral_tracking_id");
};

export const calculateAndAwardCommission = async (
  bookingId: string,
  bookingAmount: number,
  referralTrackingId: string | null
) => {
  if (!referralTrackingId) return;

  try {
    // Get referral tracking details
    const { data: tracking, error: trackingError } = await supabase
      .from("referral_tracking")
      .select("*")
      .eq("id", referralTrackingId)
      .single();

    if (trackingError || !tracking) return;

    // Get commission settings
    const { data: settings, error: settingsError } = await supabase
      .from("referral_settings")
      .select("*")
      .single();

    if (settingsError || !settings) return;

    let commissionRate = Number(settings.booking_commission_rate);
    let commissionType = "booking";

    // Check if this is a host referral
    if (tracking.referral_type === "host") {
      // Check if referred user has made their first booking
      const { data: existingCommissions } = await supabase
        .from("referral_commissions")
        .select("*")
        .eq("referrer_id", tracking.referrer_id)
        .eq("referred_user_id", tracking.referred_user_id)
        .eq("commission_type", "host");

      if (existingCommissions && existingCommissions.length === 0) {
        // This is the first booking, check if within duration
        commissionRate = Number(settings.host_commission_rate);
        commissionType = "host";
      } else if (existingCommissions && existingCommissions.length > 0) {
        // Check if still within commission period
        const firstCommission = existingCommissions[0];
        const daysSinceFirst = Math.floor(
          (Date.now() - new Date(firstCommission.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceFirst <= settings.host_commission_duration_days) {
          commissionRate = Number(settings.host_commission_rate);
          commissionType = "host";
        } else {
          return; // Commission period expired
        }
      }
    }

    const commissionAmount = (bookingAmount * commissionRate) / 100;

    // Create commission record
    const { error: commissionError } = await supabase
      .from("referral_commissions")
      .insert({
        referrer_id: tracking.referrer_id,
        referred_user_id: tracking.referred_user_id,
        booking_id: bookingId,
        referral_tracking_id: referralTrackingId,
        commission_type: commissionType,
        commission_amount: commissionAmount,
        commission_rate: commissionRate,
        booking_amount: bookingAmount,
        status: "paid",
        paid_at: new Date().toISOString(),
      });

    if (commissionError) throw commissionError;

    // Update tracking status
    await supabase
      .from("referral_tracking")
      .update({
        status: "converted",
        converted_at: new Date().toISOString(),
      })
      .eq("id", referralTrackingId);

    // Clear session storage
    clearReferralTracking();
  } catch (error) {
    console.error("Error calculating commission:", error);
  }
};
