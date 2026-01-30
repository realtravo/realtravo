import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, Mail, Navigation, Clock, X, Plus, Camera, CheckCircle2, Info, ArrowLeft, ArrowRight, Loader2, DollarSign } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CountrySelector } from "@/components/creation/CountrySelector";
import { PhoneInput } from "@/components/creation/PhoneInput";
import { compressImages } from "@/lib/imageCompression";
import { DynamicItemList, DynamicItem } from "@/components/creation/DynamicItemList";
import { OperatingHoursSection } from "@/components/creation/OperatingHoursSection";
import { ReviewStep } from "@/components/creation/ReviewStep";

const TOTAL_STEPS = 7;
const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
  KHAKI: "#F0E68C",
  KHAKI_DARK: "#857F3E",
  SOFT_GRAY: "#F8F9FA"
};

const CreateAdventure = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    registrationName: "",
    registrationNumber: "",
    locationName: "",
    place: "",
    country: "",
    description: "",
    email: "",
    phoneNumber: "",
    openingHours: "",
    closingHours: "",
    entranceFeeType: "free",
    adultPrice: "",
    childPrice: "",
    latitude: null as number | null,
    longitude: null as number | null
  });

  const [workingDays, setWorkingDays] = useState({
    Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false, Sun: false
  });
  
  const [amenities, setAmenities] = useState<DynamicItem[]>([]);
  const [facilities, setFacilities] = useState<DynamicItem[]>([]);
  const [activities, setActivities] = useState<DynamicItem[]>([]);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);

  const errorClass = (field: string) => 
    errors[field] ? "border-red-500 bg-red-50 ring-1 ring-red-500" : "border-slate-100 bg-slate-50/50";

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, boolean> = {};

    if (step === 1) {
      if (!formData.registrationName.trim()) newErrors.registrationName = true;
      if (!formData.registrationNumber.trim()) newErrors.registrationNumber = true;
      if (!formData.country) newErrors.country = true;
    }

    if (step === 2) {
      if (!formData.locationName.trim()) newErrors.locationName = true;
      if (!formData.place.trim()) newErrors.place = true;
      if (!formData.latitude) newErrors.gps = true;
    }

    if (step === 3) {
      if (!formData.email.trim()) newErrors.email = true;
      if (!formData.phoneNumber.trim()) newErrors.phoneNumber = true;
      if (!formData.description.trim()) newErrors.description = true;
    }

    if (step === 4) {
      if (!formData.openingHours) newErrors.openingHours = true;
      if (!formData.closingHours) newErrors.closingHours = true;
      if (!Object.values(workingDays).some(v => v)) newErrors.workingDays = true;
      
      if (formData.entranceFeeType === "paid") {
        if (!formData.adultPrice || parseFloat(formData.adultPrice) < 0) newErrors.adultPrice = true;
        if (!formData.childPrice || parseFloat(formData.childPrice) < 0) newErrors.childPrice = true;
      }
    }

    if (step === 5) {
      // STRICT FACILITY CHECK: If name exists, capacity is MANDATORY
      const incompleteFacility = facilities.some(f => 
        f.name.trim() !== "" && (!f.capacity || parseInt(f.capacity) <= 0)
      );
      
      if (incompleteFacility) {
        newErrors.facilities = true;
        toast({ 
          title: "Capacity Required", 
          description: "Every listed facility must have a valid capacity number.", 
          variant: "destructive" 
        });
      }
    }

    if (step === 6) {
      if (galleryImages.length === 0) newErrors.gallery = true;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setErrors({});
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
    } else if (currentStep !== 5) {
      toast({ title: "Required Fields", description: "Please fill all highlighted sections.", variant: "destructive" });
    }
  };

  const handleSubmit = async () => {
    if (!user) return navigate("/auth");
    if (!validateStep(currentStep)) return;

    setLoading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of galleryImages) {
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('listing-images').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('listing-images').getPublicUrl(fileName);
        uploadedUrls.push(publicUrl);
      }

      const { error } = await supabase.from("adventure_places").insert([{
        name: formData.registrationName,
        registration_number: formData.registrationNumber,
        location: formData.locationName,
        place: formData.place,
        country: formData.country,
        description: formData.description,
        email: formData.email,
        phone_numbers: [formData.phoneNumber],
        latitude: formData.latitude,
        longitude: formData.longitude,
        opening_hours: formData.openingHours,
        closing_hours: formData.closingHours,
        days_opened: Object.entries(workingDays).filter(([_, s]) => s).map(([d]) => d),
        image_url: uploadedUrls[0],
        gallery_images: uploadedUrls,
        entry_fee_type: formData.entranceFeeType,
        entry_fee: parseFloat(formData.adultPrice || "0"),
        child_entry_fee: parseFloat(formData.childPrice || "0"),
        amenities: amenities.map(a => a.name),
        facilities: facilities.map(f => ({ name: f.name, capacity: parseInt(f.capacity || "0") })),
        activities: activities.map(a => ({ name: a.name })),
        created_by: user.id,
        approval_status: "pending"
      }]);

      if (error) throw error;
      toast({ title: "Success", description: "Listing submitted for review." });
      navigate("/become-host");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header />
      
      <div className="relative h-[30vh] bg-slate-900">
        <img src="/images/category-campsite.webp" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute bottom-8 left-0 w-full px-8 container max-w-4xl mx-auto">
          <p className="text-[#FF7F50] font-black uppercase tracking-[0.2em] text-[10px] mb-2">Step {currentStep} of {TOTAL_STEPS}</p>
          <h1 className="text-3xl md:text-5xl font-black uppercase text-white">Create <span style={{ color: COLORS.KHAKI }}>Adventure</span></h1>
        </div>
      </div>

      <main className="container px-4 max-w-4xl mx-auto -mt-6 relative z-50">
        <div className="flex gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className="h-2 flex-1 rounded-full transition-all" style={{ backgroundColor: i + 1 <= currentStep ? COLORS.TEAL : '#e2e8f0' }} />
          ))}
        </div>

        {currentStep === 4 && (
          <Card className={`bg-white rounded-[28px] p-8 shadow-sm border ${errors.adultPrice || errors.childPrice ? 'border-red-500' : 'border-slate-100'}`}>
            <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-3" style={{ color: COLORS.TEAL }}><Clock className="h-5 w-5" /> Access & Pricing</h2>
            <OperatingHoursSection
              openingHours={formData.openingHours} closingHours={formData.closingHours} workingDays={workingDays}
              onOpeningChange={(v) => setFormData({...formData, openingHours: v})}
              onClosingChange={(v) => setFormData({...formData, closingHours: v})}
              onDaysChange={setWorkingDays} accentColor={COLORS.TEAL}
            />
            <div className="mt-6 pt-6 border-t">
              <Label className="text-[10px] font-black uppercase text-slate-400">Entry Type</Label>
              <Select value={formData.entranceFeeType} onValueChange={(v) => setFormData({...formData, entranceFeeType: v})}>
                <SelectTrigger className="rounded-xl h-12 font-bold mb-4"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white"><SelectItem value="free">FREE</SelectItem><SelectItem value="paid">PAID</SelectItem></SelectContent>
              </Select>
              {formData.entranceFeeType === "paid" && (
                <div className="grid grid-cols-2 gap-4">
                  <Input type="number" placeholder="Adult Fee" value={formData.adultPrice} onChange={(e) => setFormData({...formData, adultPrice: e.target.value})} className={errorClass('adultPrice')} />
                  <Input type="number" placeholder="Child Fee" value={formData.childPrice} onChange={(e) => setFormData({...formData, childPrice: e.target.value})} className={errorClass('childPrice')} />
                </div>
              )}
            </div>
          </Card>
        )}

        {currentStep === 5 && (
          <Card className={`bg-white rounded-[28px] p-8 shadow-sm border ${errors.facilities ? "border-red-500 bg-red-50/20" : "border-slate-100"}`}>
            <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-3" style={{ color: COLORS.TEAL }}><DollarSign className="h-5 w-5" /> Features</h2>
            <div className="space-y-8">
              <DynamicItemList items={amenities} onChange={setAmenities} label="Amenities (Optional)" accentColor={COLORS.TEAL} />
              
              <div className={`p-4 rounded-xl border-2 border-dashed ${errors.facilities ? "border-red-400 bg-red-50" : "border-slate-100"}`}>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-xs font-black uppercase text-slate-600">Facilities</Label>
                  <span className="text-[9px] font-black text-red-500 uppercase">Capacity Required if named *</span>
                </div>
                <DynamicItemList items={facilities} onChange={setFacilities} label="" showCapacity={true} accentColor={COLORS.CORAL} />
              </div>

              <DynamicItemList items={activities} onChange={setActivities} label="Activities (Optional)" accentColor="#6366f1" />
            </div>
          </Card>
        )}

        <div className="flex gap-4 mt-8">
          {currentStep > 1 && <Button onClick={() => setCurrentStep(s => s - 1)} variant="outline" className="flex-1 py-6 rounded-2xl font-black uppercase">Previous</Button>}
          <Button 
            onClick={currentStep < TOTAL_STEPS ? handleNext : handleSubmit} 
            disabled={loading}
            className="flex-1 py-6 rounded-2xl font-black uppercase text-white"
            style={{ background: currentStep < TOTAL_STEPS ? COLORS.CORAL : COLORS.TEAL }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : currentStep < TOTAL_STEPS ? "Next" : "Submit"}
          </Button>
        </div>
      </main>
      <MobileBottomBar />
    </div>
  );
};

export default CreateAdventure;2