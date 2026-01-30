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
    adultPrice: "0",
    childPrice: "0",
    latitude: null as number | null,
    longitude: null as number | null
  });

  const [creatorProfile, setCreatorProfile] = useState({ name: "", email: "", phone: "" });
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
        const { data: profile } = await supabase.from('profiles').select('country, name, email, phone_number').eq('id', user.id).single();
        if (profile?.country) setFormData(prev => ({ ...prev, country: profile.country }));
        if (profile) {
          setCreatorProfile({
            name: profile.name || "",
            email: profile.email || user.email || "",
            phone: profile.phone_number || ""
          });
        }
      }
    };
    fetchUserProfile();
  }, [user]);

  const errorClass = (field: string) => 
    errors[field] ? "border-red-500 bg-red-50 ring-1 ring-red-500" : "border-slate-100 bg-slate-50/50";

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({ ...prev, latitude, longitude }));
          setErrors(prev => ({ ...prev, gps: false }));
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
      setErrors(prev => ({ ...prev, gallery: false }));
    } catch (error) {
      setGalleryImages(prev => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const removeImage = (index: number) => setGalleryImages(prev => prev.filter((_, i) => i !== index));

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
      const hasDays = Object.values(workingDays).some(v => v);
      if (!hasDays) newErrors.workingDays = true;
    }

    if (step === 5) {
      // Logic: If a facility is added, capacity MUST be present
      const invalidFacility = facilities.some(f => f.name.trim() !== "" && (!f.capacity || parseInt(f.capacity) <= 0));
      if (invalidFacility) {
        toast({ title: "Capacity Required", description: "Please provide capacity for all added facilities.", variant: "destructive" });
        return false;
      }
    }

    if (step === 6) {
      if (galleryImages.length === 0) {
        newErrors.gallery = true;
        toast({ title: "Photos Required", description: "At least one photo is required", variant: "destructive" });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setErrors({});
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
    } else {
      toast({ title: "Missing Details", description: "Please fill all required fields highlighted in red.", variant: "destructive" });
    }
  };

  const handlePrevious = () => {
    setErrors({});
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

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
        child_entry_fee: formData.entranceFeeType === "paid" ? parseFloat(formData.childPrice) : 0,
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

        {/* Step 1: Registration */}
        {currentStep === 1 && (
          <Card className="bg-white rounded-[28px] p-8 shadow-sm border border-slate-100">
            <h2 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-3" style={{ color: COLORS.TEAL }}>
              <Info className="h-5 w-5" /> Registration
            </h2>
            <div className="grid gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registration Name *</Label>
                <Input
                  value={formData.registrationName}
                  onChange={(e) => setFormData({...formData, registrationName: e.target.value})}
                  className={`rounded-xl h-12 font-bold transition-all ${errorClass('registrationName')}`}
                  placeholder="Official Government Name"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registration Number *</Label>
                  <Input
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({...formData, registrationNumber: e.target.value})}
                    className={`rounded-xl h-12 font-bold ${errorClass('registrationNumber')}`}
                    placeholder="e.g. BN-X12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Country *</Label>
                  <div className={errors.country ? "rounded-xl ring-2 ring-red-500" : ""}>
                    <CountrySelector value={formData.country} onChange={(v) => setFormData({...formData, country: v})} />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Step 2: Location */}
        {currentStep === 2 && (
          <Card className="bg-white rounded-[28px] p-8 shadow-sm border border-slate-100">
            <h2 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-3" style={{ color: COLORS.TEAL }}>
              <MapPin className="h-5 w-5" /> Location Details
            </h2>
            <div className="grid gap-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location Name *</Label>
                  <Input
                    value={formData.locationName}
                    onChange={(e) => setFormData({...formData, locationName: e.target.value})}
                    className={`rounded-xl h-12 font-bold ${errorClass('locationName')}`}
                    placeholder="Area / Forest / Beach"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Place (City/Town) *</Label>
                  <Input
                    value={formData.place}
                    onChange={(e) => setFormData({...formData, place: e.target.value})}
                    className={`rounded-xl h-12 font-bold ${errorClass('place')}`}
                    placeholder="e.g. Nairobi"
                  />
                </div>
              </div>

              <div className={`p-6 rounded-2xl border-2 border-dashed transition-colors ${errors.gps ? "border-red-500 bg-red-50" : "border-slate-200 bg-slate-50/50"}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Navigation className={`h-6 w-6 ${errors.gps ? "text-red-500" : "text-slate-400"}`} />
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">GPS Coordinates *</Label>
                  </div>
                  <Button type="button" onClick={getCurrentLocation}
                    className="text-white rounded-xl px-6 h-12 font-black uppercase text-[10px] tracking-widest"
                    style={{ background: formData.latitude ? COLORS.TEAL : COLORS.CORAL }}
                  >
                    {formData.latitude ? '✓ Captured' : 'Auto-Capture GPS'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Step 3: Contact */}
        {currentStep === 3 && (
          <Card className="bg-white rounded-[28px] p-8 shadow-sm border border-slate-100">
            <h2 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-3" style={{ color: COLORS.TEAL }}>
              <Mail className="h-5 w-5" /> Contact & About
            </h2>
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Business Email *</Label>
                  <Input 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className={`rounded-xl h-12 font-bold ${errorClass('email')}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">WhatsApp / Phone *</Label>
                  <div className={errors.phoneNumber ? "rounded-xl ring-2 ring-red-500" : ""}>
                    <PhoneInput value={formData.phoneNumber} onChange={(v) => setFormData({...formData, phoneNumber: v})} country={formData.country} />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className={`rounded-2xl font-bold min-h-[150px] ${errorClass('description')}`}
                  placeholder="Describe the adventure..."
                />
              </div>
            </div>
          </Card>
        )}

        {/* Step 4: Schedule */}
        {currentStep === 4 && (
          <Card className={`bg-white rounded-[28px] p-8 shadow-sm border transition-all ${errors.workingDays || errors.openingHours ? "border-red-500 bg-red-50/30" : "border-slate-100"}`}>
            <h2 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-3" style={{ color: COLORS.TEAL }}>
              <Clock className="h-5 w-5" /> Schedule & Pricing *
            </h2>
            <OperatingHoursSection
              openingHours={formData.openingHours}
              closingHours={formData.closingHours}
              workingDays={workingDays}
              onOpeningChange={(v) => setFormData({...formData, openingHours: v})}
              onClosingChange={(v) => setFormData({...formData, closingHours: v})}
              onDaysChange={setWorkingDays}
              accentColor={COLORS.TEAL}
            />
          </Card>
        )}

        {/* Step 5: Items (Optional Amenities, Mandatory Capacity for Facilities) */}
        {currentStep === 5 && (
          <Card className="bg-white rounded-[28px] p-8 shadow-sm border border-slate-100">
            <h2 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-3" style={{ color: COLORS.TEAL }}>
              <DollarSign className="h-5 w-5" /> Features
            </h2>
            <div className="space-y-8">
              <DynamicItemList items={amenities} onChange={setAmenities} label="Amenities (Optional)" accentColor={COLORS.TEAL} />
              
              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100">
                <p className="text-[9px] font-black text-amber-600 uppercase mb-4 tracking-tighter">Note: Capacity is mandatory for all facilities added.</p>
                <DynamicItemList 
                    items={facilities} 
                    onChange={setFacilities} 
                    label="Facilities" 
                    showCapacity={true} 
                    accentColor={COLORS.CORAL} 
                />
              </div>

              <DynamicItemList items={activities} onChange={setActivities} label="Activities" accentColor="#6366f1" />
            </div>
          </Card>
        )}

        {/* Step 6: Photos */}
        {currentStep === 6 && (
          <Card className={`bg-white rounded-[28px] p-8 shadow-sm border transition-all ${errors.gallery ? "border-red-500 bg-red-50" : "border-slate-100"}`}>
            <h2 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-3" style={{ color: COLORS.TEAL }}>
              <Camera className="h-5 w-5" /> Gallery (Max 5) *
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {galleryImages.map((file, index) => (
                <div key={index} className="relative aspect-square rounded-[20px] overflow-hidden border-2 border-slate-100">
                  <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="Preview" />
                  <button onClick={() => removeImage(index)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {galleryImages.length < 5 && (
                <Label className={`aspect-square rounded-[20px] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 ${errors.gallery ? "border-red-500" : "border-slate-200"}`}>
                  <Plus className="h-6 w-6 text-slate-400" />
                  <Input type="file" multiple className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e.target.files)} />
                </Label>
              )}
            </div>
          </Card>
        )}

        {/* Step 7: Review */}
        {currentStep === 7 && (
          <ReviewStep
            type="adventure"
            data={{ ...formData, workingDays: Object.entries(workingDays).filter(([_, v]) => v).map(([d]) => d), amenities, facilities, activities, imageCount: galleryImages.length }}
            creatorName={creatorProfile.name}
            creatorEmail={creatorProfile.email}
            creatorPhone={creatorProfile.phone}
            accentColor={COLORS.TEAL}
          />
        )}

        {/* Navigation */}
        <div className="flex gap-4 mt-8">
          {currentStep > 1 && (
            <Button onClick={handlePrevious} variant="outline" className="flex-1 py-6 rounded-2xl font-black uppercase tracking-widest text-sm">
              <ArrowLeft className="h-4 w-4 mr-2" /> Previous
            </Button>
          )}
          
          <Button 
            onClick={currentStep < TOTAL_STEPS ? handleNext : handleSubmit} 
            disabled={loading}
            className="flex-1 py-6 rounded-2xl font-black uppercase tracking-widest text-sm text-white"
            style={{ background: currentStep < TOTAL_STEPS ? COLORS.CORAL : COLORS.TEAL }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : currentStep < TOTAL_STEPS ? "Next" : "Submit for Approval"}
          </Button>
        </div>
      </main>
      <MobileBottomBar />
    </div>
  );
};

export default CreateAdventure;