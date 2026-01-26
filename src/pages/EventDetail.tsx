import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Share2, Heart, Copy, ArrowLeft, Star, Phone, Mail, Users, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SimilarItems } from "@/components/SimilarItems";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { ReviewSection } from "@/components/ReviewSection";
import { useSavedItems } from "@/hooks/useSavedItems";
import { generateReferralLink, trackReferralClick } from "@/lib/referralUtils";
import { extractIdFromSlug } from "@/lib/slugUtils";
import { useRealtimeItemAvailability } from "@/hooks/useRealtimeBookings";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
  KHAKI: "#F0E68C",
  KHAKI_DARK: "#857F3E",
  RED: "#FF0000",
  SOFT_GRAY: "#F8F9FA"
};

const EventDetail = () => {
  const { slug } = useParams();
  const id = slug ? extractIdFromSlug(slug) : null;
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { savedItems, handleSave: handleSaveItem } = useSavedItems();
  const isSaved = savedItems.has(id || "");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (id) fetchEvent();
    const urlParams = new URLSearchParams(window.location.search);
    const refSlug = urlParams.get("ref");
    if (refSlug && id) trackReferralClick(refSlug, id, "event", "booking");
  }, [id]);

  const fetchEvent = async () => {
    if (!id) return;
    try {
      let { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("id", id)
        .eq("type", "event")
        .single();
      
      if (error && id.length === 8) {
        const { data: prefixData, error: prefixError } = await supabase
          .from("trips")
          .select("*")
          .ilike("id", `${id}%`)
          .eq("type", "event")
          .single();
        if (!prefixError) { data = prefixData; error = null; }
      }
      if (error) throw error;
      setEvent(data);
    } catch (error) {
      toast({ title: "Event not found", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleSave = () => id && handleSaveItem(id, "event");
  
  const handleCopyLink = async () => {
    if (!event) return;
    const refLink = await generateReferralLink(event.id, "event", event.id);
    await navigator.clipboard.writeText(refLink);
    toast({ title: "Link Copied!" });
  };

  const handleShare = async () => {
    if (!event) return;
    const refLink = await generateReferralLink(event.id, "event", event.id);
    if (navigator.share) {
      try { await navigator.share({ title: event.name, url: refLink }); } catch (e) {}
    } else { handleCopyLink(); }
  };

  const openInMaps = () => {
    const query = encodeURIComponent(`${event?.name}, ${event?.location}`);
    window.open(event?.map_link || `https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  const { remainingSlots, isSoldOut } = useRealtimeItemAvailability(id || undefined, event?.available_tickets || 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="w-10 h-10 border-4 border-[#008080] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-black uppercase tracking-tighter animate-pulse">Loading...</p>
      </div>
    );
  }
  if (!event) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = event.date ? new Date(event.date) : null;
  const isExpired = !event.is_custom_date && eventDate && eventDate < today;
  const canBook = !isExpired && !isSoldOut;
  const allImages = [event?.image_url, ...(event?.gallery_images || []), ...(event?.images || [])].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header showSearchIcon={false} />
      
      {/* SCROLL FIXED BAR */}
      <div 
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 px-4 py-3 flex justify-between items-center bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100 ${
          scrolled ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate(-1)} className="rounded-full w-10 h-10 p-0 bg-slate-100 text-slate-900 border-none shadow-sm hover:bg-slate-200">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-sm font-black uppercase tracking-tighter text-slate-900 truncate max-w-[200px]">
            {event.name}
          </h2>
        </div>
        <Button 
          onClick={handleSave} 
          className={`rounded-full w-10 h-10 p-0 border-none shadow-md transition-colors ${isSaved ? "bg-red-500 text-white" : "bg-slate-100 text-slate-900"}`}
        >
          <Heart className={`h-5 w-5 ${isSaved ? "fill-current" : ""}`} />
        </Button>
      </div>

      <main className="container px-4 max-w-6xl mx-auto pt-6">
        
        {/* IMAGE GALLERY */}
        <div className="relative w-full h-[45vh] md:h-[60vh] bg-slate-900 overflow-hidden rounded-[32px] shadow-xl mb-8 group">
          <div className={`absolute top-4 left-4 right-4 z-50 flex justify-between items-center transition-opacity duration-300 ${scrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <Button onClick={() => navigate(-1)} className="rounded-full w-10 h-10 p-0 border-none bg-black/40 text-white backdrop-blur-md hover:bg-black/60">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button 
              onClick={handleSave} 
              className={`rounded-full w-10 h-10 p-0 border-none shadow-lg backdrop-blur-md transition-all ${isSaved ? "bg-red-500 text-white" : "bg-black/40 text-white hover:bg-black/60"}`}
            >
              <Heart className={`h-5 w-5 ${isSaved ? "fill-current" : ""}`} />
            </Button>
          </div>

          <Carousel plugins={[Autoplay({ delay: 4000 })]} className="w-full h-full">
            <CarouselContent className="h-full ml-0">
              {allImages.map((img, idx) => (
                <CarouselItem key={idx} className="h-full pl-0 basis-full">
                  <div className="relative h-full w-full">
                    <img src={img} alt={event.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          <div className="absolute bottom-0 left-0 z-40 w-full p-6 pb-8">
            <div className="max-w-xl bg-gradient-to-r from-black/70 via-black/40 to-transparent rounded-2xl p-5 backdrop-blur-[2px]">
              <div className="flex gap-2 mb-2">
                <Badge className="bg-[#FF7F50] text-white border-none px-2 py-0.5 text-[9px] font-black uppercase rounded-full tracking-widest">
                  Experience
                </Badge>
                {event.average_rating > 0 && (
                   <Badge className="bg-amber-400 text-black border-none px-2 py-0.5 text-[9px] font-black uppercase rounded-full">
                      <Star className="h-3 w-3 fill-current mr-1" /> {event.average_rating.toFixed(1)}
                   </Badge>
                )}
              </div>
              <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-white leading-tight mb-2">
                {event.name}
              </h1>
              <div 
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity w-fit" 
                onClick={openInMaps}
              >
                <MapPin className="h-4 w-4 text-white/90" />
                <span className="text-xs font-bold text-white/90 uppercase tracking-wide">
                   {[event.location, event.place, event.country].filter(Boolean).join(', ')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT GRID */}
        <div className="grid lg:grid-cols-[1.7fr,1fr] gap-6">
          
          {/* Left Column */}
          <div className="space-y-6">
            <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <h2 className="text-xl font-black uppercase tracking-tight mb-4" style={{ color: COLORS.TEAL }}>About this Event</h2>
              <p className="text-slate-500 text-sm leading-relaxed whitespace-pre-line">
                {event.description || "No description available."}
              </p>
            </div>

            {/* Schedule and Highlights sections have been removed from here */}

            <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black uppercase tracking-tight text-[#008080]">Reviews</h2>
                  {event.average_rating > 0 && (
                    <Badge className="bg-teal-50 text-[#008080] border border-teal-100 px-3 py-1 text-xs font-black">
                      {event.average_rating.toFixed(1)} / 5.0
                    </Badge>
                  )}
               </div>
              <ReviewSection itemId={event.id} itemType="event" />
            </div>
          </div>

          {/* Right Column (Booking Card) */}
          <div className="space-y-6">
            <div className="bg-white rounded-[32px] p-8 shadow-2xl border border-slate-100 lg:sticky lg:top-24">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ticket Price</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black" style={{ color: COLORS.RED }}>KSh {event.price}</span>
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">/ adult</span>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-2xl border flex items-center gap-2 ${isSoldOut ? "bg-red-50 border-red-100 text-red-600" : "bg-emerald-50 border-emerald-100 text-emerald-600"}`}>
                  <span className="text-xs font-black uppercase">
                    {isSoldOut ? "Full" : `${remainingSlots} Left`}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Availability</span>
                  <span className="text-[10px] font-bold text-slate-500">{Math.floor((remainingSlots / (event.available_tickets || 50)) * 100)}% Open</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                   <div 
                    className={`h-full transition-all duration-500 ${remainingSlots < 5 ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min((remainingSlots / (event.available_tickets || 50)) * 100, 100)}%` }}
                   />
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <CalendarDays className="h-5 w-5 text-[#008080]" />
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Date</p>
                        <p className={`text-xs font-bold ${isExpired ? "text-red-500" : "text-slate-700"}`}>
                            {event.is_custom_date ? "Open Schedule" : new Date(event.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                <div className="flex justify-between text-xs font-bold uppercase tracking-tight px-2">
                  <span className="text-slate-400">Child Price (Under 12)</span>
                  <span className="text-slate-700">KSh {event.price_child || 0}</span>
                </div>
              </div>

              <Button 
                onClick={() => navigate(`/booking/event/${event.id}`)}
                disabled={!canBook}
                className="w-full py-8 rounded-2xl text-md font-black uppercase tracking-[0.2em] text-white shadow-xl transition-all active:scale-95 border-none mb-6 hover:brightness-110"
                style={{ 
                    background: !canBook 
                        ? "#cbd5e1" 
                        : `linear-gradient(135deg, ${COLORS.CORAL_LIGHT} 0%, ${COLORS.CORAL} 100%)`
                }}
              >
                {isSoldOut ? "Fully Booked" : isExpired ? "Event Expired" : "Reserve Spot"}
              </Button>

              <div className="grid grid-cols-3 gap-3">
                <UtilityButton icon={<MapPin className="h-5 w-5" />} label="Map" onClick={openInMaps} />
                <UtilityButton icon={<Copy className="h-5 w-5" />} label="Copy" onClick={handleCopyLink} />
                <UtilityButton icon={<Share2 className="h-5 w-5" />} label="Share" onClick={handleShare} />
              </div>

              <div className="space-y-4 pt-6 mt-6 border-t border-slate-100">
                {event.phone_number && (
                  <a href={`tel:${event.phone_number}`} className="flex items-center gap-3 text-slate-500 hover:text-[#008080] transition-colors p-2 hover:bg-slate-50 rounded-lg">
                    <Phone className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-tight">{event.phone_number}</span>
                  </a>
                )}
                {event.email && (
                  <a href={`mailto:${event.email}`} className="flex items-center gap-3 text-slate-500 hover:text-[#008080] transition-colors p-2 hover:bg-slate-50 rounded-lg">
                    <Mail className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-tight truncate">{event.email}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16">
           <SimilarItems currentItemId={event.id} itemType="trip" location={event.location} country={event.country} />
        </div>
      </main>

      <MobileBottomBar />
    </div>
  );
};

const UtilityButton = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <Button variant="ghost" onClick={onClick} className="flex-col h-auto py-3 bg-[#F8F9FA] text-slate-500 rounded-2xl border border-slate-100 flex-1 hover:bg-slate-100 transition-colors">
    <div className="mb-1">{icon}</div>
    <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
  </Button>
);

export default EventDetail;