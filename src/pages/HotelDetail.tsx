import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Share2, Mail, Clock, ArrowLeft, Heart, Copy, Star } from "lucide-react"; 
import { SimilarItems } from "@/components/SimilarItems";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { ReviewSection } from "@/components/ReviewSection";
import Autoplay from "embla-carousel-autoplay";
import { useSavedItems } from "@/hooks/useSavedItems";
import { useAuth } from "@/contexts/AuthContext";
import { MultiStepBooking, BookingFormData } from "@/components/booking/MultiStepBooking";
import { generateReferralLink, trackReferralClick } from "@/lib/referralUtils";
import { useBookingSubmit } from "@/hooks/useBookingSubmit";
import { extractIdFromSlug } from "@/lib/slugUtils";
import { useGeolocation, calculateDistance } from "@/hooks/useGeolocation";

// Color Constants
const COLORS = {
  TEAL: "#008080",
  ORANGE: "#FF9800",
  RED: "#EF4444",
  DARK_RGBA: "rgba(0, 0, 0, 0.5)"
};

const HotelDetail = () => {
  const { slug } = useParams();
  const id = slug ? extractIdFromSlug(slug) : null;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { position, requestLocation } = useGeolocation();
  
  const [hotel, setHotel] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const { savedItems, handleSave: handleSaveItem } = useSavedItems();
  const isSaved = savedItems.has(id || "");

  const distance = position && hotel?.latitude && hotel?.longitude
    ? calculateDistance(position.latitude, position.longitude, hotel.latitude, hotel.longitude)
    : undefined;

  useEffect(() => {
    if (id) fetchHotel();
    requestLocation();
  }, [id]);

  const fetchHotel = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase.from("hotels").select("*").eq("id", id).single();
      if (error) throw error;
      setHotel(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load hotel", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleSave = () => id && handleSaveItem(id, "hotel");

  const openInMaps = () => {
    const query = encodeURIComponent(`${hotel?.name}, ${hotel?.location}`);
    window.open(hotel?.map_link || `https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  const { submitBooking } = useBookingSubmit();

  const handleBookingSubmit = async (data: BookingFormData) => {
    if (!hotel) return;
    setIsProcessing(true);
    try {
      await submitBooking({
        itemId: hotel.id, itemName: hotel.name, bookingType: 'hotel',
        totalAmount: 0, // Calculated in MultiStep
        slotsBooked: data.num_adults + data.num_children,
        visitDate: data.visit_date, guestName: data.guest_name,
        guestEmail: data.guest_email, guestPhone: data.guest_phone,
        hostId: hotel.created_by, bookingDetails: data
      });
      setIsCompleted(true);
    } catch (error: any) {
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
    } finally { setIsProcessing(false); }
  };

  if (loading || !hotel) return <div className="min-h-screen bg-slate-50 animate-pulse" />;

  const displayImages = [hotel.image_url, ...(hotel.gallery_images || []), ...(hotel.images || [])].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header className="hidden md:block" />

      {/* Hero Section */}
      <div className="relative w-full overflow-hidden h-[45vh] md:h-[60vh]">
        <div className="absolute top-4 left-4 right-4 z-40 flex justify-between">
          <Button onClick={() => navigate(-1)} className="rounded-full text-white border-none h-10 w-10" style={{ backgroundColor: COLORS.DARK_RGBA }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button onClick={handleSave} className="rounded-full text-white border-none h-10 w-10" style={{ backgroundColor: isSaved ? COLORS.RED : COLORS.DARK_RGBA }}>
            <Heart className={`h-5 w-5 ${isSaved ? "fill-white" : ""}`} />
          </Button>
        </div>

        <Carousel plugins={[Autoplay({ delay: 3000 })]} className="h-full w-full" setApi={(api) => api?.on("select", () => setCurrent(api.selectedScrollSnap()))}>
          <CarouselContent className="h-full">
            {displayImages.map((img, idx) => (
              <CarouselItem key={idx} className="h-full">
                <img src={img} alt={hotel.name} className="w-full h-full object-cover" />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />
        
        <div className="absolute bottom-8 left-0 right-0 px-6 z-20">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white drop-shadow-lg">
            {hotel.name}
          </h1>
          <div className="flex items-center gap-2 mt-2 text-teal-100/80">
            <MapPin className="h-4 w-4" style={{ color: COLORS.TEAL }} />
            <span className="text-sm font-bold uppercase tracking-widest">{hotel.location}</span>
          </div>
        </div>

        {displayImages.length > 1 && (
          <div className="absolute bottom-4 right-4 flex gap-1 z-30">
            {displayImages.map((_, idx) => (
              <div key={idx} className={`h-1.5 transition-all rounded-full ${current === idx ? 'bg-white w-6' : 'bg-white/40 w-1.5'}`} />
            ))}
          </div>
        )}
      </div>

      <main className="container px-4 max-w-6xl mx-auto -mt-6 relative z-30">
        <div className="grid lg:grid-cols-[1.8fr,1fr] gap-6">
          
          {/* Main Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-[28px] p-6 shadow-sm border border-slate-100">
              <h2 className="text-sm font-black uppercase tracking-[0.2em] mb-3" style={{ color: COLORS.TEAL }}>About</h2>
              <p className="text-slate-500 text-sm leading-relaxed">{hotel.description}</p>
            </div>

            {/* Amenities Section - RED */}
            {hotel.amenities?.length > 0 && (
              <div className="bg-white rounded-[28px] p-6 shadow-sm border border-slate-100">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] mb-4" style={{ color: COLORS.RED }}>Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {hotel.amenities.map((item: string, i: number) => (
                    <Badge key={i} className="px-4 py-2 rounded-full border-none text-white font-bold" style={{ backgroundColor: COLORS.RED }}>
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Facilities Section - TEAL */}
            {hotel.facilities?.length > 0 && (
              <div className="bg-white rounded-[28px] p-6 shadow-sm border border-slate-100">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] mb-4" style={{ color: COLORS.TEAL }}>Room Types</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {hotel.facilities.map((f: any, i: number) => (
                    <div key={i} className="p-4 rounded-2xl text-white flex justify-between items-center" style={{ backgroundColor: COLORS.TEAL }}>
                      <span className="font-bold uppercase text-xs">{f.name}</span>
                      <span className="text-xs font-black">KSH {f.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activities Section - ORANGE */}
            {hotel.activities?.length > 0 && (
              <div className="bg-white rounded-[28px] p-6 shadow-sm border border-slate-100">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] mb-4" style={{ color: COLORS.ORANGE }}>Experiences</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {hotel.activities.map((a: any, i: number) => (
                    <div key={i} className="p-4 rounded-2xl text-white flex justify-between items-center" style={{ backgroundColor: COLORS.ORANGE }}>
                      <span className="font-bold uppercase text-xs">{a.name}</span>
                      <span className="text-xs font-black">KSH {a.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-[32px] p-8 shadow-xl border border-slate-100 lg:sticky lg:top-24">
              <div className="flex items-center gap-3 mb-6">
                <Clock className="h-5 w-5" style={{ color: COLORS.TEAL }} />
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Availability</p>
                  <p className="text-xs font-bold">{hotel.opening_hours} - {hotel.closing_hours}</p>
                </div>
              </div>

              <Button 
                onClick={() => setBookingOpen(true)}
                className="w-full py-7 rounded-2xl text-white font-black uppercase tracking-[0.1em] border-none transition-transform active:scale-95"
                style={{ backgroundColor: COLORS.TEAL, boxShadow: `0 10px 20px -5px ${COLORS.TEAL}66` }}
              >
                Book Now
              </Button>

              <div className="grid grid-cols-3 gap-2 mt-6">
                <UtilityButton icon={<MapPin className="h-4 w-4" />} label="Map" onClick={openInMaps} />
                <UtilityButton icon={<Copy className="h-4 w-4" />} label="Copy" onClick={() => {}} />
                <UtilityButton icon={<Share2 className="h-4 w-4" />} label="Share" onClick={() => {}} />
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inquiries</p>
                {hotel.phone_numbers?.map((p: string, i: number) => (
                  <a key={i} href={`tel:${p}`} className="flex items-center gap-3 text-xs font-bold text-slate-600">
                    <Phone className="h-3.5 w-3.5" style={{ color: COLORS.TEAL }} /> {p}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <ReviewSection itemId={hotel.id} itemType="hotel" />
        </div>
        
        <div className="mt-12">
          <SimilarItems currentItemId={hotel.id} itemType="hotel" country={hotel.country} />
        </div>
      </main>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-[40px] border-none shadow-2xl">
          <MultiStepBooking 
            onSubmit={handleBookingSubmit} facilities={hotel.facilities || []} 
            activities={hotel.activities || []} isProcessing={isProcessing} 
            isCompleted={isCompleted} itemName={hotel.name}
            itemId={hotel.id} bookingType="hotel" hostId={hotel.created_by || ""}
            onPaymentSuccess={() => setIsCompleted(true)}
          />
        </DialogContent>
      </Dialog>
      <MobileBottomBar />
    </div>
  );
};

const UtilityButton = ({ icon, label, onClick }: any) => (
  <Button variant="ghost" onClick={onClick} className="flex-col h-auto py-3 bg-slate-50 rounded-xl hover:bg-slate-100 flex-1 border border-slate-100">
    <div className="mb-1" style={{ color: COLORS.TEAL }}>{icon}</div>
    <span className="text-[9px] font-black uppercase">{label}</span>
  </Button>
);

export default HotelDetail;