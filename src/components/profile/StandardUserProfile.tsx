import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CountrySelector } from "@/components/creation/CountrySelector";

export const StandardUserProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+254");
  const [country, setCountry] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>();

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
    } else if (data) {
      setName(data.name || "");
      setGender(data.gender || "");
      setPhoneNumber(data.phone_number || "");
      setPhoneCountryCode(data.phone_country_code || "+254");
      setCountry(data.country || "");
      if (data.date_of_birth) {
        setDateOfBirth(new Date(data.date_of_birth));
      }
    }
  };


  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate name contains no numbers
    if (/\d/.test(name)) {
      toast({
        title: "Invalid Name",
        description: "Name cannot contain numbers",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name,
          gender: gender as any,
          phone_number: phoneNumber,
          phone_country_code: phoneCountryCode,
          country,
          date_of_birth: dateOfBirth ? format(dateOfBirth, "yyyy-MM-dd") : null,
        })
        .eq("id", user?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      
      // Refresh the page to update the header and navigation drawer
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleUpdate} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gender">Gender</Label>
        <Select value={gender} onValueChange={setGender}>
          <SelectTrigger>
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dateOfBirth">Date of Birth</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !dateOfBirth && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateOfBirth ? format(dateOfBirth, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateOfBirth}
              onSelect={setDateOfBirth}
              disabled={(date) =>
                date > new Date() || date < new Date("1900-01-01")
              }
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <CountrySelector value={country} onChange={setCountry} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phoneNumber">Phone Number</Label>
        <div className="flex gap-2">
          <Select value={phoneCountryCode} onValueChange={setPhoneCountryCode}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="+254">🇰🇪 +254</SelectItem>
              <SelectItem value="+256">🇺🇬 +256</SelectItem>
              <SelectItem value="+255">🇹🇿 +255</SelectItem>
              <SelectItem value="+250">🇷🇼 +250</SelectItem>
              <SelectItem value="+257">🇧🇮 +257</SelectItem>
              <SelectItem value="+211">🇸🇸 +211</SelectItem>
              <SelectItem value="+251">🇪🇹 +251</SelectItem>
              <SelectItem value="+252">🇸🇴 +252</SelectItem>
              <SelectItem value="+253">🇩🇯 +253</SelectItem>
            </SelectContent>
          </Select>
          <Input
            id="phoneNumber"
            type="tel"
            placeholder="712345678"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="flex-1"
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Updating..." : "Update Profile"}
      </Button>
    </form>
  );
}; 