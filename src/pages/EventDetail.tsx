import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Share2, ArrowLeft, Heart, Copy, Star, Zap, Calendar, Clock, Ticket
} from "lucide-react";
import { SimilarItems } from "@/components/SimilarItems";
import { useToast } from "@/hooks/use-toast";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { ReviewSection } from "@/components/ReviewSection";
import { useSavedItems } from "@/hooks/useSavedItems";
import { extractIdFromSlug } from "@/lib/slugUtils";
import { useRealtimeItemAvailability } from "@/hooks/useRealtimeBookings";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
  RED: "#FF0000",
  ORANGE: "#FF9800"
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
      const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
      if (error) throw error;
      setEvent(data);
    } catch (error) {
      toast({ title: "Event not found", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const { remainingSlots, isSoldOut } = useRealtimeItemAvailability(id || undefined, event?.available_tickets || 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!event) return null;

  const allImages = [event.image_url, ...(event.gallery_images || []), ...(event.images || [])].filter(Boolean);
  const eventDate = event.date ? new Date(event.date) : null;
  const isPast = eventDate && eventDate < new Date().setHours(0,0,0,0);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 pt-6">
      
      {/* STICKY TOP BAR - Transitions from Gallery Buttons */}
      <div 
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 px-4 py-3 flex justify-between items-center bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100 ${
          scrolled ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate(-1)} className="rounded-full w-10 h-10 p-0 bg-slate-100 text-slate-900 border-none">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-sm font-black uppercase tracking-tighter text-slate-900 truncate max-w-[200px]">
            {event.name}
          </h2>
        </div>
        <Button 
          onClick={() => id && handleSaveItem(id, "event")} 
          className={`rounded-full w-10 h-10 p-0 border-none shadow-md ${isSaved ? "bg-red-500 text-white" : "bg-slate-100 text-slate-900"}`}
        >
          <Heart className={`h-5 w-5 ${isSaved ? "fill-current" : ""}`} />
        </Button>
      </div>

      <main className="container px-4 max-w-6xl mx-auto">
        
        {/* IMAGE GALLERY - Alignment matched to content columns */}
        <div className="relative w-full h-[45vh] md:h-[60vh] bg-slate-900 overflow-hidden rounded-[32px] shadow-xl mb-8">
          
          {/* OVER-IMAGE BUTTONS - Visible only at top */}
          <div className={`absolute top-4 left-4 right-4 z-50 flex justify-between items-center transition-opacity duration-300 ${scrolled ? 'opacity-0' : 'opacity-100'}`}>
            <Button onClick={() => navigate(-1)} className="rounded-full w-10 h-10 p-0 border-none bg-black/40 text-white backdrop-blur-md">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button 
              onClick={() => id && handleSaveItem(id, "event")} 
              className={`rounded-full w-10 h-10 p-0 border-none shadow-lg backdrop-blur-md ${isSaved ? "bg-red-500 text-white" : "bg-black/40 text-white"}`}
            >
              <Heart className={`h-5 w-5 ${isSaved ? "fill-current" : ""}`} />
            </Button>
          </div>

          <Carousel plugins={[Autoplay({ delay: 4000 })]} className="w-full h-full">
            <CarouselContent className="h-full ml-0">
              {allImages.map((img, idx) => (
                <CarouselItem key={idx} className="h-full pl-0 basis-full">
                  <div className="relative h-full w-full">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          {/* NAME OVERLAY WITH GRADIENT FADE */}
          <div className="absolute bottom-0 left-0 z-40 w-full p-6 pb-8">
            <div className="max-w-xl bg-gradient-to-r from-black/70 via-black/30 to-transparent rounded-2xl p-5 backdrop-blur-[2px]">
              <Badge className="bg-[#008080] text-white border-none px-2 py-0.5 text-[9px] font-black uppercase rounded-full mb-2">
                Special Event
              </Badge>
              <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-white leading-tight mb-1">
                {event.name}
              </h1>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-white/80" />
                <span className="text-xs font-bold text-white/90 uppercase tracking-wide">
                   {event.location}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT GRID */}
        <div className="flex flex-col lg:grid lg:grid-cols-[1.7fr,1fr] gap-6">
          <div className="flex flex-col gap-6">
            
            {/* Overview */}
            <section className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <h2 className="text-xl font-black uppercase tracking-tight mb-4 text-[#008080]">About the Event</h2>
              <p className="text-slate-500 text-sm leading-relaxed lowercase">
                {event.description || "no details provided for this event."}
              </p>
            </section>

            {/* Event Specifics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="p-3 bg-teal-50 rounded-xl"><Calendar className="h-5 w-5 text-[#008080]" /></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</p>
                  <p className="text-sm font-black text-slate-700 uppercase">
                    {eventDate ? eventDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'flexible'}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="p-3 bg-orange-50 rounded-xl"><Clock className="h-5 w-5 text-[#FF9800]" /></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</p>
                  <p className="text-sm font-black text-slate-700 uppercase">{event.start_time || '08:00 am'}</p>
                </div>
              </div>
            </div>

            <div className="lg:hidden">
              <EventBookingCard event={event} remainingSlots={remainingSlots} isSoldOut={isSoldOut} isPast={isPast} navigate={navigate} />
            </div>

            <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <ReviewSection itemId={event.id} itemType="event" />
            </div>
          </div>

          {/* Sticky Sidebar */}
          <div className="hidden lg:block lg:sticky lg:top-24 h-fit">
            <EventBookingCard event={event} remainingSlots={remainingSlots} isSoldOut={isSoldOut} isPast={isPast} navigate={navigate} />
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-8 text-slate-800">Other Events You Might Like</h2>
          <SimilarItems currentItemId={event.id} itemType="event" country={event.country} />
        </div>
      </main>
      <MobileBottomBar />
    </div>
  );
};

const EventBookingCard = ({ event, remainingSlots, isSoldOut, isPast, navigate }: any) => {
  const isAvailable = !isSoldOut && !isPast;

  return (
    <div className="bg-white rounded-[32px] p-8 shadow-2xl border border-slate-100">
      <div className="flex justify-between items-end mb-8">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Standard Entry</p>
          <span className="text-4xl font-black text-red-600">
            {event.price === 0 ? "FREE" : `KSh ${event.price}`}
          </span>
        </div>
        <Badge className={`text-[10px] font-black uppercase ${isSoldOut ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
          {isSoldOut ? "sold out" : `${remainingSlots} tickets left`}
        </Badge>
      </div>

      <Button 
        onClick={() => navigate(`/booking/event/${event.id}`)}
        disabled={!isAvailable}
        className="w-full py-8 rounded-2xl text-md font-black uppercase tracking-widest text-white shadow-xl border-none transition-all active:scale-95 mb-6"
        style={{ 
          background: !isAvailable ? "#cbd5e1" : `linear-gradient(135deg, ${COLORS.CORAL_LIGHT} 0%, ${COLORS.CORAL} 100%)` 
        }}
      >
        {isSoldOut ? "SOLD OUT" : isPast ? "EVENT ENDED" : "GET TICKETS"}
      </Button>

      <div className="grid grid-cols-3 gap-3">
        <UtilityBtn icon={<MapPin className="h-5 w-5" />} label="Venue" />
        <UtilityBtn icon={<Copy className="h-5 w-5" />} label="Copy" />
        <UtilityBtn icon={<Share2 className="h-5 w-5" />} label="Share" />
      </div>
      
      <div className="mt-8 pt-6 border-t border-slate-50 space-y-4">
         <div className="flex items-center gap-3 text-slate-500">
            <Ticket className="h-4 w-4 text-[#008080]" />
            <span className="text-[10px] font-black uppercase">Instant digital delivery</span>
         </div>
      </div>
    </div>
  );
};

const UtilityBtn = ({ icon, label }: any) => (
  <Button variant="ghost" className="flex-col h-auto py-3 bg-[#F8F9FA] text-slate-500 rounded-2xl border border-slate-100 flex-1 hover:bg-slate-100">
    <div className="mb-1">{icon}</div>
    <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
  </Button>
);

export default EventDetail;