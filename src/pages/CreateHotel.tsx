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
import { MapPin, Navigation, X, CheckCircle2, Plus, Camera, ArrowLeft, ArrowRight, Loader2, Clock, DollarSign, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CountrySelector } from "@/components/creation/CountrySelector";
import { PhoneInput } from "@/components/creation/PhoneInput";
import { compressImages } from "@/lib/imageCompression";
import { DynamicItemList, DynamicItem } from "@/components/creation/DynamicItemList";
import { OperatingHoursSection } from "@/components/creation/OperatingHoursSection";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
  SOFT_GRAY: "#F8F9FA"
};

const TOTAL_STEPS = 6;

const CreateHotel = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    registrationName: "",
    registrationNumber: "",
    place: "",
    country: "",
    description: "",
    email: "",
    phoneNumber: "",
    establishmentType: "hotel",
    latitude: null as number | null,
    longitude: null as number | null,
    openingHours: "",
    closingHours: ""
  });

  const [workingDays, setWorkingDays] = useState({
    Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false, Sun: false
  });

  const [amenities, setAmenities] = useState<DynamicItem[]>([]);
  const [facilities, setFacilities] = useState<DynamicItem[]>([]);
  const [activities, setActivities] = useState<DynamicItem[]>([]);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);

  // Helper to clear error when user interacts
  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs[field];
        return newErrs;
      });
    }
  };

  const inputErrorStyle = (field: string) => 
    errors[field] ? "border-red-500 ring-1 ring-red-500 bg-red-50/30" : "border-slate-100 bg-slate-50/50";

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('country').eq('id', user.id).single();
        if (profile?.country) setFormData(prev => ({ ...prev, country: profile.country }));
      }
    };
    fetchUserProfile();
  }, [user]);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.registrationName.trim()) newErrors.registrationName = "Business name is required";
      if (!formData.registrationNumber.trim()) newErrors.registrationNumber = "Registration number is required";
    }

    if (step === 2) {
      if (!formData.country) newErrors.country = "Country is required";
      if (!formData.place.trim()) newErrors.place = "City/Place is required";
      if (!formData.latitude) newErrors.gps = "GPS location is required";
      if (!formData.email.trim()) newErrors.email = "Business email is required";
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email format";
      if (!formData.phoneNumber || formData.phoneNumber.trim().length < 7) newErrors.phoneNumber = "Valid phone is required";
    }

    if (step === 3) {
      if (!formData.openingHours) newErrors.openingHours = "Opening time required";
      if (!formData.closingHours) newErrors.closingHours = "Closing time required";
      const hasSelectedDay = Object.values(workingDays).some(day => day === true);
      if (!hasSelectedDay) newErrors.workingDays = "Select at least one operating day";
    }

    // Step 4 (Amenities/Facilities/Activities) is skippable per user instructions

    if (step === 5) {
      if (galleryImages.length === 0) newErrors.gallery = "At least one photo is required";
    }

    if (step === 6) {
      if (!formData.description.trim()) newErrors.description = "Description is required";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast({ title: "Check required fields", description: "Please fill in all details highlighted in red.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
      window.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    setErrors({});
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({ ...prev, latitude, longitude }));
          clearError("gps");
          toast({ title: "Location Captured" });
        },
        () => toast({ title: "Error", description: "Enable location permissions.", variant: "destructive" })
      );
    }
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 5 - galleryImages.length);
    try {
      const compressed = await compressImages(newFiles);
      setGalleryImages(prev => [...prev, ...compressed.map(c => c.file)]);
      clearError("gallery");
    } catch (error) {
      setGalleryImages(prev => [...prev, ...newFiles]);
    }
  };

  const handleSubmit = async () => {
    if (!user) return navigate("/auth");
    if (!validateStep(currentStep)) return;
    setLoading(true);
    // ... (rest of your handleSubmit logic remains the same)
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header className="hidden md:block" />

      {/* Hero Header */}
      <div className="relative w-full h-[25vh] md:h-[35vh] bg-slate-900 overflow-hidden">
        <img src="/images/category-hotels.webp" className="w-full h-full object-cover opacity-50" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F8F9FA] via-transparent to-transparent" />
        <Button onClick={() => navigate(-1)} className="absolute top-4 left-4 rounded-full bg-black/30 backdrop-blur-md text-white border-none w-10 h-10 p-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="absolute bottom-8 left-0 w-full px-8 container mx-auto">
          <p className="text-[#FF7F50] font-black uppercase tracking-[0.2em] text-[10px] mb-2">Step {currentStep} of {TOTAL_STEPS}</p>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none text-white drop-shadow-2xl">
            List Your <span style={{ color: COLORS.TEAL }}>Property</span>
          </h1>
        </div>
      </div>

      <main className="container px-4 max-w-4xl mx-auto -mt-6 relative z-50">
        <div className="flex gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
            <div key={step} className={`h-2 flex-1 rounded-full transition-all duration-300 ${step <= currentStep ? 'bg-[#008080]' : 'bg-slate-200'}`} />
          ))}
        </div>

        {/* Step 1: Registration */}
        {currentStep === 1 && (
          <Card className="bg-white rounded-[28px] p-8 shadow-sm border-none animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-2" style={{ color: COLORS.TEAL }}>
              <CheckCircle2 className="h-5 w-5" /> Registration Details
            </h2>
            <div className="grid gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Business Name *</Label>
                <Input 
                  className={`rounded-xl h-12 font-bold ${inputErrorStyle("registrationName")}`}
                  value={formData.registrationName} 
                  onChange={(e) => { setFormData({...formData, registrationName: e.target.value}); clearError("registrationName"); }}
                  placeholder="Official Name"
                />
                {errors.registrationName && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.registrationName}</p>}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registration Number *</Label>
                  <Input 
                    className={`rounded-xl h-12 font-bold ${inputErrorStyle("registrationNumber")}`}
                    value={formData.registrationNumber} 
                    onChange={(e) => { setFormData({...formData, registrationNumber: e.target.value}); clearError("registrationNumber"); }}
                    placeholder="e.g. BN-12345"
                  />
                  {errors.registrationNumber && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.registrationNumber}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Property Category</Label>
                  <Select onValueChange={(v) => setFormData({...formData, establishmentType: v})} defaultValue="hotel">
                    <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50 h-12 font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="hotel">Hotel / Resort</SelectItem>
                      <SelectItem value="apartment">Serviced Apartment</SelectItem>
                      <SelectItem value="lodge">Safari Lodge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Step 2: Location & Contact */}
        {currentStep === 2 && (
          <Card className="bg-white rounded-[28px] p-8 shadow-sm border-none animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-2" style={{ color: COLORS.TEAL }}>
              <MapPin className="h-5 w-5" /> Location & Contact
            </h2>
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Country *</Label>
                  <CountrySelector value={formData.country} onChange={(v) => { setFormData({...formData, country: v}); clearError("country"); }} />
                  {errors.country && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.country}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">City / Place *</Label>
                  <Input className={`rounded-xl h-12 font-bold ${inputErrorStyle("place")}`} value={formData.place} onChange={(e) => { setFormData({...formData, place: e.target.value}); clearError("place"); }} placeholder="e.g. Nairobi" />
                  {errors.place && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.place}</p>}
                </div>
              </div>

              <div className={`p-6 rounded-[24px] border border-dashed transition-colors flex flex-col items-center text-center gap-4 ${errors.gps ? "border-red-400 bg-red-50" : "border-slate-200 bg-slate-50/50"}`}>
                <div className="p-4 rounded-full bg-white shadow-sm"><Navigation className="h-6 w-6" style={{ color: COLORS.CORAL }} /></div>
                <div>
                  <h4 className="font-black uppercase tracking-tighter text-sm">GPS Location *</h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">Stand at the entrance</p>
                </div>
                <Button type="button" onClick={getCurrentLocation} className="rounded-full px-8 font-black uppercase text-[10px] h-11" style={{ background: formData.latitude ? COLORS.TEAL : COLORS.CORAL }}>
                  {formData.latitude ? "✓ Captured" : "Capture Location"}
                </Button>
                {errors.gps && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.gps}</p>}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Business Email *</Label>
                  <Input type="email" className={`rounded-xl h-12 font-bold ${inputErrorStyle("email")}`} value={formData.email} onChange={(e) => { setFormData({...formData, email: e.target.value}); clearError("email"); }} placeholder="contact@hotel.com" />
                  {errors.email && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone Number *</Label>
                  <PhoneInput value={formData.phoneNumber} onChange={(v) => { setFormData({...formData, phoneNumber: v}); clearError("phoneNumber"); }} country={formData.country} className={errors.phoneNumber ? "border-red-500" : ""} />
                  {errors.phoneNumber && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.phoneNumber}</p>}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Step 3: Operating Hours */}
        {currentStep === 3 && (
          <Card className="bg-white rounded-[28px] p-8 shadow-sm border-none animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-2" style={{ color: COLORS.TEAL }}>
              <Clock className="h-5 w-5" /> Operating Hours *
            </h2>
            <div className={`p-4 rounded-2xl border transition-all ${errors.workingDays || errors.openingHours ? "border-red-200 bg-red-50/30" : "border-slate-50"}`}>
              <OperatingHoursSection
                openingHours={formData.openingHours}
                closingHours={formData.closingHours}
                workingDays={workingDays}
                onOpeningChange={(v) => { setFormData({...formData, openingHours: v}); clearError("openingHours"); }}
                onClosingChange={(v) => { setFormData({...formData, closingHours: v}); clearError("closingHours"); }}
                onDaysChange={(v) => { setWorkingDays(v); clearError("workingDays"); }}
                accentColor={COLORS.TEAL}
              />
              {(errors.workingDays || errors.openingHours) && (
                <div className="mt-4 flex items-center gap-2 text-red-600">
                  <Info className="h-3 w-3" />
                  <p className="text-[10px] font-black uppercase">{errors.workingDays || errors.openingHours}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Step 4: Offerings (SKIPPABLE) */}
        {currentStep === 4 && (
          <Card className="bg-white rounded-[28px] p-8 shadow-sm border-none animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-2" style={{ color: COLORS.TEAL }}>
              <DollarSign className="h-5 w-5" /> Amenities & Activities (Optional)
            </h2>
            <div className="space-y-8">
              <DynamicItemList items={amenities} onChange={setAmenities} label="Amenities" placeholder="WiFi, Pool" showPrice={false} accentColor={COLORS.TEAL} />
              <DynamicItemList items={facilities} onChange={setFacilities} label="Facilities" placeholder="Gym, Spa" showCapacity={true} accentColor={COLORS.CORAL} />
              <DynamicItemList items={activities} onChange={setActivities} label="Activities" placeholder="Tours" accentColor="#6366f1" />
            </div>
          </Card>
        )}

        {/* Step 5: Photos */}
        {currentStep === 5 && (
          <Card className="bg-white rounded-[28px] p-8 shadow-sm border-none animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-2" style={{ color: COLORS.TEAL }}>
              <Camera className="h-5 w-5" /> Gallery (Max 5) *
            </h2>
            <div className={`grid grid-cols-2 md:grid-cols-5 gap-3 p-4 rounded-2xl ${errors.gallery ? "border-2 border-red-500 bg-red-50" : ""}`}>
              {galleryImages.map((file, i) => (
                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-slate-100">
                  <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="" />
                  <button type="button" onClick={() => setGalleryImages(galleryImages.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 p-1 rounded-full text-white"><X className="h-3 w-3" /></button>
                </div>
              ))}
              {galleryImages.length < 5 && (
                <Label className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                  <Plus className="h-6 w-6 text-slate-400" />
                  <Input type="file" multiple className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e.target.files)} />
                </Label>
              )}
            </div>
            {errors.gallery && <p className="text-red-500 text-[10px] font-bold uppercase mt-3 text-center">{errors.gallery}</p>}
          </Card>
        )}

        {/* Step 6: Description */}
        {currentStep === 6 && (
          <Card className="bg-white rounded-[28px] p-8 shadow-sm border-none animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-black uppercase tracking-tight mb-4" style={{ color: COLORS.TEAL }}>The Experience *</h2>
            <Textarea 
              className={`rounded-[20px] min-h-[200px] p-4 font-medium ${inputErrorStyle("description")}`}
              placeholder="Unique selling points..."
              value={formData.description}
              onChange={(e) => { setFormData({...formData, description: e.target.value}); clearError("description"); }}
            />
            {errors.description && <p className="text-red-500 text-[10px] font-bold uppercase mt-2">{errors.description}</p>}
          </Card>
        )}

        <div className="flex gap-4 mt-8">
          {currentStep > 1 && (
            <Button type="button" onClick={handlePrevious} variant="outline" className="flex-1 py-6 rounded-2xl font-black uppercase text-sm">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          )}
          <Button 
            type="button" 
            onClick={currentStep < TOTAL_STEPS ? handleNext : handleSubmit} 
            disabled={loading}
            className="flex-1 py-6 rounded-2xl font-black uppercase text-sm text-white" 
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

export default CreateHotel;