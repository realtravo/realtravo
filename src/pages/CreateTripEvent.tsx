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
import { Calendar, MapPin, DollarSign, Users, Navigation, ArrowLeft, ArrowRight, Camera, CheckCircle2, X, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { CountrySelector } from "@/components/creation/CountrySelector";
import { PhoneInput } from "@/components/creation/PhoneInput";
import { approvalStatusSchema } from "@/lib/validation";
import { compressImages } from "@/lib/imageCompression";
import { OperatingHoursSection } from "@/components/creation/OperatingHoursSection";

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

const CreateTripEvent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [attemptedNext, setAttemptedNext] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    place: "",
    country: "",
    date: "",
    price: "",
    price_child: "0",
    available_tickets: "",
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
        } else if (user.email) {
          setFormData(prev => ({ ...prev, email: user.email || '' }));
        }
      }
    };
    fetchUserProfile();
  }, [user]);

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
          setFormData(prev => ({ ...prev, map_link: mapUrl, latitude, longitude }));
          toast({ title: "Location Added", description: "Current location pinned." });
        },
        () => toast({ title: "Error", description: "Unable to get location.", variant: "destructive" })
      );
    }
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 5 - galleryImages.length);
    try {
      const compressed = await compressImages(newFiles);
      setGalleryImages(prev => [...prev, ...compressed.map(c => c.file)].slice(0, 5));
    } catch (error) {
      setGalleryImages(prev => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const removeImage = (index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: return !!formData.type;
      case 2:
        return !!(formData.name.trim() && formData.country && formData.place.trim() && formData.location.trim() && (formData.is_custom_date || formData.date));
      case 3:
        return !!(formData.price && parseFloat(formData.price) >= 0 && formData.available_tickets && parseInt(formData.available_tickets) > 0);
      case 4:
        return !!(formData.phone_number && formData.map_link && galleryImages.length > 0);
      case 5:
        if (formData.is_custom_date || formData.type === 'event') {
          return !!(formData.opening_hours && formData.closing_hours && Object.values(workingDays).some(Boolean));
        }
        return true;
      case 6:
        return !!formData.description.trim();
      default:
        return true;
    }
  };

  const handleNext = () => {
    setAttemptedNext(true);
    if (validateStep(currentStep)) {
      setAttemptedNext(false);
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
      window.scrollTo(0, 0);
    } else {
      toast({ title: "Details Required", description: "Please complete all fields highlighted in red to proceed.", variant: "destructive" });
    }
  };

  const handlePrevious = () => {
    setAttemptedNext(false);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setAttemptedNext(true);
    if (!user) { navigate("/auth"); return; }
    if (!validateStep(6)) return;

    setLoading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of galleryImages) {
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const { error: uploadError } = await supabase.storage.from('user-content-images').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('user-content-images').getPublicUrl(fileName);
        uploadedUrls.push(publicUrl);
      }

      const daysOpened = (Object.keys(workingDays) as (keyof WorkingDays)[]).filter(day => workingDays[day]);

      const { error } = await supabase.from("trips").insert([{
        name: formData.name,
        description: formData.description,
        location: formData.location,
        place: formData.place,
        country: formData.country,
        date: formData.is_custom_date ? new Date().toISOString().split('T')[0] : formData.date,
        is_custom_date: formData.is_custom_date,
        is_flexible_date: formData.is_custom_date,
        type: formData.type,
        image_url: uploadedUrls[0] || "",
        gallery_images: uploadedUrls,
        price: parseFloat(formData.price),
        price_child: parseFloat(formData.price_child) || 0,
        available_tickets: parseInt(formData.available_tickets) || 0,
        email: formData.email,
        phone_number: formData.phone_number,
        map_link: formData.map_link,
        opening_hours: formData.opening_hours || null,
        closing_hours: formData.closing_hours || null,
        days_opened: daysOpened.length > 0 ? daysOpened : null,
        created_by: user.id,
        approval_status: "pending"
      }]);

      if (error) throw error;
      toast({ title: "Success!", description: "Experience submitted for review." });
      navigate("/become-host");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getErrorClass = (value: any) => {
    const isEmpty = Array.isArray(value) ? value.length === 0 : !value || value.toString().trim() === "";
    return attemptedNext && isEmpty ? "border-red-500 bg-red-50 ring-1 ring-red-500" : "border-slate-100 bg-slate-50";
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header />
      <main className="container px-4 py-8 max-w-4xl mx-auto">
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
        
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
            <div key={step} className="h-2 flex-1 rounded-full transition-all duration-300"
              style={{ backgroundColor: step <= currentStep ? COLORS.TEAL : '#e2e8f0' }}
            />
          ))}
        </div>

        {currentStep === 1 && (
          <Card className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xs font-black uppercase tracking-widest mb-6" style={{ color: COLORS.TEAL }}>Select Listing Type</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[{ id: 'trip', label: 'Trip / Tour' }, { id: 'event', label: 'Event / Sport' }].map((t) => (
                <label key={t.id} className={`relative p-6 rounded-[24px] border-2 cursor-pointer transition-all ${formData.type === t.id ? 'border-[#008080] bg-[#008080]/5' : 'border-slate-100 bg-slate-50'}`}>
                  <input type="radio" name="type" className="hidden" onChange={() => setFormData({...formData, type: t.id as any})} />
                  <div className="flex justify-between items-center">
                    <span className="font-black uppercase tracking-tight text-sm">{t.label}</span>
                    {formData.type === t.id && <CheckCircle2 className="h-5 w-5 text-[#008080]" />}
                  </div>
                </label>
              ))}
            </div>
          </Card>
        )}

        {currentStep === 2 && (
          <Card className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 space-y-6">
            <div className="space-y-2">
              <Label className={`text-[10px] font-black uppercase ${attemptedNext && !formData.name ? 'text-red-500' : 'text-slate-400'}`}>Experience Name *</Label>
              <Input className={`rounded-xl h-12 font-bold ${getErrorClass(formData.name)}`} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Hiking in the Clouds" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className={`text-[10px] font-black uppercase ${attemptedNext && !formData.country ? 'text-red-500' : 'text-slate-400'}`}>Country *</Label>
                <div className={`rounded-xl overflow-hidden ${attemptedNext && !formData.country ? "ring-1 ring-red-500" : ""}`}>
                  <CountrySelector value={formData.country} onChange={(v) => setFormData({...formData, country: v})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className={`text-[10px] font-black uppercase ${attemptedNext && !formData.place ? 'text-red-500' : 'text-slate-400'}`}>Region / Place *</Label>
                <Input className={`rounded-xl h-12 font-bold ${getErrorClass(formData.place)}`} value={formData.place} onChange={(e) => setFormData({...formData, place: e.target.value})} placeholder="e.g. Mt. Kenya" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className={`text-[10px] font-black uppercase ${attemptedNext && !formData.location ? 'text-red-500' : 'text-slate-400'}`}>Specific Location *</Label>
              <Input className={`rounded-xl h-12 font-bold ${getErrorClass(formData.location)}`} value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} placeholder="e.g. Nanyuki Main Gate" />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center space-x-3 bg-slate-50 p-4 rounded-2xl">
                <Checkbox id="custom_date" checked={formData.is_custom_date} onCheckedChange={(c) => setFormData({...formData, is_custom_date: c as boolean})} />
                <label htmlFor="custom_date" className="text-[11px] font-black uppercase text-slate-500">Flexible dates / Open availability</label>
              </div>
              {!formData.is_custom_date && (
                <div className="space-y-2">
                  <Label className={`text-[10px] font-black uppercase ${attemptedNext && !formData.date ? 'text-red-500' : ''}`}>Date *</Label>
                  <Input type="date" className={`rounded-xl h-12 font-bold ${getErrorClass(formData.date)}`} value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                </div>
              )}
            </div>
          </Card>
        )}

        {currentStep === 3 && (
          <Card className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className={`text-[10px] font-black uppercase ${attemptedNext && !formData.price ? 'text-red-500' : ''}`}>Adult Price *</Label>
                <Input type="number" className={`h-12 ${getErrorClass(formData.price)}`} value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase">Child Price</Label>
                <Input type="number" className="rounded-xl h-12" value={formData.price_child} onChange={(e) => setFormData({...formData, price_child: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className={`text-[10px] font-black uppercase ${attemptedNext && !formData.available_tickets ? 'text-red-500' : ''}`}>Max Slots *</Label>
                <Input type="number" className={`h-12 ${getErrorClass(formData.available_tickets)}`} value={formData.available_tickets} onChange={(e) => setFormData({...formData, available_tickets: e.target.value})} />
              </div>
            </div>
          </Card>
        )}

        {currentStep === 4 && (
          <Card className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase">Contact Email</Label>
                <Input className="rounded-xl h-12 bg-slate-50" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className={`text-[10px] font-black uppercase ${attemptedNext && !formData.phone_number ? 'text-red-500' : ''}`}>Phone Number *</Label>
                <div className={`rounded-xl ${attemptedNext && !formData.phone_number ? "ring-1 ring-red-500" : ""}`}>
                  <PhoneInput value={formData.phone_number} onChange={(v) => setFormData({...formData, phone_number: v})} country={formData.country} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className={`text-[10px] font-black uppercase ${attemptedNext && !formData.map_link ? 'text-red-500' : ''}`}>GPS Location *</Label>
              <div className="flex gap-2">
                <Input className={`flex-1 rounded-xl h-12 ${getErrorClass(formData.map_link)}`} readOnly value={formData.map_link} placeholder="Click icon to pin" />
                <Button onClick={getCurrentLocation} className="h-12 w-12 rounded-xl" style={{ background: formData.map_link ? COLORS.TEAL : COLORS.CORAL }}>
                  <Navigation className="h-5 w-5 text-white" />
                </Button>
              </div>
            </div>

            {/* Restored Image Upload Section */}
            <div className="pt-6 border-t border-slate-100">
              <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${attemptedNext && galleryImages.length === 0 ? 'text-red-500' : 'text-[#008080]'}`}>Gallery (Max 5) *</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {galleryImages.map((file, index) => (
                  <div key={index} className="relative aspect-square rounded-[20px] overflow-hidden border-2 border-slate-100">
                    <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="Preview" />
                    <button type="button" onClick={() => removeImage(index)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {galleryImages.length < 5 && (
                  <Label className={`aspect-square rounded-[20px] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors ${attemptedNext && galleryImages.length === 0 ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}>
                    <Camera className={`h-6 w-6 ${attemptedNext && galleryImages.length === 0 ? 'text-red-500' : 'text-slate-400'}`} />
                    <span className="text-[9px] font-black uppercase text-slate-400 mt-1">Add</span>
                    <Input type="file" multiple className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e.target.files)} />
                  </Label>
                )}
              </div>
              {attemptedNext && galleryImages.length === 0 && <p className="text-[10px] text-red-500 font-bold mt-2 uppercase">At least one photo is required</p>}
            </div>
          </Card>
        )}

        {currentStep === 5 && (
          <Card className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
            <h2 className="text-xs font-black uppercase mb-6" style={{ color: COLORS.TEAL }}>Operating Hours</h2>
            <OperatingHoursSection
              openingHours={formData.opening_hours} closingHours={formData.closing_hours} workingDays={workingDays}
              onOpeningChange={(v) => setFormData({...formData, opening_hours: v})}
              onClosingChange={(v) => setFormData({...formData, closing_hours: v})}
              onDaysChange={setWorkingDays} accentColor={COLORS.TEAL}
            />
            {attemptedNext && (formData.is_custom_date || formData.type === 'event') && (!formData.opening_hours || !Object.values(workingDays).some(v => v)) && (
              <p className="text-red-500 text-[10px] mt-4 font-bold uppercase italic text-center">Operating hours and days are required for flexible/event types</p>
            )}
          </Card>
        )}

        {currentStep === 6 && (
          <Card className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
            <Label className={`text-xs font-black uppercase mb-4 block ${attemptedNext && !formData.description ? 'text-red-500' : 'text-[#008080]'}`}>Experience Description *</Label>
            <Textarea 
              className={`rounded-[24px] min-h-[200px] p-6 text-sm ${getErrorClass(formData.description)}`} 
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})} 
              placeholder="Tell travelers what makes this experience special..." 
            />
          </Card>
        )}

        <div className="flex gap-4 mt-8">
          {currentStep > 1 && (
            <Button onClick={handlePrevious} variant="outline" className="flex-1 py-6 rounded-2xl font-black uppercase text-sm border-2">
              <ArrowLeft className="h-4 w-4 mr-2" /> Previous
            </Button>
          )}
          {currentStep < TOTAL_STEPS ? (
            <Button onClick={handleNext} className="flex-1 py-6 rounded-2xl font-black uppercase text-sm text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${COLORS.CORAL_LIGHT} 0%, ${COLORS.CORAL} 100%)` }}>
              Next <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading} className="flex-1 py-6 rounded-2xl font-black uppercase text-sm text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${COLORS.TEAL} 0%, #006666 100%)` }}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Submit for Approval"}
            </Button>
          )}
        </div>
      </main>
      <MobileBottomBar />
    </div>
  );
};

export default CreateTripEvent;