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
import { ArrowLeft, Camera, CheckCircle2, Navigation, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { CountrySelector } from "@/components/creation/CountrySelector";
import { PhoneInput } from "@/components/creation/PhoneInput";
import { approvalStatusSchema } from "@/lib/validation";
import { compressImages } from "@/lib/imageCompression";
import { OperatingHoursSection } from "@/components/creation/OperatingHoursSection";

// --- CONSTANTS & STYLED COMPONENTS (Defined outside to prevent re-render focus loss) ---

interface WorkingDays {
  Mon: boolean; Tue: boolean; Wed: boolean; Thu: boolean; Fri: boolean; Sat: boolean; Sun: boolean;
}

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
  SOFT_GRAY: "#F8F9FA"
};

const TOTAL_STEPS = 6;

const StyledInput = ({ className = "", isError, ...props }: React.ComponentProps<typeof Input> & { isError?: boolean }) => (
  <Input 
    className={`rounded-xl border-slate-100 bg-slate-50 focus:bg-white transition-all h-12 font-bold 
    ${isError ? "border-red-500 bg-red-50 focus-visible:ring-red-500" : ""} ${className}`} 
    {...props} 
  />
);

// --- MAIN COMPONENT ---

const CreateTripEvent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    place: "",
    country: "",
    date: "",
    price: "0",
    price_child: "0",
    available_tickets: "0",
    email: "",
    phone_number: "",
    map_link: "",
    is_custom_date: false,
    type: "trip" as "trip" | "event",
    latitude: null as number | null,
    longitude: null as number | null,
    opening_hours: "",
    closing_hours: "",
  });
  
  const [workingDays, setWorkingDays] = useState<WorkingDays>({
    Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: false
  });
  
  const [galleryImages, setGalleryImages] = useState<File[]>([]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('country, email').eq('id', user.id).single();
        if (profile?.country) {
          setFormData(prev => ({ ...prev, country: profile.country, email: profile.email || user.email || '' }));
        }
      }
    };
    fetchUserProfile();
  }, [user]);

  const validateStep = (step: number): boolean => {
    const newErrors: string[] = [];
    if (step === 2) {
      if (!formData.name.trim()) newErrors.push("name");
      if (!formData.country) newErrors.push("country");
      if (!formData.place.trim()) newErrors.push("place");
      if (!formData.location.trim()) newErrors.push("location");
      if (!formData.is_custom_date && !formData.date) newErrors.push("date");
    } else if (step === 3) {
      if (!formData.price || parseFloat(formData.price) < 0) newErrors.push("price");
      if (!formData.available_tickets || parseInt(formData.available_tickets) <= 0) newErrors.push("available_tickets");
    } else if (step === 4) {
      if (!formData.phone_number) newErrors.push("phone_number");
      if (!formData.map_link) newErrors.push("map_link");
    } else if (step === 5) {
      if (formData.is_custom_date || formData.type === 'event') {
        if (!formData.opening_hours) newErrors.push("opening_hours");
        if (!formData.closing_hours) newErrors.push("closing_hours");
      }
    } else if (step === 6) {
      if (!formData.description.trim()) newErrors.push("description");
    }

    setErrors(newErrors);
    if (newErrors.length > 0) {
      toast({ title: "Required Fields", description: "Please fill in the highlighted sections.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
  };

  const handlePrevious = () => {
    setErrors([]);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      toast({ title: "Locating...", description: "Fetching GPS coordinates." });
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
          setFormData(prev => ({ ...prev, map_link: mapUrl, latitude, longitude }));
          setErrors(prev => prev.filter(e => e !== "map_link"));
          toast({ title: "Location Added", description: "Current location pinned successfully." });
        },
        () => toast({ title: "Error", description: "Please enable location permissions.", variant: "destructive" }),
        { enableHighAccuracy: true }
      );
    }
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 5 - galleryImages.length);
    const compressed = await compressImages(newFiles);
    setGalleryImages(prev => [...prev, ...compressed.map(c => c.file)].slice(0, 5));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    if (!user) { navigate("/auth"); return; }
    setLoading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of galleryImages) {
        const fileName = `${user.id}/${Math.random()}.${file.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('user-content-images').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('user-content-images').getPublicUrl(fileName);
        uploadedUrls.push(publicUrl);
      }

      const daysOpened = (Object.keys(workingDays) as (keyof WorkingDays)[]).filter(day => workingDays[day]);

      const { error } = await supabase.from("trips").insert([{
        ...formData,
        date: formData.is_custom_date ? new Date().toISOString().split('T')[0] : formData.date,
        image_url: uploadedUrls[0] || "",
        gallery_images: uploadedUrls,
        price: parseFloat(formData.price),
        price_child: parseFloat(formData.price_child) || 0,
        available_tickets: parseInt(formData.available_tickets) || 0,
        days_opened: daysOpened.length > 0 ? daysOpened : null,
        created_by: user.id,
        approval_status: approvalStatusSchema.parse("pending")
      }]);

      if (error) throw error;
      toast({ title: "Success!", description: "Experience submitted for approval." });
      navigate("/become-host");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header />
      <main className="container px-4 py-8 max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="relative rounded-[40px] overflow-hidden mb-8 shadow-2xl h-[200px] md:h-[280px]">
          <img src="/images/category-trips.webp" className="w-full h-full object-cover" alt="Header" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8">
            <Button onClick={() => navigate(-1)} className="absolute top-6 left-6 rounded-full bg-white/20 backdrop-blur-md border-none w-10 h-10 p-0 text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <p className="text-[#FF7F50] font-black uppercase tracking-[0.2em] text-[10px] mb-2">Step {currentStep} of {TOTAL_STEPS}</p>
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter">
              Create <span style={{ color: COLORS.TEAL }}>Experience</span>
            </h1>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
            <div key={step} className="h-2 flex-1 rounded-full transition-all duration-300"
              style={{ backgroundColor: step <= currentStep ? COLORS.TEAL : '#e2e8f0' }} />
          ))}
        </div>

        {/* Form Steps */}
        {currentStep === 1 && (
          <Card className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
            <h2 className="text-xs font-black uppercase tracking-widest mb-6" style={{ color: COLORS.TEAL }}>Select Listing Type</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[{ id: 'trip', label: 'Trip / Tour' }, { id: 'event', label: 'Event / Sport' }].map((t) => (
                <label key={t.id} className={`relative p-6 rounded-[24px] border-2 cursor-pointer transition-all ${formData.type === t.id ? 'border-[#008080] bg-[#008080]/5' : 'border-slate-100 bg-slate-50'}`}>
                  <input type="radio" name="type" className="hidden" checked={formData.type === t.id} onChange={() => setFormData(prev => ({...prev, type: t.id as any}))} />
                  <div className="flex justify-between items-center">
                    <span className={`font-black uppercase text-sm ${formData.type === t.id ? 'text-[#008080]' : 'text-slate-600'}`}>{t.label}</span>
                    {formData.type === t.id && <CheckCircle2 className="h-5 w-5 text-[#008080]" />}
                  </div>
                </label>
              ))}
            </div>
          </Card>
        )}

        {currentStep === 2 && (
          <Card className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 space-y-6">
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Experience Name *</Label>
              <StyledInput isError={errors.includes("name")} value={formData.name} onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))} />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Country *</Label>
                  <div className={errors.includes("country") ? "border-2 border-red-500 rounded-xl" : ""}>
                    <CountrySelector value={formData.country} onChange={(v) => setFormData(prev => ({...prev, country: v}))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Region *</Label>
                  <StyledInput isError={errors.includes("place")} value={formData.place} onChange={(e) => setFormData(prev => ({...prev, place: e.target.value}))} />
                </div>
              </div>

              <Label className="text-[10px] font-black uppercase text-slate-400">Specific Location *</Label>
              <StyledInput isError={errors.includes("location")} value={formData.location} onChange={(e) => setFormData(prev => ({...prev, location: e.target.value}))} />

              <div className="pt-4 border-t border-slate-50 space-y-4">
                {formData.type === "trip" && (
                  <div className="flex items-center space-x-3 bg-slate-50 p-4 rounded-2xl">
                    <Checkbox id="flexible" checked={formData.is_custom_date} onCheckedChange={(c) => setFormData(prev => ({...prev, is_custom_date: !!c}))} />
                    <label htmlFor="flexible" className="text-[11px] font-black uppercase text-slate-500 cursor-pointer">Flexible dates</label>
                  </div>
                )}
                {!formData.is_custom_date && (
                  <StyledInput isError={errors.includes("date")} type="date" value={formData.date} onChange={(e) => setFormData(prev => ({...prev, date: e.target.value}))} />
                )}
              </div>
            </div>
          </Card>
        )}

        {currentStep === 3 && (
          <Card className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Price (KSh) *</Label>
                <StyledInput isError={errors.includes("price")} type="number" value={formData.price} onChange={(e) => setFormData(prev => ({...prev, price: e.target.value}))} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Available Slots *</Label>
                <StyledInput isError={errors.includes("available_tickets")} type="number" value={formData.available_tickets} onChange={(e) => setFormData(prev => ({...prev, available_tickets: e.target.value}))} />
              </div>
            </div>
          </Card>
        )}

        {currentStep === 4 && (
          <Card className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Phone *</Label>
              <div className={errors.includes("phone_number") ? "border-2 border-red-500 rounded-xl" : ""}>
                <PhoneInput value={formData.phone_number} onChange={(v) => setFormData(prev => ({...prev, phone_number: v}))} country={formData.country} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">GPS Location *</Label>
              <div className={`flex gap-2 p-1 rounded-2xl ${errors.includes("map_link") ? "border-2 border-red-500" : ""}`}>
                <StyledInput className="flex-1" readOnly value={formData.map_link} placeholder="Tap icon to pin location" />
                <Button onClick={getCurrentLocation} type="button" className="h-12 w-12 rounded-2xl" style={{ background: formData.map_link ? COLORS.TEAL : COLORS.CORAL }}>
                  <Navigation className="h-5 w-5 text-white" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-4 pt-4">
              {galleryImages.map((file, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden shadow-sm">
                   <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt={`Upload ${i}`} />
                </div>
              ))}
              {galleryImages.length < 5 && (
                <Label className="aspect-square border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                  <Camera className="text-slate-400" />
                  <Input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageUpload(e.target.files)} />
                </Label>
              )}
            </div>
          </Card>
        )}

        {currentStep === 5 && (
          <Card className={`bg-white rounded-[32px] p-8 shadow-sm border ${errors.includes("opening_hours") ? "border-red-500" : "border-slate-100"}`}>
            <OperatingHoursSection
              openingHours={formData.opening_hours} 
              closingHours={formData.closing_hours}
              workingDays={workingDays} 
              onOpeningChange={(v) => setFormData(prev => ({...prev, opening_hours: v}))}
              onClosingChange={(v) => setFormData(prev => ({...prev, closing_hours: v}))}
              onDaysChange={setWorkingDays} 
              accentColor={COLORS.TEAL}
            />
          </Card>
        )}

        {currentStep === 6 && (
          <Card className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
            <Label className="text-xs font-black uppercase text-slate-400 mb-4 block">Description *</Label>
            <Textarea 
              className={`rounded-[24px] border-slate-100 bg-slate-50 p-6 min-h-[200px] font-medium ${errors.includes("description") ? "border-red-500 bg-red-50" : ""}`} 
              placeholder="Tell us more about the experience..."
              value={formData.description} 
              onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))} 
            />
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4 mt-8">
          {currentStep > 1 && (
            <Button onClick={handlePrevious} variant="outline" className="flex-1 py-6 rounded-2xl border-2 font-bold">
              Previous
            </Button>
          )}
          {currentStep < TOTAL_STEPS ? (
            <Button 
              onClick={handleNext} 
              className="flex-1 py-6 rounded-2xl text-white font-black shadow-lg" 
              style={{ background: `linear-gradient(135deg, ${COLORS.CORAL_LIGHT} 0%, ${COLORS.CORAL} 100%)` }}
            >
              Next Step
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={loading} 
              className="flex-1 py-6 rounded-2xl text-white font-black shadow-lg" 
              style={{ background: COLORS.TEAL }}
            >
              {loading ? <Loader2 className="animate-spin" /> : "Submit Experience"}
            </Button>
          )}
        </div>
      </main>
      <MobileBottomBar />
    </div>
  );
};

export default CreateTripEvent;