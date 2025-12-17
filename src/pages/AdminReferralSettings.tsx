import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileBottomBar } from "@/components/MobileBottomBar"; // RESTORED
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Settings } from "lucide-react";

// Define the specified Teal color
const TEAL_COLOR = "#008080";
const TEAL_HOVER_COLOR = "#005555"; 

const getTealButtonStyle = () => {
  return {
    backgroundColor: TEAL_COLOR,
    borderColor: TEAL_COLOR,
    color: 'white',
    transition: 'background-color 0.15s',
  };
};

const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
  if (!e.currentTarget.disabled) {
    (e.currentTarget.style as any).backgroundColor = TEAL_HOVER_COLOR;
  }
};

const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
  if (!e.currentTarget.disabled) {
    (e.currentTarget.style as any).backgroundColor = TEAL_COLOR;
  }
};

export default function AdminReferralSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState({
    tripCommissionRate: 5.0,
    eventCommissionRate: 5.0,
    hotelCommissionRate: 5.0,
    attractionCommissionRate: 5.0,
    adventurePlaceCommissionRate: 5.0,
    tripServiceFee: 20.0,
    eventServiceFee: 20.0,
    hotelServiceFee: 20.0,
    attractionServiceFee: 20.0,
    adventurePlaceServiceFee: 20.0,
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const checkAdminAndFetchSettings = async () => {
      try {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        const isUserAdmin = roles?.some((r) => r.role === "admin") || false;
        setIsAdmin(isUserAdmin);

        if (!isUserAdmin) {
          navigate("/account");
          return;
        }

        const { data: settingsData, error } = await supabase
          .from("referral_settings")
          .select("*")
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (settingsData) {
          setSettings({
            tripCommissionRate: Number(settingsData.trip_commission_rate || 5.0),
            eventCommissionRate: Number(settingsData.event_commission_rate || 5.0),
            hotelCommissionRate: Number(settingsData.hotel_commission_rate || 5.0),
            attractionCommissionRate: Number(settingsData.attraction_commission_rate || 5.0),
            adventurePlaceCommissionRate: Number(settingsData.adventure_place_commission_rate || 5.0),
            tripServiceFee: Number(settingsData.trip_service_fee || 20.0),
            eventServiceFee: Number(settingsData.event_service_fee || 20.0),
            hotelServiceFee: Number(settingsData.hotel_service_fee || 20.0),
            attractionServiceFee: Number(settingsData.attraction_service_fee || 20.0),
            adventurePlaceServiceFee: Number(settingsData.adventure_place_service_fee || 20.0),
          });
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching settings:", error);
        setLoading(false);
      }
    };

    checkAdminAndFetchSettings();
  }, [user, navigate]);

  const handleSave = async () => {
    const validationErrors = [];
    if (settings.tripCommissionRate > settings.tripServiceFee) validationErrors.push("Trip");
    if (settings.eventCommissionRate > settings.eventServiceFee) validationErrors.push("Event");
    if (settings.hotelCommissionRate > settings.hotelServiceFee) validationErrors.push("Hotel");
    if (settings.attractionCommissionRate > settings.attractionServiceFee) validationErrors.push("Attraction");
    if (settings.adventurePlaceCommissionRate > settings.adventurePlaceServiceFee) validationErrors.push("Campsite/Experience");

    if (validationErrors.length > 0) {
      toast({
        title: "Validation Error",
        description: `Commission rate cannot exceed service fee for: ${validationErrors.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: existingSettings, error: fetchError } = await supabase
        .from("referral_settings")
        .select("id")
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      const updateData = {
        trip_commission_rate: settings.tripCommissionRate,
        event_commission_rate: settings.eventCommissionRate,
        hotel_commission_rate: settings.hotelCommissionRate,
        attraction_commission_rate: settings.attractionCommissionRate,
        adventure_place_commission_rate: settings.adventurePlaceCommissionRate,
        trip_service_fee: settings.tripServiceFee,
        event_service_fee: settings.eventServiceFee,
        hotel_service_fee: settings.hotelServiceFee,
        attraction_service_fee: settings.attractionServiceFee,
        adventure_place_service_fee: settings.adventurePlaceServiceFee,
      };

      let saveError;
      if (existingSettings) {
        const { error } = await supabase
          .from("referral_settings")
          .update(updateData)
          .eq("id", existingSettings.id);
        saveError = error;
      } else {
        const { error } = await supabase
          .from("referral_settings")
          .insert([updateData]);
        saveError = error;
      }
      
      if (saveError) throw saveError;

      toast({
        title: "Success",
        description: "Referral commission settings updated successfully",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 pb-24">
          <Skeleton className="h-12 w-48 mb-8" />
          <Skeleton className="h-96 w-full max-w-2xl mx-auto" />
        </main>
        <MobileBottomBar />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8 overflow-y-auto"> 
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/account")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Account
          </Button>

          <h1 className="text-3xl font-bold mb-8 text-foreground flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Set Referral Commission
          </h1>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Category Service Fees & Commission Rates</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure platform service fees and referral commission rates by category
                </p>
                <div className="p-3 mt-2 bg-slate-50 border-l-4 border-teal-500 rounded-r text-xs">
                    <p className="font-semibold text-teal-700">Formula Hint:</p>
                    <p>Referral Payout = Booking Value $\times$ (Service Fee %) $\times$ (Commission Rate % / 100)</p>
                    <p className="mt-1 text-red-600">⚠️ **Commission Rate (%)** must be $\leq$ **Service Fee (%)**</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Category Inputs (Trip, Event, Hotel, etc.) */}
                  {[
                    { id: 'trip', label: 'Trip' },
                    { id: 'event', label: 'Event' },
                    { id: 'hotel', label: 'Hotel' },
                    { id: 'attraction', label: 'Attraction' },
                    { id: 'adventurePlace', label: 'Campsite/Experience' }
                  ].map((cat) => (
                    <div key={cat.id} className="space-y-4 p-4 border border-border rounded-lg">
                      <h3 className="font-semibold text-foreground">{cat.label}</h3>
                      <div>
                        <Label htmlFor={`${cat.id}ServiceFee`}>Service Fee (%)</Label>
                        <Input
                          id={`${cat.id}ServiceFee`}
                          type="number"
                          value={(settings as any)[`${cat.id}ServiceFee`]}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              [`${cat.id}ServiceFee`]: parseFloat(e.target.value) || 0,
                            })
                          }
                          min="0" max="100" step="0.1" className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${cat.id}Rate`}>Referral Commission (%)</Label>
                        <Input
                          id={`${cat.id}Rate`}
                          type="number"
                          value={(settings as any)[`${cat.id}CommissionRate`]}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              [`${cat.id}CommissionRate`]: parseFloat(e.target.value) || 0,
                            })
                          }
                          min="0" step="0.1" className="mt-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full"
              style={getTealButtonStyle()}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {saving ? "Saving..." : "Save All Settings"}
            </Button>
          </div>
        </div>
      </main>
      <MobileBottomBar />
    </div>
  );
}