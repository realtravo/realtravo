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

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
  KHAKI: "#F0E68C",
  KHAKI_DARK: "#857F3E",
  SOFT_GRAY: "#F8F9FA"
};

const TOTAL_STEPS = 6;

const CreateAdventure = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
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
    adultPrice: "0",
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

  // Clear specific error when user interacts with a field
  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs[field];
        return newErrs;
      });
    }
  };

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
      if (!formData.registrationName.trim()) newErrors.registrationName = "Registration name is required";
      if (!formData.registrationNumber.trim()) newErrors.registrationNumber = "Registration number is required";
      if (!formData.country) newErrors.country = "Please select a country";
    }

    if (step === 2) {
      if (!formData.locationName.trim()) newErrors.locationName = "Location name is required";
      if (!formData.place.trim()) newErrors.place = "Place/City is required";
      if (!formData.latitude) newErrors.gps = "Please capture GPS coordinates";
    }

    if (step === 3) {
      if (!formData.email.trim()) newErrors.email = "Business email is required";
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email format";
      
      if (!formData.phoneNumber || formData.phoneNumber.trim().length < 7) newErrors.phoneNumber = "Valid WhatsApp/Phone is required";
      if (!formData.description.trim()) newErrors.description = "Description is required";
    }

    if (step === 4) {
      if (!formData.openingHours) newErrors.openingHours = "Opening time is required";
      if (!formData.closingHours) newErrors.closingHours = "Closing time is required";
      const hasSelectedDay = Object.values(workingDays).some(day => day === true);
      if (!hasSelectedDay) newErrors.workingDays = "Select at least one operating day";
    }

    if (step === 6) {
      if (galleryImages.length === 0) newErrors.gallery = "At least one photo is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
      window.scrollTo(0, 0);
    } else {
      toast({ title: "Form Incomplete", description: "Please fix the errors highlighted in red.", variant: "destructive" });
    }
  };

  const handlePrevious = () => {
    setErrors({});
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  const inputErrorStyle = (field: string) => 
    errors[field] ? "border-red-500 ring-1 ring-red-500 bg-red-50/30" : "border-slate-100 bg-slate-50/50";

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({ ...prev, latitude, longitude }));
          clearError("gps");
          toast({ title: "Coordinates captured" });
        },
        () => toast({ title: "Location Error", variant: "destructive" })
      );
    }
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 5 - galleryImages.length);
    try {
      const compressed = await compressImages(newFiles);
      setGalleryImages(prev => [...prev, ...compressed.map(c => c.file)].slice(0, 5));
      clearError("gallery");
    } catch (error) {
      setGalleryImages(prev => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const handleSubmit = async () => {
    if (!user) { navigate("/auth"); return; }
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

      const selectedDays = Object.entries(workingDays).filter(([_, s]) => s).map(([d]) => d);

      const { error } = await supabase.from("adventure_places").insert([{
        name: formData.registrationName,
        registration_number: formData.registrationNumber,
        location: formData.locationName,
        place: formData.place,
        country: formData.country,
        description: formData.description,
        email: formData.email,
        phone_numbers: formData.phoneNumber ? [formData.phoneNumber] : [],
        map_link: formData.latitude ? `https://www.google.com/maps?q=${formData.latitude},${formData.longitude}` : "",
        latitude: formData.latitude,
        longitude: formData.longitude,
        opening_hours: formData.openingHours,
        closing_hours: formData.closingHours,
        days_opened: selectedDays,
        image_url: uploadedUrls[0],
        gallery_images: uploadedUrls,
        entry_fee_type: formData.entranceFeeType,
        entry_fee: formData.entranceFeeType === "paid" ? parseFloat(formData.adultPrice) : 0,
        amenities: amenities.map(a => a.name),
        facilities: facilities.map(f => ({ name: f.name, price: f.price, is_free: f.priceType === 'free' })),
        activities: activities.map(a => ({ name: a.name, price: a.price, is_free: a.priceType === 'free' })),
        created_by: user.id,
        approval_status: "pending"
      }]);

      if (error) throw error;
      toast({ title: "Success!", description: "Adventure submitted for review." });
      navigate("/become-host");
    } catch (error: any) {
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header />
      
      {/* Visual Header */}
      <div className="relative h-[25vh] w-full overflow-hidden bg-slate-900">
        <img src="/images/category-campsite.webp" className="absolute inset-0 w-full h-full object-cover opacity-60" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F8F9FA] to-transparent" />
        <div className="absolute bottom-6 left-0 w-full px-6 container max-w-4xl mx-auto">
          <p className="text-[#FF7F50] font-black uppercase tracking-widest text-[10px] mb-1">Step {currentStep} / {TOTAL_STEPS}</p>
          <h1 className="text-2xl md:text-4xl font-black uppercase text-white tracking-tighter">Create Adventure</h1>
        </div>
      </div>

      <main className="container px-4 max-w-4xl mx-auto -mt-4 relative z-50">
        {/* Progress Bar */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: i + 1 <= currentStep ? COLORS.TEAL : '#E2E8F0' }} />
          ))}
        </div>

        {/* Step 1: Legal */}
        {currentStep === 1 && (
          <Card className="p-6 md:p-8 rounded-[24px] border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-lg font-black uppercase mb-6" style={{ color: COLORS.TEAL }}>Business Identity</h2>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Official Registration Name *</Label>
                <Input 
                  value={formData.registrationName} 
                  onChange={(e) => { setFormData({...formData, registrationName: e.target.value}); clearError("registrationName"); }} 
                  className={`h-12 rounded-xl font-medium ${inputErrorStyle("registrationName")}`}
                />
                {errors.registrationName && <span className="text-red-500 text-[10px] font-bold uppercase">{errors.registrationName}</span>}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Reg. Number *</Label>
                  <Input 
                    value={formData.registrationNumber} 
                    onChange={(e) => { setFormData({...formData, registrationNumber: e.target.value}); clearError("registrationNumber"); }} 
                    className={`h-12 rounded-xl font-medium ${inputErrorStyle("registrationNumber")}`}
                  />
                  {errors.registrationNumber && <span className="text-red-500 text-[10px] font-bold uppercase">{errors.registrationNumber}</span>}
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Country *</Label>
                  <CountrySelector 
                    value={formData.country} 
                    onChange={(v) => { setFormData({...formData, country: v}); clearError("country"); }} 
                  />
                  {errors.country && <span className="text-red-500 text-[10px] font-bold uppercase">{errors.country}</span>}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Step 2: Location */}
        {currentStep === 2 && (
          <Card className="p-6 md:p-8 rounded-[24px] border-slate-100 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-lg font-black uppercase mb-6" style={{ color: COLORS.TEAL }}>Adventure Location</h2>
            <div className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Location Name *</Label>
                  <Input value={formData.locationName} onChange={(e) => { setFormData({...formData, locationName: e.target.value}); clearError("locationName"); }} className={`h-12 rounded-xl ${inputErrorStyle("locationName")}`} />
                  {errors.locationName && <span className="text-red-500 text-[10px] font-bold uppercase">{errors.locationName}</span>}
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">City / Town *</Label>
                  <Input value={formData.place} onChange={(e) => { setFormData({...formData, place: e.target.value}); clearError("place"); }} className={`h-12 rounded-xl ${inputErrorStyle("place")}`} />
                  {errors.place && <span className="text-red-500 text-[10px] font-bold uppercase">{errors.place}</span>}
                </div>
              </div>
              <div className={`p-5 rounded-2xl border ${errors.gps ? "border-red-400 bg-red-50/50" : "border-khaki-dark/20 bg-khaki/10"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase text-khaki-dark">Precise GPS Capture *</p>
                    <p className="text-[10px] text-slate-500">Stand at the entrance for best accuracy</p>
                  </div>
                  <Button onClick={getCurrentLocation} variant="outline" className="rounded-xl border-khaki-dark text-khaki-dark font-bold text-xs h-10 px-4">
                    <Navigation className="h-3 w-3 mr-2" /> {formData.latitude ? "Re-capture" : "Capture"}
                  </Button>
                </div>
                {formData.latitude && <p className="mt-2 text-[10px] font-mono font-bold text-teal-700">COORD: {formData.latitude.toFixed(5)}, {formData.longitude?.toFixed(5)}</p>}
                {errors.gps && <p className="mt-2 text-red-500 text-[10px] font-bold uppercase">{errors.gps}</p>}
              </div>
            </div>
          </Card>
        )}

        {/* Step 3: Contact */}
        {currentStep === 3 && (
          <Card className="p-6 md:p-8 rounded-[24px] border-slate-100 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-lg font-black uppercase mb-6" style={{ color: COLORS.TEAL }}>Contact & Info</h2>
            <div className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Email Address *</Label>
                  <Input value={formData.email} onChange={(e) => { setFormData({...formData, email: e.target.value}); clearError("email"); }} className={`h-12 rounded-xl ${inputErrorStyle("email")}`} />
                  {errors.email && <span className="text-red-500 text-[10px] font-bold uppercase">{errors.email}</span>}
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">WhatsApp Number *</Label>
                  <PhoneInput 
                    value={formData.phoneNumber} 
                    onChange={(v) => { setFormData({...formData, phoneNumber: v}); clearError("phoneNumber"); }} 
                    className={errors.phoneNumber ? "border-red-500" : ""}
                  />
                  {errors.phoneNumber && <span className="text-red-500 text-[10px] font-bold uppercase">{errors.phoneNumber}</span>}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Detailed Description *</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={(e) => { setFormData({...formData, description: e.target.value}); clearError("description"); }} 
                  rows={4} 
                  className={`rounded-xl resize-none ${inputErrorStyle("description")}`} 
                />
                {errors.description && <span className="text-red-500 text-[10px] font-bold uppercase">{errors.description}</span>}
              </div>
            </div>
          </Card>
        )}

        {/* Step 4: Schedule */}
        {currentStep === 4 && (
          <Card className="p-6 md:p-8 rounded-[24px] border-slate-100 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-lg font-black uppercase mb-6" style={{ color: COLORS.TEAL }}>Operating Schedule</h2>
            <div className={`p-4 rounded-2xl border transition-all ${errors.workingDays || errors.openingHours ? "border-red-400 bg-red-50/20" : "border-slate-50 bg-slate-50/30"}`}>
              <OperatingHoursSection
                openingHours={formData.openingHours}
                closingHours={formData.closingHours}
                workingDays={workingDays}
                onOpeningChange={(v) => { setFormData({...formData, openingHours: v}); clearError("openingHours"); }}
                onClosingChange={(v) => { setFormData({...formData, closingHours: v}); clearError("closingHours"); }}
                onDaysChange={(v) => { setWorkingDays(v); clearError("workingDays"); }}
                accentColor={COLORS.TEAL}
              />
              {(errors.workingDays || errors.openingHours || errors.closingHours) && (
                <div className="mt-4 flex items-center gap-2 text-red-600">
                  <Info className="h-3 w-3" />
                  <p className="text-[10px] font-bold uppercase">
                    {errors.workingDays || errors.openingHours || errors.closingHours}
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-8 grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Entrance Fee Type</Label>
                <Select value={formData.entranceFeeType} onValueChange={(v) => setFormData({...formData, entranceFeeType: v})}>
                  <SelectTrigger className="rounded-xl h-12 border-slate-100"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white"><SelectItem value="free">FREE</SelectItem><SelectItem value="paid">PAID</SelectItem></SelectContent>
                </Select>
              </div>
              {formData.entranceFeeType === "paid" && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Price (KSh)</Label>
                  <Input type="number" value={formData.adultPrice} onChange={(e) => setFormData({...formData, adultPrice: e.target.value})} className="rounded-xl h-12" />
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Step 5: Items */}
        {currentStep === 5 && (
          <Card className="p-6 md:p-8 rounded-[24px] border-slate-100 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-lg font-black uppercase mb-6" style={{ color: COLORS.TEAL }}>Offerings</h2>
            <div className="space-y-8">
              <DynamicItemList items={amenities} onChange={setAmenities} label="Amenities" placeholder="e.g. WiFi, Parking" showPrice={false} accentColor={COLORS.TEAL} />
              <DynamicItemList items={facilities} onChange={setFacilities} label="Facilities" placeholder="e.g. Tents" showCapacity={true} accentColor={COLORS.CORAL} />
              <DynamicItemList items={activities} onChange={setActivities} label="Activities" placeholder="e.g. Hiking" accentColor="#6366f1" />
            </div>
          </Card>
        )}

        {/* Step 6: Gallery */}
        {currentStep === 6 && (
          <Card className="p-6 md:p-8 rounded-[24px] border-slate-100 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-lg font-black uppercase mb-6" style={{ color: COLORS.TEAL }}>Photo Gallery *</h2>
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-2xl border-2 border-dashed ${errors.gallery ? "border-red-400 bg-red-50/50" : "border-slate-100"}`}>
              {galleryImages.map((file, index) => (
                <div key={index} className="relative aspect-square rounded-xl overflow-hidden shadow-sm">
                  <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="" />
                  <button onClick={() => removeImage(index)} className="absolute top-1.5 right-1.5 bg-red-500 text-white p-1 rounded-full"><X className="h-3 w-3" /></button>
                </div>
              ))}
              {galleryImages.length < 5 && (
                <Label className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50">
                  <Plus className="h-5 w-5 text-slate-400" />
                  <span className="text-[8px] font-black uppercase text-slate-400 mt-1">Upload</span>
                  <Input type="file" multiple className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e.target.files)} />
                </Label>
              )}
            </div>
            {errors.gallery && <p className="text-red-500 text-[10px] font-bold uppercase mt-3 text-center">{errors.gallery}</p>}
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          {currentStep > 1 && (
            <Button onClick={handlePrevious} variant="outline" className="flex-1 py-6 rounded-2xl font-black uppercase text-xs">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          )}
          {currentStep < TOTAL_STEPS ? (
            <Button onClick={handleNext} className="flex-1 py-6 rounded-2xl font-black uppercase text-xs text-white" style={{ background: COLORS.CORAL }}>
              Next Step <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading} className="flex-1 py-6 rounded-2xl font-black uppercase text-xs text-white" style={{ background: COLORS.TEAL }}>
              {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Finish & Submit"}
            </Button>
          )}
        </div>
      </main>
      <MobileBottomBar />
    </div>
  );
};

export default CreateAdventure;