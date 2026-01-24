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
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Please enter a valid email address";
      
      if (!formData.phoneNumber || formData.phoneNumber.trim().length < 7) newErrors.phoneNumber = "A valid phone number is required";
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
    if (Object.keys(newErrors).length > 0) {
      toast({ title: "Check required fields", description: "Please fill in all details highlighted in red.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const handlePrevious = () => {
    setErrors({});
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Helper for Input Error Styling
  const inputErrorStyle = (field: string) => errors[field] ? "border-red-500 focus-visible:ring-red-500 bg-red-50/30" : "border-slate-100 bg-slate-50/50";

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({ ...prev, latitude, longitude }));
          setErrors(prev => ({ ...prev, gps: "" }));
          toast({ title: "Coordinates captured", description: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
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
      setErrors(prev => ({ ...prev, gallery: "" }));
    } catch (error) {
      setGalleryImages(prev => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const removeImage = (index: number) => setGalleryImages(prev => prev.filter((_, i) => i !== index));

  const formatItemsForDB = (items: DynamicItem[]) => {
    return items.map(item => ({
      name: item.name,
      price: item.priceType === "paid" ? parseFloat(item.price) || 0 : 0,
      is_free: item.priceType === "free",
      capacity: item.capacity ? parseInt(item.capacity) : null
    }));
  };

  const handleSubmit = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!validateStep(currentStep)) return;

    setLoading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of galleryImages) {
        const fileName = `${user.id}/${Math.random()}.${file.name.split('.').pop()}`;
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
        facilities: formatItemsForDB(facilities),
        activities: formatItemsForDB(activities),
        created_by: user.id,
        approval_status: "pending"
      }]);

      if (error) throw error;
      toast({ title: "Experience Submitted", description: "Pending admin review." });
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
      
      {/* Header UI */}
      <div className="relative h-[30vh] w-full overflow-hidden bg-slate-900">
        <img src="/images/category-campsite.webp" className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Header" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F8F9FA] via-transparent to-transparent" />
        <Button onClick={() => navigate(-1)} className="absolute top-4 left-4 rounded-full bg-black/30 backdrop-blur-md text-white border-none w-10 h-10 p-0 z-50">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="absolute bottom-8 left-0 w-full px-8 container max-w-4xl mx-auto">
          <p className="text-[#FF7F50] font-black uppercase tracking-[0.2em] text-[10px] mb-2">Step {currentStep} of {TOTAL_STEPS}</p>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none text-white drop-shadow-2xl">
            Create <span style={{ color: COLORS.KHAKI }}>Adventure</span>
          </h1>
        </div>
      </div>

      <main className="container px-4 max-w-4xl mx-auto -mt-6 relative z-50">
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
            <div key={step} className="h-2 flex-1 rounded-full transition-all duration-300"
              style={{ backgroundColor: step <= currentStep ? COLORS.TEAL : '#e2e8f0' }}
            />
          ))}
        </div>

        {/* Step 1 */}
        {currentStep === 1 && (
          <Card className="bg-white rounded-[28px] p-8 shadow-sm border border-slate-100 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-black uppercase tracking-tight mb-6" style={{ color: COLORS.TEAL }}>Registration</h2>
            <div className="grid gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registration Name *</Label>
                <Input value={formData.registrationName} onChange={(e) => setFormData({...formData, registrationName: e.target.value})} placeholder="Official Government Name" className={`rounded-xl h-12 font-bold ${inputErrorStyle("registrationName")}`} />
                {errors.registrationName && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.registrationName}</p>}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registration Number *</Label>
                  <Input value={formData.registrationNumber} onChange={(e) => setFormData({...formData, registrationNumber: e.target.value})} placeholder="e.g. BN-X12345" className={`rounded-xl h-12 font-bold ${inputErrorStyle("registrationNumber")}`} />
                  {errors.registrationNumber && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.registrationNumber}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Country *</Label>
                  <CountrySelector value={formData.country} onChange={(value) => setFormData({...formData, country: value})} />
                  {errors.country && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.country}</p>}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Step 2 */}
        {currentStep === 2 && (
          <Card className="bg-white rounded-[28px] p-8 shadow-sm border border-slate-100 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-black uppercase tracking-tight mb-6" style={{ color: COLORS.TEAL }}>Location Details</h2>
            <div className="grid gap-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location Name *</Label>
                  <Input value={formData.locationName} onChange={(e) => setFormData({...formData, locationName: e.target.value})} placeholder="Area / Forest / Beach" className={`rounded-xl h-12 font-bold ${inputErrorStyle("locationName")}`} />
                  {errors.locationName && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.locationName}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Place (City/Town) *</Label>
                  <Input value={formData.place} onChange={(e) => setFormData({...formData, place: e.target.value})} placeholder="e.g. Nairobi" className={`rounded-xl h-12 font-bold ${inputErrorStyle("place")}`} />
                  {errors.place && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.place}</p>}
                </div>
              </div>
              <div className={`p-6 rounded-2xl border ${errors.gps ? "bg-red-50 border-red-200" : "bg-[#F0E68C]/10 border-[#F0E68C]/30"} space-y-4`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#857F3E]">GPS Coordinates *</h4>
                  <Button type="button" onClick={getCurrentLocation} className="text-white rounded-xl px-6 h-12 font-black uppercase text-[10px]" style={{ background: formData.latitude ? COLORS.TEAL : COLORS.KHAKI_DARK }}>
                    <Navigation className="h-4 w-4 mr-2" /> {formData.latitude ? '✓ Captured' : 'Capture GPS'}
                  </Button>
                </div>
                {errors.gps && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.gps}</p>}
              </div>
            </div>
          </Card>
        )}

        {/* Step 3: Contact & Description - NEW VALIDATION UI */}
        {currentStep === 3 && (
          <Card className="bg-white rounded-[28px] p-8 shadow-sm border border-slate-100 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-black uppercase tracking-tight mb-6" style={{ color: COLORS.TEAL }}>Contact & About</h2>
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Business Email *</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="contact@business.com" className={`rounded-xl h-12 font-bold ${inputErrorStyle("email")}`} />
                  {errors.email && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">WhatsApp / Phone *</Label>
                  <PhoneInput value={formData.phoneNumber} onChange={(value) => setFormData({...formData, phoneNumber: value})} country={formData.country} className={errors.phoneNumber ? "border-red-500" : ""} />
                  {errors.phoneNumber && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.phoneNumber}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description *</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Tell the community what makes this adventure special..." rows={5} className={`rounded-2xl font-bold resize-none ${inputErrorStyle("description")}`} />
                {errors.description && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.description}</p>}
              </div>
            </div>
          </Card>
        )}

        {/* Step 4: Schedule - NEW VALIDATION UI */}
        {currentStep === 4 && (
          <Card className="bg-white rounded-[28px] p-8 shadow-sm border border-slate-100 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-black uppercase tracking-tight mb-6" style={{ color: COLORS.TEAL }}>Access & Pricing</h2>
            <div className="grid gap-8">
              <div className={`p-6 rounded-2xl border transition-colors ${errors.workingDays || errors.openingHours || errors.closingHours ? "border-red-200 bg-red-50/30" : "border-slate-50"}`}>
                <OperatingHoursSection
                  openingHours={formData.openingHours}
                  closingHours={formData.closingHours}
                  workingDays={workingDays}
                  onOpeningChange={(v) => setFormData({...formData, openingHours: v})}
                  onClosingChange={(v) => setFormData({...formData, closingHours: v})}
                  onDaysChange={setWorkingDays}
                  accentColor={COLORS.TEAL}
                />
                {(errors.workingDays || errors.openingHours || errors.closingHours) && (
                  <div className="mt-4 p-3 bg-red-100/50 rounded-lg border border-red-200">
                    <p className="text-red-600 text-[10px] font-black uppercase tracking-tight flex items-center gap-2">
                      <Info className="h-3 w-3" /> 
                      Error: {errors.workingDays || errors.openingHours || errors.closingHours}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entrance Fee</Label>
                  <Select value={formData.entranceFeeType} onValueChange={(v) => setFormData({...formData, entranceFeeType: v})}>
                    <SelectTrigger className="rounded-xl h-12 font-bold border-slate-100"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white rounded-xl font-bold">
                      <SelectItem value="free">FREE ACCESS</SelectItem>
                      <SelectItem value="paid">PAID ADMISSION</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.entranceFeeType === "paid" && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Adult Entry (KSh)</Label>
                    <Input type="number" value={formData.adultPrice} onChange={(e) => setFormData({...formData, adultPrice: e.target.value})} className="rounded-xl h-12 border-slate-100 font-bold" />
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Step 5 */}
        {currentStep === 5 && (
          <Card className="bg-white rounded-[28px] p-8 shadow-sm border border-slate-100 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-black uppercase tracking-tight mb-6" style={{ color: COLORS.TEAL }}>Amenities, Facilities & Activities</h2>
            <div className="space-y-8">
              <DynamicItemList items={amenities} onChange={setAmenities} label="Amenities" placeholder="e.g. Parking" showCapacity={false} showPrice={false} accentColor={COLORS.TEAL} />
              <DynamicItemList items={facilities} onChange={setFacilities} label="Facilities" placeholder="e.g. Campsite" showCapacity={true} accentColor={COLORS.CORAL} />
              <DynamicItemList items={activities} onChange={setActivities} label="Activities" placeholder="e.g. Hiking" showCapacity={false} accentColor="#6366f1" />
            </div>
          </Card>
        )}

        {/* Step 6 */}
        {currentStep === 6 && (
          <Card className="bg-white rounded-[28px] p-8 shadow-sm border border-slate-100 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-black uppercase tracking-tight mb-6" style={{ color: COLORS.TEAL }}>Gallery (Max 5) *</h2>
            <div className={`grid grid-cols-2 md:grid-cols-5 gap-4 p-4 rounded-2xl ${errors.gallery ? "border-2 border-red-500 bg-red-50/50" : ""}`}>
              {galleryImages.map((file, index) => (
                <div key={index} className="relative aspect-square rounded-[20px] overflow-hidden border-2 border-slate-100">
                  <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="Preview" />
                  <button type="button" onClick={() => removeImage(index)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"><X className="h-3 w-3" /></button>
                </div>
              ))}
              {galleryImages.length < 5 && (
                <Label className={`aspect-square rounded-[20px] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 ${errors.gallery ? "border-red-400" : "border-slate-200"}`}>
                  <Plus className="h-6 w-6 text-slate-400" />
                  <span className="text-[9px] font-black uppercase text-slate-400 mt-1">Add Photo</span>
                  <Input type="file" multiple className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e.target.files)} />
                </Label>
              )}
            </div>
            {errors.gallery && <p className="text-red-500 text-[10px] font-bold uppercase mt-2 text-center">{errors.gallery}</p>}
          </Card>
        )}

        {/* Footer Navigation */}
        <div className="flex gap-4 mt-8">
          {currentStep > 1 && (
            <Button type="button" onClick={handlePrevious} variant="outline" className="flex-1 py-6 rounded-2xl font-black uppercase text-sm">
              <ArrowLeft className="h-4 w-4 mr-2" /> Previous
            </Button>
          )}
          {currentStep < TOTAL_STEPS ? (
            <Button type="button" onClick={handleNext} className="flex-1 py-6 rounded-2xl font-black uppercase text-sm text-white" style={{ background: `linear-gradient(135deg, ${COLORS.CORAL_LIGHT} 0%, ${COLORS.CORAL} 100%)` }}>
              Next <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={loading} className="flex-1 py-6 rounded-2xl font-black uppercase text-sm text-white" style={{ background: `linear-gradient(135deg, ${COLORS.TEAL} 0%, #006666 100%)` }}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : "Submit"}
            </Button>
          )}
        </div>
      </main>
      <MobileBottomBar />
    </div>
  );
};

export default CreateAdventure;