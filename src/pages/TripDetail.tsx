import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Phone, Share2, Clock, ArrowLeft, 
  Heart, Copy, Star, Zap, Calendar, Users, ShieldCheck 
} from "lucide-react";
import { SimilarItems } from "@/components/SimilarItems";
import { useToast } from "@/hooks/use-toast";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { ReviewSection } from "@/components/ReviewSection";
import { useSavedItems } from "@/hooks/useSavedItems";
import { useBookingSubmit } from "@/hooks/useBookingSubmit";
import { extractIdFromSlug } from "@/lib/slugUtils";
import { useRealtimeItemAvailability } from "@/hooks/useRealtimeBookings";
import { generateReferralLink, trackReferralClick } from "@/lib/referralUtils";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
  RED: "#FF0000",
  ORANGE: "#FF9800",
  SOFT_GRAY: "#F8F9FA"
};

const TripDetail = () => {
  const { slug } = useParams();
  const id = slug ? extractIdFromSlug(slug) : null;
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [trip, setTrip] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const { savedItems, handleSave: handleSaveItem } = useSavedItems();
  const isSaved = savedItems.has(id || "");

  useEffect(() => {
    window.scrollTo(0, 0);
    if (id) fetchTrip();
    const urlParams = new URLSearchParams(window.location.search);
    const refSlug = urlParams.get("ref");
    if (refSlug && id) trackReferralClick(refSlug, id, "trip", "booking");
  }, [id]);

  const fetchTrip = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      setTrip(data);
    } catch (error) {
      toast({ title: "Trip not found", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const openInMaps = () => {
    const query = encodeURIComponent(`${trip?.name}, ${trip?.location}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  const handleCopyLink = async () => {
    const refLink = await generateReferralLink(trip.id, "trip", trip.id);
    await navigator.clipboard.writeText(refLink);
    toast({ title: "Link Copied!" });
  };

  const { remainingSlots, isSoldOut } = useRealtimeItemAvailability(id || undefined, trip?.available_tickets || 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="w-10 h-10 border-4 border-[#008080] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-black uppercase tracking-tighter animate-pulse">Loading Trip...</p>
      </div>
    );
  }
  if (!trip) return null;

  const allImages = [trip.image_url, ...(trip.gallery_images || []), ...(trip.images || [])].filter(Boolean);
  const isExpired = !trip.is_custom_date && trip.date && new Date(trip.date) < new Date().setHours(0,0,0,0);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 pt-6">
      <main className="container px-4 max-w-6xl mx-auto">
        
        {/* IMAGE GALLERY - Restricted to Body Width */}
        <div className="relative w-full h-[45vh] md:h-[60vh] bg-slate-900 overflow-hidden rounded-[32px] shadow-xl mb-8">
          {/* Top Actions Over Image Corners */}
          <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-center">
            <Button 
              onClick={() => navigate(-1)} 
              className="rounded-full w-10 h-10 p-0 border-none bg-black/30 text-white backdrop-blur-md hover:bg-black/50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button 
              onClick={() => id && handleSaveItem(id, "trip")} 
              className={`rounded-full w-10 h-10 p-0 border-none shadow-lg backdrop-blur-md ${
                isSaved ? "bg-red-500" : "bg-black/30 text-white hover:bg-black/50"
              }`}
            >
              <Heart className={`h-5 w-5 ${isSaved ? "fill-white text-white" : "text-white"}`} />
            </Button>
          </div>

          <Carousel plugins={[Autoplay({ delay: 4000 })]} className="w-full h-full">
            <CarouselContent className="h-full ml-0">
              {allImages.map((img, idx) => (
                <CarouselItem key={idx} className="h-full pl-0 basis-full">
                  <div className="relative h-full w-full">
                    <img src={img} alt={trip.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          <div className="absolute bottom-6 left-6 z-40">
            <Badge className="bg-[#FF7F50] text-white border-none px-2 py-0.5 text-[9px] font-black uppercase rounded-full mb-2">
              Scheduled Trip
            </Badge>
            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-white leading-tight">
              {trip.name}
            </h1>
          </div>
        </div>

        {/* CONTENT GRID */}
        <div className="flex flex-col lg:grid lg:grid-cols-[1.7fr,1fr] gap-6">
          <div className="flex flex-col gap-6">
            
            {/* Overview Section */}
            <section className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <h2 className="text-xl font-black uppercase tracking-tight mb-4 text-[#008080]">Overview</h2>
              <p className="text-slate-500 text-sm leading-relaxed lowercase">
                {trip.description || "no description provided."}
              </p>
            </section>

            {/* Activities Section */}
            <section className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <Zap className="h-5 w-5 text-[#FF9800]" />
                <h2 className="text-xl font-black uppercase tracking-tight text-[#FF9800]">Included Activities</h2>
              </div>
              {trip.activities?.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {trip.activities.map((act: any, i: number) => (
                    <div key={i} className="px-5 py-3 rounded-2xl bg-orange-50/50 border border-orange-100 flex items-center gap-3">
                      <span className="text-[11px] font-medium text-slate-700 lowercase">{act.name}</span>
                      <span className="text-[10px] font-bold text-[#FF9800]">
                        {act.price === 0 ? "included" : `ksh ${act.price}`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm italic">none</p>
              )}
            </section>

            <div className="lg:hidden">
              <BookingPriceCard trip={trip} remainingSlots={remainingSlots} isSoldOut={isSoldOut} isExpired={isExpired} openInMaps={openInMaps} handleCopyLink={handleCopyLink} navigate={navigate} />
            </div>

            <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <ReviewSection itemId={trip.id} itemType="trip" />
            </div>
          </div>

          {/* Sticky Sidebar */}
          <div className="hidden lg:block lg:sticky lg:top-6 h-fit">
            <BookingPriceCard trip={trip} remainingSlots={remainingSlots} isSoldOut={isSoldOut} isExpired={isExpired} openInMaps={openInMaps} handleCopyLink={handleCopyLink} navigate={navigate} />
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-8 text-slate-800">Explore Similar Adventures</h2>
          <SimilarItems currentItemId={trip.id} itemType="trip" country={trip.country} />
        </div>
      </main>
      <MobileBottomBar />
    </div>
  );
};

const BookingPriceCard = ({ trip, remainingSlots, isSoldOut, isExpired, openInMaps, handleCopyLink, navigate }: any) => {
  const canBook = !isExpired && !isSoldOut;

  return (
    <div className="bg-white rounded-[32px] p-8 shadow-2xl border border-slate-100">
      <div className="flex justify-between items-end mb-8">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ticket Price</p>
          <span className="text-4xl font-black text-red-600">KSh {trip.price}</span>
        </div>
        <div className="text-right">
          <Badge className={`text-[10px] font-black uppercase ${isSoldOut ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
            {isSoldOut ? "full" : `${remainingSlots} spots left`}
          </Badge>
        </div>
      </div>

      <div className="space-y-3 mb-6 bg-slate-50 p-5 rounded-2xl border border-dashed border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-tight">Date</span>
          <span className="text-[10px] font-black uppercase text-slate-700">
            {trip.is_custom_date ? "flexible" : new Date(trip.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-tight">Child Rate</span>
          <span className="text-[10px] font-black uppercase text-slate-700">KSh {trip.price_child || 'n/a'}</span>
        </div>
      </div>

      <Button 
        onClick={() => navigate(`/booking/trip/${trip.id}`)}
        disabled={!canBook}
        className="w-full py-8 rounded-2xl text-md font-black uppercase tracking-widest text-white shadow-xl border-none mb-6 transition-all active:scale-95" 
        style={{ 
          background: !canBook ? "#cbd5e1" : `linear-gradient(135deg, ${COLORS.CORAL_LIGHT} 0%, ${COLORS.CORAL} 100%)` 
        }}
      >
        {isSoldOut ? "SOLD OUT" : isExpired ? "EXPIRED" : "BOOK SPOT"}
      </Button>

      <div className="grid grid-cols-3 gap-3">
        <UtilityButton icon={<MapPin className="h-5 w-5" />} label="Map" onClick={openInMaps} />
        <UtilityButton icon={<Copy className="h-5 w-5" />} label="Copy" onClick={handleCopyLink} />
        <UtilityButton icon={<Share2 className="h-5 w-5" />} label="Share" onClick={() => {}} />
      </div>
    </div>
  );
};

const UtilityButton = ({ icon, label, onClick }: any) => (
  <Button variant="ghost" onClick={onClick} className="flex-col h-auto py-3 bg-[#F8F9FA] text-slate-500 rounded-2xl border border-slate-100 flex-1 hover:bg-slate-100 transition-colors">
    <div className="mb-1">{icon}</div>
    <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
  </Button>
);

export default TripDetail;