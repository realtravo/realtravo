import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Clock, ArrowLeft, 
  Heart, Star, Circle, ShieldCheck, Tent, Zap, Calendar, Loader2, Share2, Copy, Navigation
} from "lucide-react";
import { SimilarItems } from "@/components/SimilarItems";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { ReviewSection } from "@/components/ReviewSection";
import { useSavedItems } from "@/hooks/useSavedItems";
import { MultiStepBooking, BookingFormData } from "@/components/booking/MultiStepBooking";
import { useBookingSubmit } from "@/hooks/useBookingSubmit";
import { extractIdFromSlug } from "@/lib/slugUtils";
import { useGeolocation } from "@/hooks/useGeolocation";
import { trackReferralClick, generateReferralLink } from "@/lib/referralUtils";

const HotelDetail = () => {
  const { slug } = useParams();
  const id = slug ? extractIdFromSlug(slug) : null;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { requestLocation } = useGeolocation();
  
  const [hotel, setHotel] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isOpenNow, setIsOpenNow] = useState(false);
  const [liveRating, setLiveRating] = useState({ avg: 0, count: 0 });

  const { savedItems, handleSave: handleSaveItem } = useSavedItems();
  const isSaved = savedItems.has(id || "");

  const getStartingPrice = () => {
    if (!hotel) return 0;
    const prices: number[] = [];
    if (hotel.price_per_night) prices.push(Number(hotel.price_per_night));
    
    const extractPrices = (arr: any[]) => {
      if (!Array.isArray(arr)) return;
      arr.forEach((item) => {
        const p = typeof item === 'object' ? item.price : null;
        if (p) prices.push(Number(p));
      });
    };

    extractPrices(hotel.facilities);
    extractPrices(hotel.activities);
    return prices.length > 0 ? Math.min(...prices) : 0;
  };

  const startingPrice = getStartingPrice();

  useEffect(() => {
    if (id) {
      fetchHotel();
      fetchLiveRating();
    }
    const urlParams = new URLSearchParams(window.location.search);
    const refSlug = urlParams.get("ref");
    if (refSlug && id) trackReferralClick(refSlug, id, "hotel", "booking");
    requestLocation();
    window.scrollTo(0, 0);
  }, [id, slug]);

  useEffect(() => {
    if (!hotel) return;
    const checkOpenStatus = () => {
      const now = new Date();
      const currentDay = now.toLocaleString('en-us', { weekday: 'long' }).toLowerCase();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const parseTime = (timeStr: string) => {
        if (!timeStr) return 0;
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      };

      const openTime = parseTime(hotel.opening_hours || "08:00 AM");
      const closeTime = parseTime(hotel.closing_hours || "11:00 PM");
      const days = Array.isArray(hotel.days_opened) 
        ? hotel.days_opened.map((d: string) => d.toLowerCase()) 
        : ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      
      setIsOpenNow(days.includes(currentDay) && currentTime >= openTime && currentTime <= closeTime);
    };
    checkOpenStatus();
    const interval = setInterval(checkOpenStatus, 60000);
    return () => clearInterval(interval);
  }, [hotel]);

  const fetchHotel = async () => {
    if (!id) return;
    try {
      let { data, error } = await supabase.from("hotels").select("*").eq("id", id).single();
      if (error) throw error;
      setHotel(data);
    } catch (error) {
      toast({ title: "Hotel not found", variant: "destructive" });
      navigate('/');
    } finally { setLoading(false); }
  };

  const fetchLiveRating = async () => {
    if (!id) return;
    const { data } = await supabase.from("reviews").select("rating").eq("item_id", id).eq("item_type", "hotel");
    if (data && data.length > 0) {
      const avg = data.reduce((acc, curr) => acc + curr.rating, 0) / data.length;
      setLiveRating({ avg: parseFloat(avg.toFixed(1)), count: data.length });
    }
  };

  const { submitBooking } = useBookingSubmit();

  const handleBookingSubmit = async (data: BookingFormData) => {
    if (!hotel) return;
    setIsProcessing(true);
    try {
      await submitBooking({
        itemId: hotel.id, itemName: hotel.name, bookingType: 'hotel', totalAmount: startingPrice, 
        slotsBooked: data.num_adults + data.num_children, visitDate: data.visit_date,
        guestName: data.guest_name, guestEmail: data.guest_email, guestPhone: data.guest_phone,
        hostId: hotel.created_by, bookingDetails: { ...data, hotel_name: hotel.name }
      });
      setIsCompleted(true);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setIsProcessing(false); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-teal-600 mb-4" />
        <p className="text-sm font-black uppercase tracking-tighter animate-pulse">Loading Details...</p>
      </div>
    );
  }

  if (!hotel) return null;

  const allImages = [hotel.image_url, ...(hotel.gallery_images || [])].filter(Boolean);

  const OperatingHoursInfo = () => (
    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400">
          <Clock className="h-4 w-4 text-teal-600" />
          <span className="text-[10px] font-black uppercase tracking-tight">Working Hours</span>
        </div>
        <span className={`text-[10px] font-black uppercase ${isOpenNow ? "text-emerald-600" : "text-red-500"}`}>
          {hotel.opening_hours || "08:00 AM"} - {hotel.closing_hours || "11:00 PM"}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-2 text-slate-400">
          <Calendar className="h-4 w-4 text-teal-600" />
          <span className="text-[10px] font-black uppercase tracking-tight">Working Days</span>
        </div>
        <p className="text-[10px] font-normal leading-tight text-slate-500 lowercase italic">
          {Array.isArray(hotel.days_opened) ? hotel.days_opened.join(", ") : "monday, tuesday, wednesday, thursday, friday, saturday, sunday"}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 pt-6">
      <main className="container px-4 max-w-6xl mx-auto">
        
        {/* IMAGE GALLERY - Restored to Content Width Alignment */}
        <div className="relative w-full h-[45vh] md:h-[60vh] bg-slate-900 overflow-hidden rounded-[32px] shadow-xl mb-8">
          <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-center">
            <Button 
              onClick={() => navigate(-1)} 
              className="rounded-full w-10 h-10 p-0 border-none bg-black/30 text-white backdrop-blur-md hover:bg-black/50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button 
              onClick={() => id && handleSaveItem(id, "hotel")} 
              className={`rounded-full w-10 h-10 p-0 border-none shadow-lg backdrop-blur-md ${
                isSaved ? "bg-red-500" : "bg-black/30 text-white hover:bg-black/50"
              }`}
            >
              <Heart className={`h-5 w-5 ${isSaved ? "fill-white text-white" : "text-white"}`} />
            </Button>
          </div>

          <Carousel plugins={[Autoplay({ delay: 3500 })]} className="w-full h-full">
            <CarouselContent className="h-full ml-0">
              {allImages.map((img, idx) => (
                <CarouselItem key={idx} className="h-full pl-0 basis-full">
                  <img src={img} alt={hotel.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          <div className="absolute bottom-6 left-6 z-40 max-w-[80%]">
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge className="bg-amber-400 text-black border-none px-2 py-0.5 text-[9px] font-black uppercase rounded-full flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" />
                {liveRating.avg > 0 ? liveRating.avg : "New"}
              </Badge>
              <Badge className={`${isOpenNow ? "bg-emerald-500" : "bg-red-500"} text-white border-none px-2 py-0.5 text-[9px] font-black uppercase rounded-full`}>
                {isOpenNow ? "open" : "closed"}
              </Badge>
            </div>
            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-white leading-tight">{hotel.name}</h1>
            <div className="flex items-center gap-1 text-white/90 mt-1">
              <MapPin className="h-3 w-3" />
              <span className="text-[10px] font-bold uppercase tracking-wide">
                {[hotel.place, hotel.location].filter(Boolean).join(', ')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-[1.7fr,1fr] gap-6">
          <div className="flex flex-col gap-6">
            <section className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <h2 className="text-[11px] font-black uppercase tracking-widest mb-4 text-[#008080]">Description</h2>
              <p className="text-slate-500 text-sm leading-relaxed lowercase">{hotel.description}</p>
            </section>

            {/* Mobile Price Card */}
            <div className="lg:hidden">
              <PriceCard hotel={hotel} startingPrice={startingPrice} liveRating={liveRating} navigate={navigate} />
            </div>

            {/* Amenities */}
            <section className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="h-5 w-5 text-red-600" />
                <h2 className="text-sm font-black uppercase tracking-tight text-red-600">Amenities</h2>
              </div>
              {hotel.amenities?.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {hotel.amenities.map((item: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 bg-red-50/50 px-4 py-3 rounded-2xl border border-red-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span className="text-[10px] font-black lowercase text-red-700">{item}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-slate-400 text-xs italic">none</p>}
            </section>

            {/* Facilities */}
            <section className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <Tent className="h-5 w-5 text-[#008080]" />
                <h2 className="text-sm font-black uppercase tracking-tight text-[#008080]">Facilities</h2>
              </div>
              {hotel.facilities?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {hotel.facilities.map((f: any, i: number) => (
                    <div key={i} className="p-4 rounded-[22px] bg-slate-50 border border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-black lowercase text-slate-700">{f.name || f}</span>
                      {f.price && <Badge className="bg-white text-[#008080] text-[10px] font-black border border-slate-100">KSH {f.price}</Badge>}
                    </div>
                  ))}
                </div>
              ) : <p className="text-slate-400 text-xs italic">none</p>}
            </section>

            {/* Activities */}
            <section className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <Zap className="h-5 w-5 text-[#FF9800]" />
                <h2 className="text-sm font-black uppercase tracking-tight text-[#FF9800]">Activities</h2>
              </div>
              {hotel.activities?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {hotel.activities.map((act: any, i: number) => (
                    <div key={i} className="px-4 py-2 rounded-xl bg-orange-50/50 border border-orange-100 flex items-center gap-2">
                      <span className="text-[10px] font-black lowercase text-slate-700">{act.name || act}</span>
                      {act.price && <span className="text-[10px] font-bold text-[#FF9800]">KSh {act.price}</span>}
                    </div>
                  ))}
                </div>
              ) : <p className="text-slate-400 text-xs italic">none</p>}
            </section>
          </div>

          {/* Desktop Sticky Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-6">
              <PriceCard hotel={hotel} startingPrice={startingPrice} liveRating={liveRating} navigate={navigate} setBookingOpen={setBookingOpen} />
            </div>
          </aside>
        </div>

        <div className="mt-12 bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
          <ReviewSection itemId={hotel.id} itemType="hotel" />
        </div>
        
        <div className="mt-16">
          <h2 className="text-xl font-black uppercase tracking-tighter mb-8">Explore Similar Stays</h2>
          <SimilarItems currentItemId={hotel.id} itemType="hotel" country={hotel.country} />
        </div>
      </main>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[95vh] p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
          <MultiStepBooking 
            onSubmit={handleBookingSubmit} itemName={hotel.name} itemId={hotel.id} bookingType="hotel"
            priceAdult={startingPrice} isProcessing={isProcessing} isCompleted={isCompleted} 
            hostId={hotel.created_by} facilities={hotel.facilities || []} activities={hotel.activities || []}
            onPaymentSuccess={() => setIsCompleted(true)} primaryColor="#008080" accentColor="#FF7F50"
          />
        </DialogContent>
      </Dialog>
      <MobileBottomBar />
    </div>
  );
};

// Reusable Price Card Component
const PriceCard = ({ hotel, startingPrice, liveRating, navigate, setBookingOpen }: any) => {
  const { toast } = useToast();
  return (
    <div className="bg-white rounded-[32px] p-8 shadow-2xl border border-slate-100">
      <div className="flex justify-between items-end mb-8">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Starting Price</p>
          <span className="text-4xl font-black text-red-600">KSh {startingPrice.toLocaleString()}</span>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end text-amber-500 font-black text-lg">
            <Star className="h-4 w-4 fill-current" />
            {liveRating.avg || "0"}
          </div>
          <p className="text-[8px] font-black text-slate-400 uppercase">{liveRating.count} reviews</p>
        </div>
      </div>

      <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-slate-400">Hours</span>
          <span className="text-[10px] font-black uppercase">{hotel.opening_hours || "08:00 AM"} - {hotel.closing_hours || "11:00 PM"}</span>
        </div>
        <div className="pt-2 border-t border-slate-100">
          <p className="text-[9px] font-medium text-slate-500 lowercase italic">
            {Array.isArray(hotel.days_opened) ? hotel.days_opened.join(", ") : "mon - sun"}
          </p>
        </div>
      </div>

      <Button 
        onClick={() => setBookingOpen ? setBookingOpen(true) : navigate(`/booking/hotel/${hotel.id}`)} 
        className="w-full py-8 rounded-2xl text-md font-black uppercase tracking-widest text-white shadow-xl border-none mb-6 transition-all active:scale-95" 
        style={{ background: `linear-gradient(135deg, #FF9E7A 0%, #FF7F50 100%)` }}
      >
        Reserve Now
      </Button>

      <div className="grid grid-cols-3 gap-3">
        <UtilityButton icon={<Navigation className="h-4 w-4" />} label="Map" onClick={() => window.open(`http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(`${hotel.name}, ${hotel.location}`)}`, "_blank")} />
        <UtilityButton icon={<Copy className="h-4 w-4" />} label="Copy" onClick={async () => {
          const link = await generateReferralLink(hotel.id, "hotel", hotel.id);
          await navigator.clipboard.writeText(link);
          toast({ title: "Link Copied!" });
        }} />
        <UtilityButton icon={<Share2 className="h-4 w-4" />} label="Share" onClick={() => navigator.share && navigator.share({ title: hotel.name, url: window.location.href })} />
      </div>
    </div>
  );
};

const UtilityButton = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <Button variant="ghost" onClick={onClick} className="flex-col h-auto py-3 bg-[#F8F9FA] text-slate-500 rounded-2xl border border-slate-100 flex-1 hover:bg-slate-200">
    <div className="mb-1">{icon}</div>
    <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
  </Button>
);

export default HotelDetail;