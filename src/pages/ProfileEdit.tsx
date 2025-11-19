import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronRight, User, Calendar, Phone, Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountrySelector } from "@/components/creation/CountrySelector";
import { Separator } from "@/components/ui/separator";

const ProfileEdit = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [profileData, setProfileData] = useState<{
    name: string;
    phone_number: string;
    phone_country_code: string;
    gender: "male" | "female" | "other" | "prefer_not_to_say" | "";
    date_of_birth: string;
    country: string;
  }>({
    name: "",
    phone_number: "",
    phone_country_code: "+1",
    gender: "",
    date_of_birth: "",
    country: ""
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchProfile = async () => {
      setFetchingProfile(true);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfileData({
          name: data.name || "",
          phone_number: data.phone_number || "",
          phone_country_code: data.phone_country_code || "+1",
          gender: data.gender || "",
          date_of_birth: data.date_of_birth || "",
          country: data.country || ""
        });
      }
      setFetchingProfile(false);
    };

    fetchProfile();
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData: any = {
        name: profileData.name,
        phone_number: profileData.phone_number,
        phone_country_code: profileData.phone_country_code,
        date_of_birth: profileData.date_of_birth || null,
        country: profileData.country || null,
      };
      
      if (profileData.gender) {
        updateData.gender = profileData.gender;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user!.id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your profile has been updated.",
      });

      navigate("/profile");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <main className="container px-4 py-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Edit Profile</h1>

        <Card className="overflow-hidden">
          {fetchingProfile ? (
            <div className="p-6 space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-4">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                  </div>
                  <div className="h-5 w-5 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="divide-y">
                {/* Name Field */}
                <div className="p-4 flex items-center justify-between hover:bg-accent/50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="name" className="text-sm text-muted-foreground cursor-pointer">
                        Name
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        required
                        className="border-0 shadow-none p-0 h-8 focus-visible:ring-0 font-medium"
                        placeholder="Tap to add name"
                      />
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>

                {/* Date of Birth Field */}
                <div className="p-4 flex items-center justify-between hover:bg-accent/50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="dob" className="text-sm text-muted-foreground cursor-pointer">
                        Date of Birth
                      </Label>
                      <Input
                        id="dob"
                        type="date"
                        value={profileData.date_of_birth}
                        onChange={(e) => setProfileData({ ...profileData, date_of_birth: e.target.value })}
                        className="border-0 shadow-none p-0 h-8 focus-visible:ring-0 font-medium"
                      />
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>

                {/* Gender Field */}
                <div className="p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="gender" className="text-sm text-muted-foreground">
                        Gender
                      </Label>
                      <Select
                        value={profileData.gender}
                        onValueChange={(value: any) =>
                          setProfileData({ ...profileData, gender: value })
                        }
                      >
                        <SelectTrigger 
                          id="gender" 
                          className="border-0 shadow-none p-0 h-8 focus:ring-0 font-medium w-full"
                        >
                          <SelectValue placeholder="Tap to select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>

                {/* Phone Country Code */}
                <div className="p-4 flex items-center justify-between hover:bg-accent/50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="country-code" className="text-sm text-muted-foreground cursor-pointer">
                        Country Code
                      </Label>
                      <Input
                        id="country-code"
                        type="text"
                        value={profileData.phone_country_code}
                        onChange={(e) => setProfileData({ ...profileData, phone_country_code: e.target.value })}
                        className="border-0 shadow-none p-0 h-8 focus-visible:ring-0 font-medium"
                        placeholder="+1"
                      />
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>

                {/* Phone Number Field */}
                <div className="p-4 flex items-center justify-between hover:bg-accent/50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="phone" className="text-sm text-muted-foreground cursor-pointer">
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={profileData.phone_number}
                        onChange={(e) => setProfileData({ ...profileData, phone_number: e.target.value })}
                        className="border-0 shadow-none p-0 h-8 focus-visible:ring-0 font-medium"
                        placeholder="Tap to add phone"
                      />
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>

                {/* Country Field */}
                <div className="p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-sm text-muted-foreground">
                        Country
                      </Label>
                      <CountrySelector
                        value={profileData.country}
                        onChange={(value) => setProfileData({ ...profileData, country: value })}
                      />
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              <Separator />

              <div className="p-6 flex gap-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/profile")}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Card>
      </main>

      <Footer />
      <MobileBottomBar />
    </div>
  );
};

export default ProfileEdit;
