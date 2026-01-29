import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Header } from "@/components/Header"; // Added Header
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Share2, Mail, Clock, ArrowLeft, Heart, Copy, Star, Zap, Calendar, Users } from "lucide-react";
import { SimilarItems } from "@/components/SimilarItems";
import { useToast } from "@/hooks/use-toast";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { ReviewSection } from "@/components/ReviewSection";
import { useSavedItems } from "@/hooks/useSavedItems";
import { useAuth } from "@/contexts/AuthContext";
import { BookingFormData } from "@/components/booking/MultiStepBooking";
import { generateReferralLink, trackReferralClick } from "@/lib/referralUtils";
import { useBookingSubmit } from "@/hooks/useBookingSubmit";
import { extractIdFromSlug } from "@/lib/slugUtils";
import { useRealtimeItemAvailability } from "@/hooks/useRealtimeBookings";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
  KHAKI: "#F0E68C",
  KHAKI_DARK: "#857F3E",
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
  const [scrolled, setScrolled] = useState(false);

  const { savedItems, handleSave: handleSaveItem } = useSavedItems();
  const isSaved = savedItems.has(id || "");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const handleSave = () => id && handleSaveItem(id, "trip");
  
  const handleCopyLink = async () => {
    const refLink = await generateReferralLink(trip.id, "trip", trip.id);
    await navigator.clipboard.writeText(refLink);
    toast({ title: "Link Copied!" });
  };

  const handleShare = async () => {
    const refLink = await generateReferralLink(trip.id, "trip", trip.id);
    if (navigator.share) {
      try { await navigator.share({ title: trip.name, url: refLink }); } catch (e) {}
    } else { handleCopyLink(); }
  };

  const openInMaps = () => {
    const query = encodeURIComponent(`${trip?.name}, ${trip?.location}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  const { remainingSlots, isSoldOut } = useRealtimeItemAvailability(id || undefined, trip?.available_tickets || 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="w-10 h-10 border-4 border-[#008080] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-black uppercase tracking-tighter animate-pulse">Loading Details...</p>
      </div>
    );
  }
  if (!trip) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tripDate = trip.date ? new Date(trip.date) : null;
  const isExpired = !trip.is_custom_date && tripDate && tripDate < today;
  const allImages = [trip.image_url, ...(trip.gallery_images || []), ...(trip.images || [])].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      {/* 1. HEADER */}
      <Header showSearchIcon={false} />

      {/* 2. SCROLL NAVIGATION (Sticky Header) */}
      <div className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 px-4 py-3 flex justify-between items-center bg-white shadow-sm border-b ${scrolled ? "translate-y-0" : "-translate-y-full"}`}>
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate(-1)} variant="ghost" className="rounded-full p-2"><ArrowLeft /></Button>
          <h2 className="text-sm font-black uppercase truncate max-w-[200px]">{trip.name}</h2>
        </div>
        <Button onClick={handleSave} variant="ghost" className="rounded-full p-2">
          <Heart className={`h-5 w-5 ${isSaved ? "fill-red-500 text-red-500" : "text-slate-900"}`} />
        </Button>
      </div>

      <main className="container px-4 max-w-6xl mx-auto pt-6">
        {/* 3. IMAGES SECTION (New Structure) */}
        <div className="relative w-full h-[45vh] md:h-[60vh] overflow-hidden rounded-[32px] mb-8">
          <Carousel plugins={[Autoplay({ delay: 4000 })]} className="w-full h-full">
            <CarouselContent className="h-full ml-0">
              {allImages.map((img, idx) => (
                <CarouselItem key={idx} className="h-full pl-0 basis-full">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/80 to-transparent">
            <h1 className="text-2xl md:text-4xl font-black text-white uppercase">{trip.name}</h1>
            <div className="flex items-center gap-2 mt-2" onClick={openInMaps}>
              <MapPin className="h-4 w-4 text-white" />
              <span className="text-xs font-bold text-white uppercase">
                {[trip.place, trip.location, trip.country].filter(Boolean).join(', ')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-[1.7fr,1fr] gap-6">
          <div className="flex flex-col gap-6">
            {/* Overview */}
            <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <h2 className="text-xl font-black uppercase tracking-tight mb-4" style={{ color: COLORS.TEAL }}>Overview</h2>
              <p className="text-slate-500 text-sm leading-relaxed whitespace-pre-line">{trip.description || "No description provided."}</p>
            </div>

            {/* Operating Hours (Conditional) */}
            {trip.is_custom_date && (trip.opening_hours || trip.days_opened?.length > 0) && (
              <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-teal-50"><Clock className="h-5 w-5 text-[#008080]" /></div>
                  <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: COLORS.TEAL }}>Operating Hours</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-slate-400">Working Hours</span>
                    <span className="text-sm font-black text-slate-700">{trip.opening_hours || "08:00"} - {trip.closing_hours || "18:00"}</span>
                  </div>
                  {trip.days_opened?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {trip.days_opened.map((day: string, i: number) => (
                        <span key={i} className="px-4 py-2 rounded-xl bg-teal-50 text-[10px] font-black uppercase text-[#008080] border border-teal-100">{day}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="block lg:hidden">
              <BookingCard 
                trip={trip} 
                remainingSlots={remainingSlots} 
                isSoldOut={isSoldOut} 
                isExpired={isExpired} 
                navigate={navigate} 
                openInMaps={openInMaps}
                handleCopyLink={handleCopyLink}
                handleShare={handleShare}
              />
            </div>

            {/* Activities (Conditional) */}
            {trip.activities?.length > 0 && (
              <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-orange-50"><Zap className="h-5 w-5 text-[#FF9800]" /></div>
                  <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: COLORS.ORANGE }}>Included Activities</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  {trip.activities.map((act: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-orange-50/50 border border-orange-100/50">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FF9800]" />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-700 uppercase">{act.name}</span>
                        <span className="text-[10px] font-bold text-[#FF9800]">{act.price === 0 ? "Included" : `KSh ${act.price}`}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <ReviewSection itemId={trip.id} itemType="trip" />
            </div>
          </div>

          {/* Sidebar Booking Card */}
          <div className="hidden lg:block lg:sticky lg:top-24 h-fit">
            <BookingCard 
              trip={trip} 
              remainingSlots={remainingSlots} 
              isSoldOut={isSoldOut} 
              isExpired={isExpired} 
              navigate={navigate} 
              openInMaps={openInMaps}
              handleCopyLink={handleCopyLink}
              handleShare={handleShare}
            />
          </div>
        </div>

        <div className="mt-12 lg:mt-16">
          <SimilarItems currentItemId={trip.id} itemType="trip" country={trip.country} />
        </div>
      </main>

      <MobileBottomBar />
    </div>
  );
};

const BookingCard = ({ trip, remainingSlots, isSoldOut, isExpired, navigate, openInMaps, handleCopyLink, handleShare }: any) => (
  <div className="bg-white rounded-[32px] p-8 shadow-2xl border border-slate-100">
    <div className="flex justify-between items-end mb-8">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ticket Price</p>
        <span className="text-4xl font-black text-red-600">KSh {trip.price}</span>
      </div>
      <Badge className={`text-[10px] font-black uppercase ${isSoldOut ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
        {isSoldOut ? "full" : `${remainingSlots} spots left`}
      </Badge>
    </div>

    <div className="space-y-4 mb-6">
      <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <Phone className="h-5 w-5 text-[#008080]" />
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase">Phone Number</p>
          <p className="text-xs font-bold text-slate-700">{trip.phone_number || "Not Provided"}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <Mail className="h-5 w-5 text-[#FF7F50]" />
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase">Email Address</p>
          <p className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{trip.email || "Not Provided"}</p>
        </div>
      </div>
    </div>

    <Button 
      onClick={() => navigate(`/booking/trip/${trip.id}`)}
      disabled={isSoldOut || isExpired}
      className="w-full py-8 rounded-2xl text-md font-black uppercase text-white shadow-xl"
      style={{ background: (isSoldOut || isExpired) ? "#cbd5e1" : `linear-gradient(135deg, ${COLORS.CORAL_LIGHT} 0%, ${COLORS.CORAL} 100%)` }}
    >
      {isSoldOut ? "SOLD OUT" : isExpired ? "EXPIRED" : "BOOK SPOT"}
    </Button>
    
    <div className="grid grid-cols-3 gap-3 mt-6">
      <UtilityBtn icon={<MapPin className="h-5 w-5" />} label="Map" onClick={openInMaps} />
      <UtilityBtn icon={<Copy className="h-5 w-5" />} label="Copy" onClick={handleCopyLink} />
      <UtilityBtn icon={<Share2 className="h-5 w-5" />} label="Share" onClick={handleShare} />
    </div>
  </div>
);

const UtilityBtn = ({ icon, label, onClick }: any) => (
  <Button variant="ghost" onClick={onClick} className="flex-col h-auto py-3 bg-[#F8F9FA] text-slate-500 rounded-2xl border border-slate-100 flex-1 hover:bg-slate-100">
    <div className="mb-1">{icon}</div>
    <span className="text-[10px] font-black uppercase">{label}</span>
  </Button>
);

export default TripDetail;