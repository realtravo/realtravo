import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Settings } from "lucide-react";

export default function AdminReferralSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState({
    bookingCommissionRate: 5.0,
    hostCommissionRate: 10.0,
    hostCommissionDurationDays: 15,
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const checkAdminAndFetchSettings = async () => {
      try {
        // Check if user is admin
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

        // Fetch current settings
        const { data: settingsData, error } = await supabase
          .from("referral_settings")
          .select("*")
          .single();

        if (error) throw error;

        if (settingsData) {
          setSettings({
            bookingCommissionRate: Number(settingsData.booking_commission_rate),
            hostCommissionRate: Number(settingsData.host_commission_rate),
            hostCommissionDurationDays: settingsData.host_commission_duration_days,
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
    setSaving(true);
    try {
      const { error } = await supabase
        .from("referral_settings")
        .update({
          booking_commission_rate: settings.bookingCommissionRate,
          host_commission_rate: settings.hostCommissionRate,
          host_commission_duration_days: settings.hostCommissionDurationDays,
        })
        .eq("id", (await supabase.from("referral_settings").select("id").single()).data?.id);

      if (error) throw error;

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
        <main className="flex-1 container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-48 mb-8" />
          <Skeleton className="h-96 w-full max-w-2xl mx-auto" />
        </main>
        <Footer />
        <MobileBottomBar />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
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

          <Card>
            <CardHeader>
              <CardTitle>Commission Settings</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure commission rates for booking and host referrals
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="bookingRate">
                  Booking Referral Commission Rate (%)
                </Label>
                <Input
                  id="bookingRate"
                  type="number"
                  value={settings.bookingCommissionRate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      bookingCommissionRate: parseFloat(e.target.value) || 0,
                    })
                  }
                  min="0"
                  max="100"
                  step="0.1"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Commission earned when someone books through a referral link
                </p>
              </div>

              <div>
                <Label htmlFor="hostRate">
                  Host Referral Commission Rate (%)
                </Label>
                <Input
                  id="hostRate"
                  type="number"
                  value={settings.hostCommissionRate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      hostCommissionRate: parseFloat(e.target.value) || 0,
                    })
                  }
                  min="0"
                  max="100"
                  step="0.1"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Commission earned on new host's bookings during the commission period
                </p>
              </div>

              <div>
                <Label htmlFor="duration">
                  Host Commission Duration (Days)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  value={settings.hostCommissionDurationDays}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      hostCommissionDurationDays: parseInt(e.target.value) || 0,
                    })
                  }
                  min="1"
                  max="365"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How many days after the first booking the referrer continues to earn commission
                </p>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full"
              >
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
      <MobileBottomBar />
    </div>
  );
}
