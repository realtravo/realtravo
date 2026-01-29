import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Share2, ArrowLeft, Heart, Copy, Phone, Mail
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { ReviewSection } from "@/components/ReviewSection";
import { useSavedItems } from "@/hooks/useSavedItems";
import { extractIdFromSlug } from "@/lib/slugUtils";
import { useRealtimeItemAvailability } from "@/hooks/useRealtimeBookings";
import { trackReferralClick } from "@/lib/referralUtils";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
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
  }, [id]);

  const fetchTrip = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase.from("trips").select("*").eq("id", id).single();
      if (error) throw error;
      setTrip(data);
    } catch (error) {
      toast({ title: "Trip not found", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const { remainingSlots, isSoldOut } = useRealtimeItemAvailability(id || undefined, trip?.available_tickets || 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!trip) return <div className="min-h-screen flex items-center justify-center">Trip not found</div>;

  const allImages = [trip.image_url, ...(trip.gallery_images || [])].filter(Boolean);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isExpired = !trip.is_custom_date && trip.date && new Date(trip.date) < today;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header showSearchIcon={false} />
      
      {/* Scroll Navigation */}
      <div className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 px-4 py-3 flex justify-between items-center bg-white shadow-sm border-b ${scrolled ? "translate-y-0" : "-translate-y-full"}`}>
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate(-1)} variant="ghost" className="rounded-full p-2"><ArrowLeft /></Button>
          <h2 className="text-sm font-black uppercase truncate max-w-[200px]">{trip.name}</h2>
        </div>
      </div>

      <main className="container px-4 max-w-6xl mx-auto pt-6">
        {/* Images */}
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
          </div>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-[1.7fr,1fr] gap-6">
          <div className="flex flex-col gap-6">
            {/* Overview Only */}
            <section className="bg-white rounded-[28px] p-7 shadow-sm border">
              <h2 className="text-xl font-black uppercase text-[#008080] mb-4">Overview</h2>
              <p className="text-slate-500 text-sm leading-relaxed">{trip.description || "No description provided."}</p>
            </section>

            <div className="lg:hidden">
              <BookingCard trip={trip} remainingSlots={remainingSlots} isSoldOut={isSoldOut} isExpired={isExpired} navigate={navigate} />
            </div>

            {/* Reviews */}
            <div className="bg-white rounded-[28px] p-7 shadow-sm border">
              <ReviewSection itemId={trip.id} itemType="trip" />
            </div>
          </div>

          {/* Pricing Card Sidebar */}
          <div className="hidden lg:block lg:sticky lg:top-24 h-fit">
            <BookingCard trip={trip} remainingSlots={remainingSlots} isSoldOut={isSoldOut} isExpired={isExpired} navigate={navigate} />
          </div>
        </div>
      </main>
      <MobileBottomBar />
    </div>
  );
};

const BookingCard = ({ trip, remainingSlots, isSoldOut, isExpired, navigate }: any) => (
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

    {/* Contact Information from Database */}
    <div className="space-y-4 mb-6">
      <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <Phone className="h-5 w-5 text-[#008080]" />
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase">Phone Number</p>
          <p className="text-xs font-bold text-slate-700">{trip.phone || "Not Provided"}</p>
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
      <UtilityBtn icon={<MapPin className="h-5 w-5" />} label="Map" />
      <UtilityBtn icon={<Copy className="h-5 w-5" />} label="Copy" />
      <UtilityBtn icon={<Share2 className="h-5 w-5" />} label="Share" />
    </div>
  </div>
);

const UtilityBtn = ({ icon, label }: any) => (
  <Button variant="ghost" className="flex-col h-auto py-3 bg-[#F8F9FA] text-slate-500 rounded-2xl border border-slate-100 flex-1 hover:bg-slate-100">
    <div className="mb-1">{icon}</div>
    <span className="text-[10px] font-black uppercase">{label}</span>
  </Button>
);

export default TripDetail;