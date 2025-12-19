import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Phone, Share2, Mail, Clock, ArrowLeft, 
  Heart, Copy, Star, CheckCircle2, BedDouble, Zap, Calendar, Circle, ShieldCheck
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
import { useGeolocation, calculateDistance } from "@/hooks/useGeolocation";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
  RED: "#FF0000",
  ORANGE: "#FF9800",
  SOFT_GRAY: "#F8F9FA"
};

const HotelDetail = () => {
  const { slug } = useParams();
  const id = slug ? extractIdFromSlug(slug) : null;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { position, requestLocation } = useGeolocation();
  
  const [hotel, setHotel] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isOpenNow, setIsOpenNow] = useState(false);
  const [liveRating, setLiveRating] = useState({ avg: 0, count: 0 });
  const { savedItems, handleSave: handleSaveItem } = useSavedItems();
  const isSaved = savedItems.has(id || "");

  const distance = position && hotel?.latitude && hotel?.longitude
    ? calculateDistance(position.latitude, position.longitude, hotel.latitude, hotel.longitude)
    : null;

  useEffect(() => {
    if (id) {
        fetchHotel();
        fetchLiveRating();
    }
    requestLocation();
  }, [id]);

  useEffect(() => {
    if (!hotel) return;
    const checkOpenStatus = () => {
      const now = new Date();
      const currentDay = now.toLocaleString('en-us', { weekday: 'long' });
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
      const closeTime = parseTime(hotel.closing_hours || "06:00 PM");
      const days = Array.isArray(hotel.days_opened) ? hotel.days_opened : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
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

  const getDisplayPrice = () => {
    if (!hotel) return { price: 0, label: "Starting Price" };
    const allItems = [...(hotel.facilities || []), ...(hotel.activities || [])];
    const entranceFee = allItems.find(item => item.name?.toLowerCase().includes("entrance fee"));
    if (entranceFee) return { price: entranceFee.price, label: "Entrance Fee" };
    const prices = allItems.map(i => i.price).filter(p => p != null);
    return { price: prices.length > 0 ? Math.min(...prices) : 0, label: "Starting Price" };
  };

  const { submitBooking } = useBookingSubmit();

  const handleBookingSubmit = async (data: BookingFormData) => {
    if (!hotel) return;
    setIsProcessing(true);
    try {
      await submitBooking({
        itemId: hotel.id, itemName: hotel.name, bookingType: 'hotel', totalAmount: 0, 
        slotsBooked: data.num_adults + data.num_children, visitDate: data.visit_date,
        guestName: data.guest_name, guestEmail: data.guest_email, guestPhone: data.guest_phone,
        hostId: hotel.created_by, bookingDetails: { ...data, hotel_name: hotel.name }
      });
      setIsCompleted(true);
      toast({ title: "Booking Successful!" });
    } catch (error: any) {
      toast({ title: "Booking Failed", variant: "destructive" });
    } finally { setIsProcessing(false); }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 animate-pulse" />;
  if (!hotel) return null;

  const allImages = [hotel.image_url, ...(hotel.gallery_images || [])].filter(Boolean);
  const { price: displayPrice, label: priceLabel } = getDisplayPrice();

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header className="hidden md:block" />

      {/* Hero Section */}
      <div className="relative w-full h-[50vh] md:h-[65vh] overflow-hidden">
        <div className="absolute top-4 left-4 right-4 z-50 flex justify-between">
          <Button onClick={() => navigate(-1)} className="rounded-full bg-black/30 backdrop-blur-md text-white w-10 h-10 p-0 border-none"><ArrowLeft className="h-5 w-5" /></Button>
          <Button onClick={() => id && handleSaveItem(id, "hotel")} className={`rounded-full backdrop-blur-md w-10 h-10 p-0 border-none ${isSaved ? "bg-red-500" : "bg-black/30"}`}><Heart className={`h-5 w-5 text-white ${isSaved ? "fill-white" : ""}`} /></Button>
        </div>

        <Carousel plugins={[Autoplay({ delay: 4000 })]} className="w-full h-full">
          <CarouselContent className="h-full">
            {allImages.map((img, idx) => (
              <CarouselItem key={idx} className="h-full">
                <img src={img} alt={hotel.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="absolute bottom-10 left-0 w-full p-8 pointer-events-none">
          <div className="space-y-3 pointer-events-auto">
            <div className="flex flex-wrap gap-2">
               <Badge className="bg-amber-400 text-black border-none px-3 py-1 text-[9px] font-black uppercase rounded-full flex items-center gap-1 shadow-lg"><Star className="h-3 w-3 fill-current" />{liveRating.avg > 0 ? liveRating.avg : "New"}</Badge>
               <Badge className={`${isOpenNow ? "bg-emerald-500" : "bg-red-500"} text-white border-none px-3 py-1 text-[9px] font-black uppercase rounded-full flex items-center gap-1.5`}><Circle className={`h-2 w-2 fill-current ${isOpenNow ? "animate-pulse" : ""}`} />{isOpenNow ? "open now" : "closed"}</Badge>
               {distance && <Badge className="bg-[#008080] text-white border-none px-3 py-1 text-[9px] font-black uppercase rounded-full">{distance.toFixed(1)} km away</Badge>}
            </div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white drop-shadow-2xl">{hotel.name}</h1>
          </div>
        </div>
      </div>

      <main className="container px-4 max-w-6xl mx-auto -mt-10 relative z-50">
        <div className="flex flex-col lg:grid lg:grid-cols-[1.7fr,1fr] gap-6">
          
          <div className="space-y-6">
            {/* Description */}
            <section className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <h2 className="text-xl font-black uppercase tracking-tight mb-4 text-[#008080]">Description</h2>
              <p className="text-slate-500 text-sm leading-relaxed">{hotel.description}</p>
            </section>

            {/* Facilities - FULL LIST */}
            {hotel.facilities?.length > 0 && (
              <section className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6"><BedDouble className="h-5 w-5 text-[#008080]" /><h2 className="text-xl font-black uppercase tracking-tight text-[#008080]">Facilities</h2></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {hotel.facilities.map((f: any, i: number) => (
                    <div key={i} className="p-4 rounded-[22px] bg-slate-50 border border-slate-100 flex justify-between items-center"><span className="text-sm font-black uppercase text-slate-700">{f.name}</span><Badge className="bg-white text-[#008080] text-[10px] font-black shadow-sm">KSH {f.price}</Badge></div>
                  ))}
                </div>
              </section>
            )}

            {/* Activities - FULL LIST */}
            {hotel.activities?.length > 0 && (
              <section className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6"><Zap className="h-5 w-5 text-[#FF9800]" /><h2 className="text-xl font-black uppercase tracking-tight text-[#FF9800]">Activities</h2></div>
                <div className="flex flex-wrap gap-3">
                  {hotel.activities.map((act: any, i: number) => (
                    <div key={i} className="px-5 py-3 rounded-2xl bg-orange-50/50 border border-orange-100 flex items-center gap-3"><span className="text-[11px] font-black text-slate-700 uppercase">{act.name}</span><span className="text-[10px] font-bold text-[#FF9800]">KSh {act.price}</span></div>
                  ))}
                </div>
              </section>
            )}

            {/* Amenities - FULL LIST */}
            {hotel.amenities && (
              <section className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6"><ShieldCheck className="h-5 w-5 text-red-600" /><h2 className="text-xl font-black uppercase tracking-tight text-red-600">Amenities</h2></div>
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(hotel.amenities) ? hotel.amenities : hotel.amenities.split(',')).map((item: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 bg-red-50/50 px-4 py-2.5 rounded-2xl border border-red-100"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /><span className="text-[11px] font-black text-red-700 uppercase">{item.trim()}</span></div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* SIDEBAR CARD */}
          <div className="lg:sticky lg:top-24">
            <div className="bg-white rounded-[32px] p-8 shadow-2xl border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{priceLabel}</p><span className="text-4xl font-black text-red-600">KSh {displayPrice}</span></div>
                <div className="text-right"><div className="flex items-center gap-1 justify-end text-amber-500 font-black text-lg"><Star className="h-4 w-4 fill-current" />{liveRating.avg}</div><p className="text-[8px] font-black text-slate-400 uppercase">{liveRating.count} reviews</p></div>
              </div>

              {/* OPERATING INFO */}
              <div className="space-y-3 mb-6 bg-slate-50 p-5 rounded-2xl border border-dashed border-slate-200">
                <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-slate-400"><Clock className="h-4 w-4 text-[#008080]" /><span className="text-[10px] font-black uppercase tracking-tight">hours</span></div><span className={`text-[10px] font-black uppercase ${isOpenNow ? "text-emerald-600" : "text-red-500"}`}>{hotel.opening_hours || "08:00 AM"} - {hotel.closing_hours || "06:00 PM"}</span></div>
                <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400"><Calendar className="h-4 w-4 text-[#008080]" /><span className="text-[10px] font-black uppercase tracking-tight">working days</span></div>
                  <p className="text-[9px] font-normal leading-tight text-slate-500 lowercase italic">{Array.isArray(hotel.days_opened) ? hotel.days_opened.join(", ") : "mon to sun"}</p>
                </div>
              </div>

              <Button 
                onClick={() => setBookingOpen(true)}
                className="w-full py-8 rounded-2xl text-md font-black uppercase tracking-[0.2em] text-white shadow-xl border-none mb-6 transition-all hover:scale-[1.02] active:scale-95"
                style={{ background: `linear-gradient(135deg, ${COLORS.CORAL_LIGHT} 0%, ${COLORS.CORAL} 100%)` }}
              >
                Reserve Now
              </Button>

              <div className="grid grid-cols-3 gap-3 mb-8">
                <UtilityButton icon={<MapPin className="h-5 w-5" />} label="Map" onClick={() => window.open(hotel.map_link)} />
                <UtilityButton icon={<Copy className="h-5 w-5" />} label="Copy" onClick={() => { navigator.clipboard.writeText(window.location.href); toast({title: "Link Copied!"})}} />
                <UtilityButton icon={<Share2 className="h-5 w-5" />} label="Share" onClick={() => { if(navigator.share) navigator.share({title: hotel.name, url: window.location.href}) }} />
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Direct Contact</h3>
                {hotel.email && <a href={`mailto:${hotel.email}`} className="flex items-center gap-3 text-slate-600 lowercase group"><div className="p-2 rounded-lg bg-slate-50 group-hover:bg-teal-50"><Mail className="h-4 w-4 text-[#008080]" /></div><span className="text-xs font-bold truncate">{hotel.email}</span></a>}
                {hotel.phone_numbers?.map((p: string, i: number) => <a key={i} href={`tel:${p}`} className="flex items-center gap-3 text-slate-600 group"><div className="p-2 rounded-lg bg-slate-50 group-hover:bg-teal-50"><Phone className="h-4 w-4 text-[#008080]" /></div><span className="text-xs font-bold">{p}</span></a>)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
           <ReviewSection itemId={hotel.id} itemType="hotel" />
        </div>
      </main>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-[40px] border-none shadow-2xl">
          <MultiStepBooking 
            onSubmit={handleBookingSubmit} 
            facilities={hotel.facilities || []} 
            activities={hotel.activities || []} 
            priceAdult={hotel.entry_fee || 0} 
            priceChild={hotel.entry_fee || 0} 
            isProcessing={isProcessing} 
            isCompleted={isCompleted} 
            itemName={hotel.name}
            itemId={hotel.id}
            bookingType="hotel"
            hostId={hotel.created_by || ""}
            onPaymentSuccess={() => setIsCompleted(true)}
          />
        </DialogContent>
      </Dialog>

      <MobileBottomBar />
    </div>
  );
};

const UtilityButton = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <Button variant="ghost" onClick={onClick} className="flex-col h-auto py-3 bg-[#F8F9FA] text-slate-500 rounded-2xl border border-slate-100 flex-1 hover:bg-slate-100"><div className="mb-1">{icon}</div><span className="text-[10px] font-black uppercase tracking-tighter">{label}</span></Button>
);

export default HotelDetail;