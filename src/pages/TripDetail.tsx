import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Share2, Mail, Clock, ArrowLeft, Heart, Copy, Star, Zap, Calendar, Users, Info, ShieldCheck } from "lucide-react";
import { SimilarItems } from "@/components/SimilarItems";
import { useToast } from "@/hooks/use-toast";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { ReviewSection } from "@/components/ReviewSection";
import { useSavedItems } from "@/hooks/useSavedItems";
import { useAuth } from "@/contexts/AuthContext";
import { generateReferralLink, trackReferralClick } from "@/lib/referralUtils";
import { useBookingSubmit } from "@/hooks/useBookingSubmit";
import { extractIdFromSlug } from "@/lib/slugUtils";
import { useRealtimeItemAvailability } from "@/hooks/useRealtimeBookings";

// Refined Color Palette for better Accessibility
const COLORS = {
  PRIMARY: "#006666", // Slightly darker Teal for WCAG contrast
  ACCENT: "#FF6B35",  // More vibrant Coral
  SOFT_BG: "#F1F5F9",
  GLASS: "rgba(255, 255, 255, 0.85)",
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
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (id) fetchTrip();
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

  const { remainingSlots, isSoldOut } = useRealtimeItemAvailability(id || undefined, trip?.available_tickets || 0);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-[#008080] border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  );

  if (!trip) return null;

  const allImages = [trip.image_url, ...(trip.gallery_images || []), ...(trip.images || [])].filter(Boolean);

  const BookingCard = () => (
    <div className="bg-white rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 lg:sticky lg:top-28">
      <div className="flex items-center gap-2 mb-6">
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-3 py-1 rounded-full">
          <ShieldCheck className="w-3 h-3 mr-1" /> Verified Organizer
        </Badge>
      </div>

      <div className="space-y-1 mb-6">
        <p className="text-sm font-medium text-slate-500">Starting from</p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-slate-900">KSh {trip.price}</span>
          <span className="text-slate-400 font-semibold">/person</span>
        </div>
      </div>

      <div className="bg-slate-50 rounded-2xl p-4 mb-6 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-slate-600 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Date
          </span>
          <span className="text-sm font-black text-slate-900">
             {trip.is_custom_date ? "Flexible" : new Date(trip.date).toLocaleDateString()}
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Availability</span>
            <span className={remainingSlots < 5 ? "text-red-500" : "text-emerald-600"}>
              {isSoldOut ? "Sold Out" : `${remainingSlots} spots left`}
            </span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ${remainingSlots < 5 ? 'bg-red-500' : 'bg-teal-600'}`}
              style={{ width: `${(remainingSlots / (trip.available_tickets || 20)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <Button 
        onClick={() => navigate(`/booking/trip/${trip.id}`)}
        disabled={isSoldOut}
        className="w-full h-16 rounded-2xl text-lg font-bold shadow-lg shadow-orange-200 hover:shadow-orange-300 transition-all hover:-translate-y-0.5 active:translate-y-0"
        style={{ background: `linear-gradient(135deg, ${COLORS.ACCENT}, #FF8C42)` }}
      >
        {isSoldOut ? "Join Waitlist" : "Reserve Your Spot"}
      </Button>

      <p className="text-center text-xs text-slate-400 mt-4 font-medium">No hidden fees • Instant Confirmation</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Dynamic Navigation Bar */}
      <nav className={`fixed top-0 inset-x-0 z-[100] transition-all duration-500 px-4 py-4 ${
        scrolled ? "bg-white/80 backdrop-blur-xl shadow-md" : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className={`rounded-full w-12 h-12 p-0 ${scrolled ? "bg-slate-100" : "bg-white/20 backdrop-blur-md text-white hover:bg-white/40"}`}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>

          {scrolled && (
            <h2 className="text-sm font-bold text-slate-800 animate-in fade-in slide-in-from-top-2">
              {trip.name}
            </h2>
          )}

          <div className="flex gap-2">
            <Button 
              variant="ghost"
              onClick={() => handleSaveItem(trip.id, 'trip')}
              className={`rounded-full w-12 h-12 p-0 transition-transform active:scale-90 ${
                isSaved ? "bg-red-50 text-red-500" : scrolled ? "bg-slate-100" : "bg-white/20 backdrop-blur-md text-white"
              }`}
            >
              <Heart className={`h-6 w-6 ${isSaved ? "fill-current" : ""}`} />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[75vh] w-full overflow-hidden">
        <Carousel plugins={[Autoplay({ delay: 5000 })]} className="w-full h-full">
          <CarouselContent className="h-[75vh] ml-0">
            {allImages.map((img, idx) => (
              <CarouselItem key={idx} className="pl-0 basis-full h-full">
                <img src={img} alt="" className="w-full h-full object-cover" />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
        
        {/* Floating Info Glass Card */}
        <div className="absolute bottom-12 left-0 w-full px-4">
          <div className="max-w-7xl mx-auto">
            <div className="inline-block px-4 py-6 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 text-white max-w-2xl">
              <Badge className="mb-4 bg-teal-500/20 text-teal-200 border-teal-500/30 backdrop-blur-sm">
                Adventure • {trip.location}
              </Badge>
              <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight leading-tight">
                {trip.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium opacity-90">
                <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-full">
                  <MapPin className="w-4 h-4 text-teal-400" /> {trip.place}
                </span>
                <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-full">
                  <Star className="w-4 h-4 text-orange-400 fill-orange-400" /> 4.9 (120 Reviews)
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Details */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Bento Box: Overview */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-teal-50 rounded-2xl">
                  <Info className="w-6 h-6 text-teal-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Experience Highlights</h2>
              </div>
              <p className="text-slate-600 leading-relaxed text-lg whitespace-pre-line">
                {trip.description}
              </p>
            </div>

            {/* Bento Box: Activities */}
            {trip.activities?.length > 0 && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <h3 className="text-xl font-bold text-slate-800 mb-6">What's Included</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {trip.activities.map((act: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-teal-200 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                          <Zap className="w-5 h-5 text-orange-500" />
                        </div>
                        <span className="font-bold text-slate-700">{act.name}</span>
                      </div>
                      <Badge variant="outline" className="border-teal-200 text-teal-700">
                        {act.price === 0 ? "Free" : `+KSh ${act.price}`}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile Booking Card Visibility */}
            <div className="lg:hidden">
              <BookingCard />
            </div>

            {/* Reviews */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <ReviewSection itemId={trip.id} itemType="trip" />
            </div>
          </div>

          {/* Right Column: Desktop Booking Card */}
          <div className="hidden lg:block">
            <BookingCard />
            
            {/* Quick Actions Card */}
            <div className="mt-6 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
               <h4 className="text-sm font-bold text-slate-800 mb-4 px-2">Quick Actions</h4>
               <div className="grid grid-cols-2 gap-3">
                  <UtilityButton icon={<Share2 />} label="Share" onClick={() => {}} />
                  <UtilityButton icon={<Copy />} label="Copy Link" onClick={() => {}} />
                  <UtilityButton icon={<Phone />} label="Contact" onClick={() => {}} />
                  <UtilityButton icon={<MapPin />} label="Directions" onClick={() => {}} />
               </div>
            </div>
          </div>

        </div>

        {/* Similar Trips */}
        <section className="mt-20">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">More Adventures</h2>
              <p className="text-slate-500">Hand-picked experiences similar to this one</p>
            </div>
            <Button variant="link" className="text-teal-600 font-bold">View All</Button>
          </div>
          <SimilarItems currentItemId={trip.id} itemType="trip" country={trip.country} />
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
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default TripDetail;