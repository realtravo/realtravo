import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Share2, Heart, Calendar, Copy, CheckCircle2, ArrowLeft, Star, Phone, Mail, Clock, Users, ShieldCheck, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SimilarItems } from "@/components/SimilarItems";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { ReviewSection } from "@/components/ReviewSection";
import { useSavedItems } from "@/hooks/useSavedItems";
import { generateReferralLink, trackReferralClick } from "@/lib/referralUtils";
import { useBookingSubmit } from "@/hooks/useBookingSubmit";
import { extractIdFromSlug } from "@/lib/slugUtils";
import { useRealtimeItemAvailability } from "@/hooks/useRealtimeBookings";

// Refined Accessible Palette
const COLORS = {
  PRIMARY: "#006666", // Slightly deeper Teal for contrast
  ACCENT: "#FF6B35",  // More vibrant Coral
  BG_SOFT: "#F1F5F9",
  GLASS: "rgba(255, 255, 255, 0.85)"
};

const EventDetail = () => {
  const { slug } = useParams();
  const id = slug ? extractIdFromSlug(slug) : null;
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const { savedItems, handleSave: handleSaveItem } = useSavedItems();
  const isSaved = savedItems.has(id || "");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (id) fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("id", id)
        .eq("type", "event")
        .single();
      if (error) throw error;
      setEvent(data);
    } catch (error) {
      toast({ title: "Event not found", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const { remainingSlots, isSoldOut } = useRealtimeItemAvailability(id || undefined, event?.available_tickets || 0);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-[#008080] border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  );

  if (!event) return null;

  const allImages = [event?.image_url, ...(event?.images || [])].filter(Boolean);

  const BookingCard = () => (
    <div className="bg-white rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 lg:sticky lg:top-28">
      <div className="flex items-center gap-2 mb-6">
        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-none px-3 py-1 rounded-full">
          <ShieldCheck className="w-3 h-3 mr-1" /> Verified Experience
        </Badge>
      </div>

      <div className="space-y-1 mb-6">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Entry Fee</p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-slate-900">KSh {event.price}</span>
          <span className="text-slate-400 font-bold">/person</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <Clock className="w-4 h-4 text-teal-600 mb-2" />
            <p className="text-[10px] font-black text-slate-400 uppercase">Availability</p>
            <p className={`text-sm font-black ${isSoldOut ? 'text-red-500' : 'text-slate-700'}`}>
                {isSoldOut ? "Full" : `${remainingSlots} Spots`}
            </p>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <Calendar className="w-4 h-4 text-orange-500 mb-2" />
            <p className="text-[10px] font-black text-slate-400 uppercase">Date</p>
            <p className="text-sm font-black text-slate-700 truncate">
                {event.is_custom_date ? "Open" : new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </p>
        </div>
      </div>

      <Button 
        onClick={() => navigate(`/booking/event/${event.id}`)}
        disabled={isSoldOut}
        className="w-full h-16 rounded-2xl text-lg font-black uppercase tracking-widest shadow-lg hover:shadow-orange-200 transition-all active:scale-95"
        style={{ background: `linear-gradient(135deg, ${COLORS.ACCENT}, #FF8C42)` }}
      >
        {isSoldOut ? "Sold Out" : "Secure Tickets"}
      </Button>

      <div className="mt-8 pt-6 border-t border-slate-50 grid grid-cols-3 gap-2">
        <UtilityButton icon={<Share2 className="w-4 h-4" />} label="Share" onClick={() => {}} />
        <UtilityButton icon={<Copy className="w-4 h-4" />} label="Link" onClick={() => {}} />
        <UtilityButton icon={<MapPin className="w-4 h-4" />} label="Map" onClick={() => {}} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Smart Navigation */}
      <nav className={`fixed top-0 inset-x-0 z-[100] transition-all duration-500 px-4 py-4 ${
        scrolled ? "bg-white/80 backdrop-blur-xl shadow-md" : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className={`rounded-full w-12 h-12 p-0 transition-all ${scrolled ? "bg-slate-100 text-slate-900" : "bg-black/20 backdrop-blur-md text-white hover:bg-white/40"}`}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>

          {scrolled && (
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter animate-in fade-in slide-in-from-top-2">
              {event.name}
            </h2>
          )}

          <Button 
            onClick={() => handleSaveItem(event.id, 'event')}
            className={`rounded-full w-12 h-12 p-0 shadow-xl transition-all active:scale-75 ${
              isSaved ? "bg-red-500 text-white" : scrolled ? "bg-slate-100 text-slate-900" : "bg-black/20 backdrop-blur-md text-white"
            }`}
          >
            <Heart className={`h-6 w-6 ${isSaved ? "fill-current" : ""}`} />
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative h-[65vh] md:h-[75vh] w-full overflow-hidden bg-slate-900">
        <Carousel plugins={[Autoplay({ delay: 5000 })]} className="w-full h-full">
          <CarouselContent className="h-full ml-0">
            {allImages.map((img, idx) => (
              <CarouselItem key={idx} className="pl-0 basis-full h-full">
                <div className="relative h-full w-full">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/20 to-transparent" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Hero Content Overlay */}
        <div className="absolute bottom-16 left-0 w-full px-4 z-20">
          <div className="max-w-7xl mx-auto">
            <div className="inline-block p-6 rounded-[32px] bg-white/10 backdrop-blur-xl border border-white/20 text-white max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Badge className="mb-4 bg-orange-500/20 text-orange-200 border-orange-500/30 backdrop-blur-md px-4 py-1">
                Featured Event • {event.location}
              </Badge>
              <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tighter leading-tight uppercase">
                {event.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-widest opacity-90">
                <span className="flex items-center gap-2 bg-black/30 px-4 py-2 rounded-full">
                  <MapPin className="w-4 h-4 text-teal-400" /> {event.place}
                </span>
                <span className="flex items-center gap-2 bg-black/30 px-4 py-2 rounded-full">
                  <Star className="w-4 h-4 text-orange-400 fill-orange-400" /> 4.8 Rating
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Bento Grid */}
      <main className="max-w-7xl mx-auto px-4 -mt-10 relative z-30">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            {/* Description Tile */}
            <section className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-6 flex items-center gap-3">
                <div className="w-2 h-8 bg-teal-600 rounded-full" />
                The Experience
              </h2>
              <p className="text-slate-500 leading-relaxed text-base whitespace-pre-line">
                {event.description}
              </p>
            </section>

            {/* Highlights Tile */}
            {event.activities?.length > 0 && (
              <section className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-6">Event Highlights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {event.activities.map((act: any, i: number) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-teal-200 transition-all">
                      <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <Zap className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-black text-slate-700 uppercase text-xs">{act.name}</p>
                        <p className="text-[10px] text-teal-600 font-bold uppercase tracking-widest">Included</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Mobile Booking Trigger */}
            <div className="lg:hidden">
              <BookingCard />
            </div>

            {/* Reviews Tile */}
            <section className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
              <ReviewSection itemId={event.id} itemType="event" />
            </section>
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <BookingCard />
            
            {/* Quick Contact Card */}
            <div className="mt-6 bg-slate-900 rounded-[32px] p-8 text-white">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-teal-400 mb-6">Need Assistance?</h4>
                <div className="space-y-4">
                    <a href={`tel:${event.phone_number}`} className="flex items-center gap-4 hover:translate-x-2 transition-transform">
                        <div className="p-3 bg-white/10 rounded-xl"><Phone className="w-5 h-5" /></div>
                        <span className="text-sm font-bold">{event.phone_number || "Contact Host"}</span>
                    </a>
                    <a href={`mailto:${event.email}`} className="flex items-center gap-4 hover:translate-x-2 transition-transform">
                        <div className="p-3 bg-white/10 rounded-xl"><Mail className="w-5 h-5" /></div>
                        <span className="text-sm font-bold truncate">{event.email || "Email us"}</span>
                    </a>
                </div>
            </div>
          </div>

        </div>

        {/* Similar Events Section */}
        <section className="mt-20">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Explore More</h2>
              <p className="text-slate-500 font-medium">Events happening nearby in {event.location}</p>
            </div>
          </div>
          <SimilarItems currentItemId={event.id} itemType="trip" location={event.location} country={event.country} />
        </section>
      </main>

      <MobileBottomBar />
    </div>
  );
};

const UtilityButton = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-teal-50 hover:text-teal-700 transition-all border border-transparent hover:border-teal-100 group"
  >
    <div className="text-slate-400 group-hover:text-teal-600 transition-colors">
      {icon}
    </div>
    <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

export default EventDetail;