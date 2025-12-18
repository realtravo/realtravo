import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Share2, Mail, Clock, ArrowLeft, Heart, Copy, Star, CheckCircle2 } from "lucide-react";
import { SimilarItems } from "@/components/SimilarItems";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { ReviewSection } from "@/components/ReviewSection";
import { useSavedItems } from "@/hooks/useSavedItems";
import { useAuth } from "@/contexts/AuthContext";
import { MultiStepBooking, BookingFormData } from "@/components/booking/MultiStepBooking";
import { generateReferralLink, trackReferralClick } from "@/lib/referralUtils";
import { useBookingSubmit } from "@/hooks/useBookingSubmit";
import { extractIdFromSlug } from "@/lib/slugUtils";
import { useGeolocation, calculateDistance } from "@/hooks/useGeolocation";

const COLORS = {
  TEAL: "#008080",
  RED: "#FF0000",
  ORANGE: "#FF9800",
  SOFT_GRAY: "#F8F9FA"
};

const AdventurePlaceDetail = () => {
  const { slug } = useParams();
  const id = slug ? extractIdFromSlug(slug) : null;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { position, requestLocation } = useGeolocation();
  
  const [place, setPlace] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const { savedItems, handleSave: handleSaveItem } = useSavedItems();
  const isSaved = savedItems.has(id || "");

  const distance = position && place?.latitude && place?.longitude
    ? calculateDistance(position.latitude, position.longitude, place.latitude, place.longitude)
    : undefined;

  useEffect(() => {
    if (id) fetchPlace();
    const urlParams = new URLSearchParams(window.location.search);
    const refSlug = urlParams.get("ref");
    if (refSlug && id) trackReferralClick(refSlug, id, "adventure_place", "booking");
  }, [id]);

  const fetchPlace = async () => {
    if (!id) return;
    try {
      let { data, error } = await supabase.from("adventure_places").select("*").eq("id", id).single();
      if (error && id.length === 8) {
        const { data: prefixData, error: prefixError } = await supabase.from("adventure_places").select("*").ilike("id", `${id}%`).single();
        if (!prefixError) { data = prefixData; error = null; }
      }
      if (error) throw error;
      setPlace(data);
    } catch (error) { toast({ title: "Place not found", variant: "destructive" }); } finally { setLoading(false); }
  };

  const handleSave = () => id && handleSaveItem(id, "adventure_place");
  const handleCopyLink = async () => {
    if (!place) return;
    const refLink = await generateReferralLink(place.id, "adventure_place", place.id);
    await navigator.clipboard.writeText(refLink);
    toast({ title: "Link Copied!" });
  };

  const handleShare = async () => {
    if (!place) return;
    const refLink = await generateReferralLink(place.id, "adventure_place", place.id);
    if (navigator.share) {
      try { await navigator.share({ title: place.name, url: refLink }); } catch (e) {}
    } else { handleCopyLink(); }
  };

  const openInMaps = () => {
    const query = encodeURIComponent(`${place?.name}, ${place?.location}`);
    window.open(place?.map_link || `https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  const { submitBooking } = useBookingSubmit();

  const handleBookingSubmit = async (data: BookingFormData) => {
    if (!place) return;
    setIsProcessing(true);
    try {
      const entryPrice = place.entry_fee_type === 'free' ? 0 : (place.entry_fee || 0);
      const totalAmount = (data.num_adults * entryPrice) + (data.num_children * entryPrice);
      await submitBooking({
        itemId: place.id, itemName: place.name, bookingType: 'adventure_place', totalAmount,
        slotsBooked: data.num_adults + data.num_children, visitDate: data.visit_date,
        guestName: data.guest_name, guestEmail: data.guest_email, guestPhone: data.guest_phone,
        hostId: place.created_by, bookingDetails: { ...data, place_name: place.name }
      });
      setIsCompleted(true);
      setBookingOpen(false);
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); } finally { setIsProcessing(false); }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 animate-pulse" />;
  if (!place) return null;

  const allImages = [place.image_url, ...(place.gallery_images || []), ...(place.images || [])].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header className="hidden md:block" />

      {/* Hero Section */}
      <div className="relative w-full overflow-hidden h-[45vh] md:h-[55vh]">
        <div className="absolute top-4 left-4 right-4 z-30 flex justify-between">
          <Button onClick={() => navigate(-1)} className="rounded-full bg-black/30 backdrop-blur-md text-white border-none w-10 h-10 p-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button onClick={handleSave} className={`rounded-full backdrop-blur-md border-none w-10 h-10 p-0 shadow-lg ${isSaved ? "bg-red-500" : "bg-black/30"}`}>
            <Heart className={`h-5 w-5 text-white ${isSaved ? "fill-white" : ""}`} />
          </Button>
        </div>

        <Carousel plugins={[Autoplay({ delay: 4000 })]} className="w-full h-full">
          <CarouselContent className="h-full">
            {allImages.map((img, idx) => (
              <CarouselItem key={idx} className="h-full">
                <div className="relative h-full w-full">
                  <img src={img} alt={place.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="absolute bottom-10 left-6 right-6 text-white">
          <Badge className="bg-[#008080] hover:bg-[#008080] border-none px-3 py-1 mb-3 uppercase font-black tracking-widest text-[10px]">Adventure Spot</Badge>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-none drop-shadow-xl mb-2">{place.name}</h1>
          <div className="flex items-center gap-2 opacity-90">
            <MapPin className="h-4 w-4 text-[#008080]" />
            <span className="text-sm font-bold uppercase tracking-wider">{place.location}, {place.country}</span>
            {distance && <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">{(distance).toFixed(1)}km away</span>}
          </div>
        </div>
      </div>

      <main className="container px-4 max-w-6xl mx-auto -mt-8 relative z-40">
        <div className="grid lg:grid-cols-[1.7fr,1fr] gap-6">
          <div className="space-y-6">
            {/* About */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
              <h2 className="text-xl font-black uppercase tracking-tight mb-4" style={{ color: COLORS.TEAL }}>Description</h2>
              <p className="text-slate-500 text-sm leading-relaxed">{place.description}</p>
            </div>

            {/* FACILITIES (Teal) */}
            {place.facilities?.length > 0 && (
              <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                <h2 className="text-xl font-black uppercase tracking-tight mb-6" style={{ color: COLORS.TEAL }}>Facilities & Rentals</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {place.facilities.map((f: any, i: number) => (
                    <div key={i} className="p-5 rounded-[22px] bg-slate-50 border border-slate-100 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-black uppercase text-slate-700 leading-tight">{f.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Capacity: {f.capacity || 'N/A'}</p>
                      </div>
                      <Badge className="bg-white text-[#008080] border-[#008080]/20 font-black">KSH {f.price}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ACTIVITIES (Orange) */}
            {place.activities?.length > 0 && (
              <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                <h2 className="text-xl font-black uppercase tracking-tight mb-6" style={{ color: COLORS.ORANGE }}>On-Site Activities</h2>
                <div className="flex flex-wrap gap-3">
                  {place.activities.map((act: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-orange-50/50 border border-orange-100/50">
                      <div className="w-2 h-2 rounded-full bg-[#FF9800]" />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-700 uppercase">{act.name}</span>
                        <span className="text-[10px] font-bold text-[#FF9800]">KSh {act.price} / person</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AMENITIES (Red) */}
            {place.amenities?.length > 0 && (
              <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                <h2 className="text-xl font-black uppercase tracking-tight mb-5" style={{ color: COLORS.RED }}>Top Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {place.amenities.map((item: string, i: number) => (
                    <div key={i} className="bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                      <span className="text-[10px] font-black text-red-600 uppercase tracking-wider">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-[32px] p-8 shadow-2xl border border-slate-100 lg:sticky lg:top-24">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Entry Fee</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black" style={{ color: COLORS.RED }}>
                      {place.entry_fee_type === 'free' ? 'FREE' : `KSh ${place.entry_fee}`}
                    </span>
                  </div>
                </div>
                <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 flex items-center gap-2">
                  <Clock className="h-4 w-4" style={{ color: COLORS.TEAL }} />
                  <span className="text-xs font-black text-slate-600 uppercase">Open Now</span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                  <span className="text-slate-400">Operating Hours</span>
                  <span className="text-slate-700 font-black">{place.opening_hours} - {place.closing_hours}</span>
                </div>
                <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                  <span className="text-slate-400">Available Slots</span>
                  <span className="text-green-600 font-black">{place.available_slots} Left</span>
                </div>
              </div>

              <Button 
                onClick={() => setBookingOpen(true)}
                className="w-full py-8 rounded-2xl text-md font-black uppercase tracking-[0.2em] text-white shadow-xl transition-all active:scale-95 border-none"
                style={{ 
                    background: `linear-gradient(135deg, ${COLORS.TEAL} 0%, #005F5F 100%)`,
                    boxShadow: `0 12px 24px -8px ${COLORS.TEAL}88`
                }}
              >
                Book Adventure
              </Button>

              <div className="grid grid-cols-3 gap-3 mt-8">
                <UtilityButton icon={<MapPin className="h-5 w-5" />} label="Map" onClick={openInMaps} />
                <UtilityButton icon={<Copy className="h-5 w-5" />} label="Copy" onClick={handleCopyLink} />
                <UtilityButton icon={<Share2 className="h-5 w-5" />} label="Share" onClick={handleShare} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
           <h2 className="text-xl font-black uppercase tracking-tight mb-8" style={{ color: COLORS.TEAL }}>Visitor Ratings</h2>
           <ReviewSection itemId={place.id} itemType="adventure_place" />
        </div>

        <div className="mt-16">
           <SimilarItems currentItemId={place.id} itemType="adventure" country={place.country} />
        </div>
      </main>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-[40px] border-none">
          <MultiStepBooking 
            onSubmit={handleBookingSubmit} facilities={place.facilities || []} 
            activities={place.activities || []} 
            priceAdult={place.entry_fee_type === 'free' ? 0 : place.entry_fee} 
            priceChild={place.entry_fee_type === 'free' ? 0 : place.entry_fee} 
            isProcessing={isProcessing} isCompleted={isCompleted} 
            itemName={place.name} itemId={place.id} bookingType="adventure_place" 
            hostId={place.created_by || ""} onPaymentSuccess={() => setIsCompleted(true)} 
          />
        </DialogContent>
      </Dialog>
      <MobileBottomBar />
    </div>
  );
};